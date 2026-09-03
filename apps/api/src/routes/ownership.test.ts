/**
 * Tenant-ownership integration tests. These run against a real, isolated
 * PostgreSQL database (see ../../test/setup.ts) because the guarantees under
 * test are enforced by transactional database reads, not by application state.
 */
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { db, folders, pages, userTable } from "@repo/db";
import { eq, inArray } from "drizzle-orm";
import { createSessionToken } from "../lib/jwt.js";
import { SESSION_COOKIE } from "../lib/cookies.js";
import foldersRouter from "./folders.js";
import pagesRouter from "./pages.js";

const app = new Hono()
  .route("/folders", foldersRouter)
  .route("/pages", pagesRouter);

type Session = { userId: string; cookie: string };

const createdUserIds: string[] = [];

async function createUser(label: string): Promise<Session> {
  const [user] = await db
    .insert(userTable)
    .values({ email: `${label}-${crypto.randomUUID()}@ownership.test` })
    .returning();

  if (!user) {
    throw new Error("Failed to create test user");
  }

  createdUserIds.push(user.id);
  return {
    userId: user.id,
    cookie: `${SESSION_COOKIE}=${await createSessionToken(user.id)}`,
  };
}

/** `Response.json()` is typed `unknown`; test bodies are asserted explicitly. */
async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function request(
  session: Session,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  return app.request(path, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", cookie: session.cookie },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function createFolder(
  session: Session,
  body: Record<string, unknown>,
): Promise<{ id: string; parentId: string | null }> {
  const response = await request(session, "/folders", {
    method: "POST",
    body,
  });
  expect(response.status).toBe(201);
  return readJson(response);
}

async function createPage(
  session: Session,
  body: Record<string, unknown> = {},
): Promise<{ id: string; folderId: string | null }> {
  const response = await request(session, "/pages", { method: "POST", body });
  expect(response.status).toBe(201);
  return readJson(response);
}

let userA: Session;
let userB: Session;

beforeEach(async () => {
  userA = await createUser("owner-a");
  userB = await createUser("owner-b");
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    // Folders, pages, and review logs all cascade from the user row.
    await db.delete(userTable).where(inArray(userTable.id, createdUserIds));
  }
});

describe("page to folder ownership", () => {
  test("rejects creating a page inside another user's folder", async () => {
    const foreignFolder = await createFolder(userB, { name: "B private" });

    const response = await request(userA, "/pages", {
      method: "POST",
      body: { title: "Intruder", folderId: foreignFolder.id },
    });

    expect(response.status).toBe(404);

    const rows = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.folderId, foreignFolder.id));
    expect(rows).toHaveLength(0);
  });

  test("rejects moving a page into another user's folder", async () => {
    const ownFolder = await createFolder(userA, { name: "A home" });
    const foreignFolder = await createFolder(userB, { name: "B private" });
    const page = await createPage(userA, {
      title: "Mine",
      folderId: ownFolder.id,
    });

    const response = await request(userA, `/pages/${page.id}`, {
      method: "PATCH",
      body: { folderId: foreignFolder.id },
    });

    expect(response.status).toBe(404);

    const [stored] = await db
      .select({ folderId: pages.folderId })
      .from(pages)
      .where(eq(pages.id, page.id));
    expect(stored?.folderId).toBe(ownFolder.id);
  });

  test("allows creating and moving a page within the user's own folders", async () => {
    const parent = await createFolder(userA, { name: "Parent" });
    const child = await createFolder(userA, {
      name: "Child",
      parentId: parent.id,
    });

    const page = await createPage(userA, {
      title: "Notes",
      folderId: parent.id,
    });
    expect(page.folderId).toBe(parent.id);

    const moved = await request(userA, `/pages/${page.id}`, {
      method: "PATCH",
      body: { folderId: child.id },
    });
    expect(moved.status).toBe(200);
    expect((await readJson<{ folderId: string | null }>(moved)).folderId).toBe(
      child.id,
    );

    const toRoot = await request(userA, `/pages/${page.id}`, {
      method: "PATCH",
      body: { folderId: null },
    });
    expect(toRoot.status).toBe(200);
    expect(
      (await readJson<{ folderId: string | null }>(toRoot)).folderId,
    ).toBeNull();
  });

  test("rejects patching another user's page", async () => {
    const page = await createPage(userB, { title: "B page" });

    const response = await request(userA, `/pages/${page.id}`, {
      method: "PATCH",
      body: { title: "Taken over" },
    });

    expect(response.status).toBe(404);

    const [stored] = await db
      .select({ title: pages.title })
      .from(pages)
      .where(eq(pages.id, page.id));
    expect(stored?.title).toBe("B page");
  });
});

describe("folder to folder ownership", () => {
  test("rejects creating a folder under another user's folder", async () => {
    const foreignFolder = await createFolder(userB, { name: "B private" });

    const response = await request(userA, "/folders", {
      method: "POST",
      body: { name: "Intruder", parentId: foreignFolder.id },
    });

    expect(response.status).toBe(404);

    const rows = await db
      .select({ id: folders.id })
      .from(folders)
      .where(eq(folders.parentId, foreignFolder.id));
    expect(rows).toHaveLength(0);
  });

  test("rejects moving a folder under another user's folder", async () => {
    const ownFolder = await createFolder(userA, { name: "A home" });
    const foreignFolder = await createFolder(userB, { name: "B private" });

    const response = await request(userA, `/folders/${ownFolder.id}`, {
      method: "PATCH",
      body: { parentId: foreignFolder.id },
    });

    expect(response.status).toBe(404);

    const [stored] = await db
      .select({ parentId: folders.parentId })
      .from(folders)
      .where(eq(folders.id, ownFolder.id));
    expect(stored?.parentId).toBeNull();
  });

  test("allows nesting and re-parenting within the user's own folders", async () => {
    const parent = await createFolder(userA, { name: "Parent" });
    const child = await createFolder(userA, {
      name: "Child",
      parentId: parent.id,
    });
    expect(child.parentId).toBe(parent.id);

    const sibling = await createFolder(userA, { name: "Sibling" });
    const moved = await request(userA, `/folders/${child.id}`, {
      method: "PATCH",
      body: { parentId: sibling.id },
    });
    expect(moved.status).toBe(200);
    expect((await readJson<{ parentId: string | null }>(moved)).parentId).toBe(
      sibling.id,
    );

    const toRoot = await request(userA, `/folders/${child.id}`, {
      method: "PATCH",
      body: { parentId: null },
    });
    expect(toRoot.status).toBe(200);
    expect(
      (await readJson<{ parentId: string | null }>(toRoot)).parentId,
    ).toBeNull();
  });
});

describe("folder cycles", () => {
  test("rejects making a folder its own parent", async () => {
    const folder = await createFolder(userA, { name: "Self" });

    const response = await request(userA, `/folders/${folder.id}`, {
      method: "PATCH",
      body: { parentId: folder.id },
    });

    expect(response.status).toBe(400);

    const [stored] = await db
      .select({ parentId: folders.parentId })
      .from(folders)
      .where(eq(folders.id, folder.id));
    expect(stored?.parentId).toBeNull();
  });

  test("rejects moving a folder under its own descendant", async () => {
    const root = await createFolder(userA, { name: "Root" });
    const child = await createFolder(userA, {
      name: "Child",
      parentId: root.id,
    });
    const grandchild = await createFolder(userA, {
      name: "Grandchild",
      parentId: child.id,
    });

    const response = await request(userA, `/folders/${root.id}`, {
      method: "PATCH",
      body: { parentId: grandchild.id },
    });

    expect(response.status).toBe(400);

    const [stored] = await db
      .select({ parentId: folders.parentId })
      .from(folders)
      .where(eq(folders.id, root.id));
    expect(stored?.parentId).toBeNull();
  });
});

describe("folder detail relations", () => {
  test("never returns another user's page or child folder", async () => {
    const folder = await createFolder(userB, { name: "B home" });

    // Legacy shape: rows that predate ownership enforcement and point across
    // tenants. Written straight to the database because the API now rejects them.
    const [foreignPage] = await db
      .insert(pages)
      .values({
        userId: userA.userId,
        folderId: folder.id,
        title: "A leaked page",
      })
      .returning();
    const [foreignChild] = await db
      .insert(folders)
      .values({
        userId: userA.userId,
        parentId: folder.id,
        name: "A leaked folder",
      })
      .returning();

    const ownPage = await createPage(userB, {
      title: "B page",
      folderId: folder.id,
    });

    const response = await request(userB, `/folders/${folder.id}`);
    expect(response.status).toBe(200);

    const body = await readJson<{
      pages: { id: string }[];
      children: { id: string }[];
    }>(response);

    expect(body.pages.map((p) => p.id)).toEqual([ownPage.id]);
    expect(body.pages.map((p) => p.id)).not.toContain(foreignPage?.id);
    expect(body.children.map((f) => f.id)).not.toContain(foreignChild?.id);
  });

  test("returns 404 for another user's folder", async () => {
    const folder = await createFolder(userB, { name: "B home" });

    const response = await request(userA, `/folders/${folder.id}`);

    expect(response.status).toBe(404);
  });
});

describe("deletion", () => {
  test("rejects deleting another user's folder and leaves its contents intact", async () => {
    const folder = await createFolder(userB, { name: "B home" });
    const page = await createPage(userB, {
      title: "B page",
      folderId: folder.id,
    });

    const response = await request(userA, `/folders/${folder.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);

    const survivingFolders = await db
      .select({ id: folders.id })
      .from(folders)
      .where(eq(folders.id, folder.id));
    expect(survivingFolders).toHaveLength(1);

    const survivingPages = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.id, page.id));
    expect(survivingPages).toHaveLength(1);
  });

  test("deleting an own folder removes only that user's contents", async () => {
    const folderA = await createFolder(userA, { name: "A home" });
    const pageA = await createPage(userA, {
      title: "A page",
      folderId: folderA.id,
    });
    const folderB = await createFolder(userB, { name: "B home" });
    const pageB = await createPage(userB, {
      title: "B page",
      folderId: folderB.id,
    });

    const response = await request(userA, `/folders/${folderA.id}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(200);

    const remainingA = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.id, pageA.id));
    expect(remainingA).toHaveLength(0);

    const remainingB = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.id, pageB.id));
    expect(remainingB).toHaveLength(1);
    expect(
      await db
        .select({ id: folders.id })
        .from(folders)
        .where(eq(folders.id, folderB.id)),
    ).toHaveLength(1);
  });
});
