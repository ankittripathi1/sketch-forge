import { Hono } from "hono";
import { authMiddleware, AuthVariables } from "../middleware/auth.js";
import { db, folders } from "@repo/db";
import { and, eq, asc } from "drizzle-orm";
import { CreateFolderSchema, UpdateFolderSchema } from "@repo/schema";

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

  const folder = await db.query.folders.findFirst({
    where: and(eq(folders.id, folderId), eq(folders.userId, userId)),
    with: {
      pages: true,
      children: true,
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

  const [newFolder] = await db
    .insert(folders)
    .values({
      ...parsed.data,
      userId,
    })
    .returning();

  return c.json(newFolder, 201);
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

  const [updatedFolder] = await db
    .update(folders)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .returning();

  if (!updatedFolder) {
    return c.json({ error: "Folder not found or unauthorized" }, 404);
  }

  return c.json(updatedFolder);
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
