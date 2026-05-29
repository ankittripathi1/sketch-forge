import { Hono } from "hono";
import { authMiddleware, AuthVariables } from "../middleware/auth.js";
import { db, pages, folders, reviewLogs } from "@repo/db";
import { and, eq, asc, lte, or, isNull, sql, like } from "drizzle-orm";
import {
  CreatePageSchema,
  UpdatePageSchema,
  SketchElement,
  extractSearchableText,
} from "@repo/schema";

const pagesRouter = new Hono<{ Variables: AuthVariables }>();

pagesRouter.use("*", authMiddleware);

// GET /pages/search - full-text search across pages
pagesRouter.get("/search", async (c) => {
  const userId = c.get("userId");
  const query = c.req.query("q");
  const folderId = c.req.query("folderId");

  if (!query || query.length < 2) {
    return c.json([]);
  }

  // Alternative with snippets using select syntax
  const rawResults = await db
    .select({
      id: pages.id,
      title: pages.title,
      thumbnail: pages.thumbnail,
      thumbnailLight: pages.thumbnailLight,
      thumbnailDark: pages.thumbnailDark,
      folderId: pages.folderId,
      snippet: sql<string>`ts_headline('english', ${pages.searchableText}, to_tsquery('english', ${query.trim().split(/\s+/).join(" & ")}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15')`,
    })
    .from(pages)
    .where(
      and(
        eq(pages.userId, userId),
        folderId ? eq(pages.folderId, folderId) : undefined,
        or(
          like(pages.title, `%${query}%`),
          sql`to_tsvector('english', ${pages.searchableText}) @@ to_tsquery('english', ${query.trim().split(/\s+/).join(" & ")})`,
        ),
      ),
    )
    .limit(20);

  return c.json(rawResults);
});

// GET /pages/review - list due pages
pagesRouter.get("/review", async (c) => {
  const userId = c.get("userId");
  const folderId = c.req.query("folderId");
  const now = new Date();

  const results = await db.query.pages.findMany({
    where: and(
      eq(pages.userId, userId),
      folderId ? eq(pages.folderId, folderId) : undefined,
      or(lte(pages.nextReviewAt, now), isNull(pages.nextReviewAt)),
    ),
    orderBy: [asc(pages.nextReviewAt)],
  });

  return c.json(results);
});

// POST /pages/:id/review - process a review (SM-2 algorithm)
pagesRouter.post("/:id/review", async (c) => {
  const userId = c.get("userId");
  const pageId = c.req.param("id");
  const { quality } = await c.req.json(); // 0-5

  if (typeof quality !== "number" || quality < 0 || quality > 5) {
    return c.json({ error: "Invalid quality score. Must be 0-5." }, 400);
  }

  const page = await db.query.pages.findFirst({
    where: and(eq(pages.id, pageId), eq(pages.userId, userId)),
  });

  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  const {
    easeFactor: currentEaseFactor,
    interval: currentInterval,
    reviewCount: currentReviewCount,
  } = page;
  let easeFactor = currentEaseFactor;
  let interval = currentInterval;
  let reviewCount = currentReviewCount;
  const nextReviewAt = new Date();

  if (quality >= 3) {
    // Correct response
    if (reviewCount === 0) {
      interval = 1;
    } else if (reviewCount === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    reviewCount++;
  } else {
    // Incorrect response
    interval = 1;
    reviewCount = 0;
  }

  // Update ease factor
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate next review date
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  // Update status
  let status = page.status;
  if (quality >= 4 && reviewCount >= 3) {
    status = "mastered";
  } else if (quality >= 3) {
    status = "learning";
  } else {
    status = "new";
  }

  const [updatedPage] = await db
    .update(pages)
    .set({
      easeFactor,
      interval,
      reviewCount,
      nextReviewAt,
      lastReviewedAt: new Date(),
      status: status as "new" | "learning" | "mastered",
      updatedAt: new Date(),
    })
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning();

  // Log the review
  await db.insert(reviewLogs).values({
    userId,
    pageId,
    quality,
  });

  return c.json(updatedPage);
});

// GET /pages - list all pages for the authenticated user (optional folderId filter)
pagesRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const folderId = c.req.query("folderId");

  const results = await db.query.pages.findMany({
    where: and(
      eq(pages.userId, userId),
      folderId ? eq(pages.folderId, folderId) : undefined,
    ),
    orderBy: [asc(pages.pageOrder)],
  });

  return c.json(results);
});

// GET /pages/:id - get a single page
pagesRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const pageId = c.req.param("id");

  const page = await db.query.pages.findFirst({
    where: and(eq(pages.id, pageId), eq(pages.userId, userId)),
  });

  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  return c.json(page);
});

// POST /pages - create a new page
pagesRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = CreatePageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  let elements = parsed.data.elements || [];

  // If no elements provided and folderId is present, check for default template
  if (elements.length === 0 && parsed.data.folderId) {
    const folder = await db.query.folders.findFirst({
      where: and(
        eq(folders.id, parsed.data.folderId),
        eq(folders.userId, userId),
      ),
      with: {
        defaultTemplate: true,
      },
    });

    if (folder?.defaultTemplate) {
      elements = folder.defaultTemplate.elements as SketchElement[];
    }
  }

  const searchableText = extractSearchableText(elements);

  const [newPage] = await db
    .insert(pages)
    .values({
      ...parsed.data,
      userId,
      elements: elements,
      searchableText,
    })
    .returning();

  return c.json(newPage, 201);
});

// PATCH /pages/:id - update page
pagesRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const pageId = c.req.param("id");
  const body = await c.req.json();

  const parsed = UpdatePageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid inputs", details: parsed.error.issues },
      400,
    );
  }

  const [updatedPage] = await db
    .update(pages)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
      ...(parsed.data.elements
        ? {
            searchableText: extractSearchableText(
              parsed.data.elements as SketchElement[],
            ),
          }
        : {}),
    })
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning();

  if (!updatedPage) {
    return c.json({ error: "Page not found or unauthorized" }, 404);
  }

  return c.json(updatedPage);
});

// DELETE /pages/:id - delete page
pagesRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const pageId = c.req.param("id");

  const [deletedPage] = await db
    .delete(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning();

  if (!deletedPage) {
    return c.json({ error: "Page not found or unauthorized" }, 404);
  }

  return c.json({ message: "Page deleted successfully" });
});

export default pagesRouter;
