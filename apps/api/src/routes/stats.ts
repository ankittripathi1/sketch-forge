import { Hono } from "hono";
import { authMiddleware, AuthVariables } from "../middleware/auth.js";
import { db, pages, folders, reviewLogs } from "@repo/db";
import { and, eq, sql, gte, lte, or, isNull } from "drizzle-orm";

const statsRouter = new Hono<{ Variables: AuthVariables }>();

statsRouter.use("*", authMiddleware);

statsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const now = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);

  // 1. Total pages by status
  const statusCounts = await db
    .select({
      status: pages.status,
      count: sql<number>`count(*)`,
    })
    .from(pages)
    .where(eq(pages.userId, userId))
    .groupBy(pages.status);

  const byStatus = {
    new: statusCounts.find((s) => s.status === "new")?.count || 0,
    learning: statusCounts.find((s) => s.status === "learning")?.count || 0,
    mastered: statusCounts.find((s) => s.status === "mastered")?.count || 0,
  };

  // 2. Pages reviewed today / this week / this month
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [reviewedToday, reviewedWeek, reviewedMonth] = await Promise.all([
    db
      .select({ count: sql<number>`count(distinct ${reviewLogs.pageId})` })
      .from(reviewLogs)
      .where(
        and(
          eq(reviewLogs.userId, userId),
          gte(reviewLogs.createdAt, todayStart),
        ),
      ),
    db
      .select({ count: sql<number>`count(distinct ${reviewLogs.pageId})` })
      .from(reviewLogs)
      .where(
        and(
          eq(reviewLogs.userId, userId),
          gte(reviewLogs.createdAt, weekStart),
        ),
      ),
    db
      .select({ count: sql<number>`count(distinct ${reviewLogs.pageId})` })
      .from(reviewLogs)
      .where(
        and(
          eq(reviewLogs.userId, userId),
          gte(reviewLogs.createdAt, monthStart),
        ),
      ),
  ]);

  // 3. Streak
  const allReviewDays = await db
    .select({
      date: sql<string>`DATE(${reviewLogs.createdAt})`,
    })
    .from(reviewLogs)
    .where(eq(reviewLogs.userId, userId))
    .groupBy(sql`DATE(${reviewLogs.createdAt})`)
    .orderBy(sql`DATE(${reviewLogs.createdAt}) DESC`);

  let streak = 0;
  if (allReviewDays.length > 0 && allReviewDays[0]) {
    const todayStr = now.toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Check if streak is still alive (reviewed today or yesterday)
    const lastReviewDate = allReviewDays[0].date;
    if (lastReviewDate === todayStr || lastReviewDate === yesterdayStr) {
      streak = 1;
      for (let i = 0; i < allReviewDays.length - 1; i++) {
        const currentData = allReviewDays[i];
        const nextData = allReviewDays[i + 1];
        if (!currentData?.date || !nextData?.date) break;

        const current = new Date(currentData.date);
        const next = new Date(nextData.date);
        const diff =
          (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // 4. Per-folder breakdown
  const folderStats = await db
    .select({
      folderId: pages.folderId,
      status: pages.status,
      count: sql<number>`count(*)`,
    })
    .from(pages)
    .where(eq(pages.userId, userId))
    .groupBy(pages.folderId, pages.status);

  const allFolders = await db.query.folders.findMany({
    where: eq(folders.userId, userId),
  });

  const folderBreakdown = allFolders.map((f) => {
    const stats = folderStats.filter((s) => s.folderId === f.id);
    return {
      folderId: f.id,
      name: f.name,
      total: stats.reduce((acc, s) => acc + Number(s.count), 0),
      new: stats.find((s) => s.status === "new")?.count || 0,
      learning: stats.find((s) => s.status === "learning")?.count || 0,
      mastered: stats.find((s) => s.status === "mastered")?.count || 0,
    };
  });

  // 5. Review heatmap data (last 90 days)
  const heatmapData = await db
    .select({
      date: sql<string>`DATE(${reviewLogs.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(reviewLogs)
    .where(
      and(
        eq(reviewLogs.userId, userId),
        gte(reviewLogs.createdAt, ninetyDaysAgo),
      ),
    )
    .groupBy(sql`DATE(${reviewLogs.createdAt})`)
    .orderBy(sql`DATE(${reviewLogs.createdAt})`);

  // 6. Due for review count
  const dueCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(pages)
    .where(
      and(
        eq(pages.userId, userId),
        or(lte(pages.nextReviewAt, now), isNull(pages.nextReviewAt)),
      ),
    );

  return c.json({
    byStatus,
    reviewed: {
      today: reviewedToday[0]?.count || 0,
      week: reviewedWeek[0]?.count || 0,
      month: reviewedMonth[0]?.count || 0,
    },
    streak,
    folderBreakdown,
    heatmapData,
    dueCount: dueCount[0]?.count || 0,
  });
});

export default statsRouter;
