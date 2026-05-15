"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, FileText, LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDashboardData, updatePage } from "../../../lib/api/client";
import type {
  DashboardData,
  DashboardStats,
  Folder,
  Page,
} from "../../../lib/api/types";
import { StatsOverview } from "./StatsOverview";
import { ProgressChart } from "./ProgressChart";
import { ReviewHeatmap } from "./ReviewHeatmap";
import { PageCard } from "./PageCard";

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 animate-pulse md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={`h-20 rounded-xl bg-surface-overlay border border-border-subtle ${i === 0 ? "lg:col-span-2" : ""}`}
        />
      ))}
      <div className="h-40 rounded-xl bg-surface-overlay border border-border-subtle lg:col-span-2" />
      <div className="h-40 rounded-xl bg-surface-overlay border border-border-subtle" />
    </div>
  );
}

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [pages, setPages] = useState<Page[]>(initialData.pages);
  const [folders, setFolders] = useState<Folder[]>(initialData.folders);
  const [stats, setStats] = useState<DashboardStats | null>(initialData.stats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const rootPages = useMemo(
    () =>
      pages
        .filter((page) => !page.folderId)
        .sort((a, b) => a.pageOrder - b.pageOrder),
    [pages],
  );

  const refreshDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await getDashboardData();
      setPages(next.pages);
      setFolders(next.folders);
      setStats(next.stats);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshFromCache = (event: PageTransitionEvent) => {
      if (event.persisted) refreshDashboardData();
    };

    window.addEventListener("focus", refreshDashboardData);
    window.addEventListener("pageshow", refreshFromCache);
    return () => {
      window.removeEventListener("focus", refreshDashboardData);
      window.removeEventListener("pageshow", refreshFromCache);
    };
  }, [refreshDashboardData]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("pageId", id);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("pageId");
      if (!draggedId || draggedId === targetId) return;

      const draggedIndex = rootPages.findIndex((page) => page.id === draggedId);
      const targetIndex = rootPages.findIndex((page) => page.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return;

      const reorderedRootPages = [...rootPages];
      const [movedPage] = reorderedRootPages.splice(draggedIndex, 1);
      if (!movedPage) return;
      reorderedRootPages.splice(targetIndex, 0, movedPage);

      const updatedRootPages = reorderedRootPages.map((page, index) => ({
        ...page,
        pageOrder: index,
      }));

      setPages((current) => {
        const rootIds = new Set(updatedRootPages.map((page) => page.id));
        return [
          ...current.filter((page) => !rootIds.has(page.id)),
          ...updatedRootPages,
        ];
      });

      try {
        await Promise.all(
          updatedRootPages.map((page) =>
            updatePage(page.id, { pageOrder: page.pageOrder }),
          ),
        );
      } catch (error) {
        console.error("Failed to persist page order:", error);
        refreshDashboardData();
      }
    },
    [refreshDashboardData, rootPages],
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-text-heading tracking-tight">
          Dashboard
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Your progress, activity, and notebook library.
        </p>
      </div>

      {isRefreshing && !stats ? (
        <StatsSkeleton />
      ) : stats ? (
        <>
          <StatsOverview stats={stats} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <ReviewHeatmap data={stats.heatmapData} />
            </div>
            <div>
              <ProgressChart data={stats.folderBreakdown} />
            </div>
          </div>
        </>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-heading tracking-tight flex items-center gap-2">
            Root Pages
            {rootPages.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted">
                {rootPages.length}
              </span>
            )}
          </h2>

          <div className="flex items-center bg-surface-raised rounded-lg p-0.5 border border-border-default">
            <button className="p-1.5 rounded-md bg-surface-hover text-text-heading">
              <LayoutGrid size={13} />
            </button>
            <button className="p-1.5 rounded-md text-text-muted hover:text-text-heading transition-colors">
              <List size={13} />
            </button>
          </div>
        </div>

        {rootPages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rootPages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                onRefresh={refreshDashboardData}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                allFolders={folders}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-raised/20 rounded-2xl border border-border-default border-dashed">
            <div className="mb-6 rounded-2xl bg-surface-raised p-6 text-text-dim">
              <FileText size={40} strokeWidth={1} />
            </div>
            <h2 className="text-xl font-bold text-text-heading mb-2">
              No root pages yet
            </h2>
            <p className="text-text-secondary mb-8 max-w-xs text-center text-sm">
              Create a standalone page, or move it into a folder from the
              canvas.
            </p>
            <button
              onClick={() => router.push("/canvas")}
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text transition-all hover:bg-accent-hover active:scale-[0.97] shadow-lg shadow-accent-glow"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create First Notebook</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
