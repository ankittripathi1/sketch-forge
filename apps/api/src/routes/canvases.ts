import { Hono } from "hono";
import { authMiddleware, AuthVariables } from "../middleware/auth.js";
import { db, canvases } from "@repo/db";
import { and, desc, eq } from "drizzle-orm";
import { CreateCanvasSchema, UpdateCanvasSchema } from "@repo/schema";

const canvasesRouter = new Hono<{ Variables: AuthVariables }>();

canvasesRouter.use("*", authMiddleware);

// GET /canvases - list all canvases for the authenticated user
canvasesRouter.get("/", async (c) => {
  const userId = c.get("userId");

  const results = await db
    .select({
      id: canvases.id,
      title: canvases.title,
      thumbnail: canvases.thumbnail,
      updatedAt: canvases.updatedAt,
    })
    .from(canvases)
    .where(eq(canvases.userId, userId))
    .orderBy(desc(canvases.updatedAt));

  return c.json(results);
});

// GET /canvases/:id - get a single canvas (verify ownership)
canvasesRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const canvasId = c.req.param("id");

  const canvas = await db.query.canvases.findFirst({
    where: and(eq(canvases.id, canvasId), eq(canvases.userId, userId)),
  });

  if (!canvas) {
    return c.json({ error: "Canvas not found" }, 404);
  }

  return c.json(canvas);
});

// POST /canvases - create a new canvas
canvasesRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = CreateCanvasSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  const [newCanvas] = await db
    .insert(canvases)
    .values({
      userId,
      title: parsed.data.title || "Untitled",
      elements: parsed.data.elements || [],
    })
    .returning();

  return c.json(newCanvas, 201);
});

// PATCH /canvases/:id - update canvas
canvasesRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const canvasId = c.req.param("id");
  const body = await c.req.json();

  const parsed = UpdateCanvasSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  const [updatedCanvas] = await db
    .update(canvases)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning();

  if (!updatedCanvas) {
    return c.json({ error: "Canvas not found or unauthorized" }, 404);
  }

  return c.json(updatedCanvas);
});

// DELETE /canvases/:id - delete canvas
canvasesRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const canvasId = c.req.param("id");

  const [deletedCanvas] = await db
    .delete(canvases)
    .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)))
    .returning();

  if (!deletedCanvas) {
    return c.json({ error: "Canvas not found or unauthorized" }, 404);
  }

  return c.json({ message: "Canvas deleted successfully" });
});

export default canvasesRouter;
