import { Hono } from "hono";
import { authMiddleware, AuthVariables } from "../middleware/auth.js";
import { db, folders, pages } from "@repo/db";
import { and, eq, asc } from "drizzle-orm";
import { CreateFolderSchema, UpdateFolderSchema } from "@repo/schema";
import { createsFolderCycle, ownsFolder } from "../lib/ownership.js";

const foldersRouter = new Hono<{ Variables: AuthVariables }>();

foldersRouter.use("*", authMiddleware);

// GET /folders - list all folders for the authenticated user
foldersRouter.get("/", async (c) => {
  const userId = c.get("userId");

  const results = await db.query.folders.findMany({
    where: eq(folders.userId, userId),
    orderBy: [asc(folders.sortOrder)],
  });

  return c.json(results);
});

// GET /folders/:id - get a single folder
foldersRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const folderId = c.req.param("id");

  // The relations are filtered by userId as well as by the join key: any
  // cross-tenant row left over from before ownership was enforced stays hidden.
  const folder = await db.query.folders.findFirst({
    where: and(eq(folders.id, folderId), eq(folders.userId, userId)),
    with: {
      pages: { where: eq(pages.userId, userId) },
      children: { where: eq(folders.userId, userId) },
    },
  });

  if (!folder) {
    return c.json({ error: "Folder not found" }, 404);
  }

  return c.json(folder);
});

// POST /folders - create a new folder
foldersRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = CreateFolderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  const parentId = parsed.data.parentId;

  // The parent ownership check and the insert share one transaction so a folder
  // cannot change hands between the two. A brand new folder has no descendants,
  // so no cycle is possible here.
  const result = await db.transaction(async (tx) => {
    if (parentId && !(await ownsFolder(tx, parentId, userId))) {
      return { ok: false } as const;
    }

    const [newFolder] = await tx
      .insert(folders)
      .values({
        ...parsed.data,
        userId,
      })
      .returning();

    return { ok: true, folder: newFolder } as const;
  });

  if (!result.ok) {
    // Deliberately the same response as a parent that does not exist.
    return c.json({ error: "Parent folder not found" }, 404);
  }

  return c.json(result.folder, 201);
});

// PATCH /folders/:id - update folder
foldersRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const folderId = c.req.param("id");
  const body = await c.req.json();

  const parsed = UpdateFolderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  const parentId = parsed.data.parentId;

  // Folder ownership, parent ownership, the cycle check, and the update all run
  // in one transaction so the tree cannot be reshaped mid-request.
  const result = await db.transaction(async (tx) => {
    if (!(await ownsFolder(tx, folderId, userId))) {
      return { ok: false, reason: "folder" } as const;
    }

    // A null parentId moves the folder back to the root and needs no check.
    if (parentId) {
      if (!(await ownsFolder(tx, parentId, userId))) {
        return { ok: false, reason: "parent" } as const;
      }
      if (await createsFolderCycle(tx, folderId, parentId, userId)) {
        return { ok: false, reason: "cycle" } as const;
      }
    }

    const [updatedFolder] = await tx
      .update(folders)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .returning();

    if (!updatedFolder) {
      return { ok: false, reason: "folder" } as const;
    }

    return { ok: true, folder: updatedFolder } as const;
  });

  if (!result.ok) {
    switch (result.reason) {
      case "parent":
        // Deliberately the same response as a parent that does not exist.
        return c.json({ error: "Parent folder not found" }, 404);
      case "cycle":
        return c.json(
          { error: "A folder cannot be moved into itself or a descendant" },
          400,
        );
      default:
        return c.json({ error: "Folder not found or unauthorized" }, 404);
    }
  }

  return c.json(result.folder);
});

// DELETE /folders/:id - delete folder
foldersRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const folderId = c.req.param("id");

  const [deletedFolder] = await db
    .delete(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning();

  if (!deletedFolder) {
    return c.json({ error: "Folder not found or unauthorized" }, 404);
  }

  return c.json({ message: "Folder deleted successfully" });
});

export default foldersRouter;
