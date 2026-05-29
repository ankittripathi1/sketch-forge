"use client";

import { useCallback, useMemo } from "react";
import {
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { DashboardData, Folder } from "@/api/types";
import { useDashboardData, useUpdatePage } from "@/api/hooks";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";
import { PageCard } from "./PageCard";

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const dashboardQuery = useDashboardData(initialData);
  const updatePageMutation = useUpdatePage();
  const viewMode = useDashboardUiStore((state) => state.rootViewMode);
  const setViewMode = useDashboardUiStore((state) => state.setRootViewMode);
  const router = useRouter();
  const pages = useMemo(
    () => dashboardQuery.data?.pages ?? [],
    [dashboardQuery.data?.pages],
  );
  const folders = useMemo(
    () => dashboardQuery.data?.folders ?? [],
    [dashboardQuery.data?.folders],
  );

  const rootPages = useMemo(
    () =>
      pages
        .filter((page) => !page.folderId)
        .sort((a, b) => a.pageOrder - b.pageOrder),
    [pages],
  );

  const rootFolders = useMemo(
    () =>
      folders
        .filter((folder) => !folder.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [folders],
  );

  const pageCountByFolder = useMemo(() => {
    const counts = new Map<string, number>();
    for (const page of pages) {
      if (!page.folderId) continue;
      counts.set(page.folderId, (counts.get(page.folderId) ?? 0) + 1);
    }
    return counts;
  }, [pages]);

  const pageCount = pages.length;
  const folderCount = folders.length;
  const hasLibraryItems = pageCount > 0 || folderCount > 0;
  const showLoadError = dashboardQuery.isError && !hasLibraryItems;

  const refreshDashboardData = useCallback(() => {
    void dashboardQuery.refetch();
  }, [dashboardQuery]);

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

      try {
        await Promise.all(
          updatedRootPages.map((page) =>
            updatePageMutation.mutateAsync({
              id: page.id,
              data: { pageOrder: page.pageOrder },
            }),
          ),
        );
        refreshDashboardData();
      } catch (error) {
        console.error("Failed to persist page order:", error);
        refreshDashboardData();
      }
    },
    [refreshDashboardData, rootPages, updatePageMutation],
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 p-5 md:p-8">
      <header className="grid gap-6 border-b border-border-subtle pb-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-accent">
            Library
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-none tracking-[-0.045em] text-text-heading md:text-6xl">
            Notes and pages
          </h1>
          <p className="mt-4 max-w-[58ch] text-sm leading-7 text-text-body">
            Everything you have created lives here. Open a page, move it into a
            folder, or start with a blank canvas.
          </p>
        </div>

        <button
          onClick={() => router.push("/canvas")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-text shadow-glow-accent transition-all hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.4} />
          New page
        </button>
      </header>

      <section className="grid gap-px overflow-hidden rounded-lg border border-border-default bg-border-default sm:grid-cols-3">
        <LibraryMetric label="Total pages" value={pageCount} />
        <LibraryMetric label="Root folders" value={rootFolders.length} />
        <LibraryMetric label="Folders" value={folderCount} />
      </section>

      {showLoadError ? (
        <DashboardLoadError onRetry={refreshDashboardData} />
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-heading">
            Folders
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Open a folder to see the pages saved inside it.
          </p>
        </div>

        {rootFolders.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rootFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                pageCount={pageCountByFolder.get(folder.id) ?? 0}
                childCount={
                  folders.filter((item) => item.parentId === folder.id).length
                }
                onOpen={() => router.push(`/dashboard/folder/${folder.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-default bg-surface-raised/40 px-5 py-8 text-sm text-text-secondary">
            No folders yet.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-heading">
              Root pages
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Pages not inside a folder.
            </p>
          </div>

          <div className="flex items-center rounded-lg border border-border-default bg-surface-raised p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-surface-hover text-text-heading"
                  : "text-text-muted hover:text-text-heading"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-surface-hover text-text-heading"
                  : "text-text-muted hover:text-text-heading"
              }`}
              title="List view"
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {dashboardQuery.isFetching && rootPages.length === 0 ? (
          <PageGridSkeleton />
        ) : rootPages.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                : "grid grid-cols-1 gap-3"
            }
          >
            {rootPages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                viewMode={viewMode}
                onRefresh={refreshDashboardData}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                allFolders={folders}
              />
            ))}
          </div>
        ) : (
          <EmptyNotesState onCreate={() => router.push("/canvas")} />
        )}
      </section>
    </div>
  );
}

function FolderCard({
  folder,
  pageCount,
  childCount,
  onOpen,
}: {
  folder: Folder;
  pageCount: number;
  childCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex min-h-28 items-center gap-4 rounded-lg border border-border-default bg-surface-raised p-4 text-left shadow-elev-1 transition-all hover:-translate-y-0.5 hover:border-border-accent hover:bg-surface-hover hover:shadow-elev-3"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border-faint bg-surface-sunken text-lg text-text-heading"
        style={folder.color ? { color: folder.color } : undefined}
        aria-hidden="true"
      >
        {folder.icon || <FolderIcon size={22} strokeWidth={1.7} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-heading">
          {folder.name}
        </span>
        <span className="mt-2 block text-xs text-text-secondary">
          {pageCount} {pageCount === 1 ? "page" : "pages"}
          {childCount > 0
            ? ` · ${childCount} ${childCount === 1 ? "folder" : "folders"}`
            : ""}
        </span>
      </span>

      <ChevronRight
        size={16}
        className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </button>
  );
}

function LibraryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-base p-5">
      <div className="font-mono text-3xl font-semibold tracking-[-0.04em] text-text-heading">
        {value}
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {label}
      </p>
    </div>
  );
}

function DashboardLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-text-body">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-text-heading">
            Could not load your library
          </h2>
          <p className="mt-1 text-xs leading-6 text-text-secondary">
            Check that the API is running on port 4001 and that your session is
            still valid.
          </p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border-default bg-surface-raised px-3 text-xs font-semibold text-text-heading transition-colors hover:bg-surface-hover"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function PageGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse rounded-lg border border-border-default bg-surface-raised"
        />
      ))}
    </div>
  );
}

function EmptyNotesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-raised/40 px-6 py-16 text-center">
      <div className="mb-5 rounded-lg border border-border-default bg-surface-raised p-5 text-text-dim shadow-elev-1">
        <FileText size={38} strokeWidth={1.3} />
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-heading">
        No pages yet
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-7 text-text-secondary">
        Create a note, diagram, or study page. It will appear here as soon as
        you save it.
      </p>
      <button
        onClick={onCreate}
        className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-text transition-all hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
      >
        <Plus size={16} strokeWidth={2.4} />
        Create page
      </button>
    </div>
  );
}
