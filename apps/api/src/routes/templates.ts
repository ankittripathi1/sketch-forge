import { Hono } from "hono";
import { authMiddleware, AuthVariables } from "../middleware/auth.js";
import { db, templates, pages } from "@repo/db";
import { and, eq, or } from "drizzle-orm";
import { CreateTemplateSchema, ApplyTemplateSchema } from "@repo/schema";

const templatesRouter = new Hono<{ Variables: AuthVariables }>();

templatesRouter.use("*", authMiddleware);

// GET /templates - list all templates (system + user's)
templatesRouter.get("/", async (c) => {
  const userId = c.get("userId");

  const results = await db.query.templates.findMany({
    where: or(eq(templates.userId, userId), eq(templates.isSystem, true)),
  });

  return c.json(results);
});

// GET /templates/:id - get a single template
templatesRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const templateId = c.req.param("id");

  const template = await db.query.templates.findFirst({
    where: and(
      eq(templates.id, templateId),
      or(eq(templates.userId, userId), eq(templates.isSystem, true)),
    ),
  });

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json(template);
});

// POST /templates - create a custom template
templatesRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  const [newTemplate] = await db
    .insert(templates)
    .values({
      ...parsed.data,
      userId,
      isSystem: false, // Custom templates are never system templates
    })
    .returning();

  return c.json(newTemplate, 201);
});

// DELETE /templates/:id - delete custom template
templatesRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const templateId = c.req.param("id");

  const [deletedTemplate] = await db
    .delete(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .returning();

  if (!deletedTemplate) {
    return c.json({ error: "Template not found or unauthorized" }, 404);
  }

  return c.json({ message: "Template deleted successfully" });
});

// POST /templates/:id/apply - create a new page from this template
templatesRouter.post("/:id/apply", async (c) => {
  const userId = c.get("userId");
  const templateId = c.req.param("id");
  const body = await c.req.json();

  const parsed = ApplyTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  const template = await db.query.templates.findFirst({
    where: and(
      eq(templates.id, templateId),
      or(eq(templates.userId, userId), eq(templates.isSystem, true)),
    ),
  });

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  const [newPage] = await db
    .insert(pages)
    .values({
      userId,
      folderId: parsed.data.folderId,
      title: parsed.data.title || `New ${template.name}`,
      elements: template.elements,
    })
    .returning();

  return c.json(newPage, 201);
});

export default templatesRouter;
