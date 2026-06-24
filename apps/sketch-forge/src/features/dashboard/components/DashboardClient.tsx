"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { DashboardData, Folder } from "@/api/types";
import { useDashboardData, useUpdatePage } from "@/api/hooks";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";
import { NewFolderDialog } from "./NewFolderDialog";
import { PageCard } from "./PageCard";

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const dashboardQuery = useDashboardData(initialData);
  const updatePageMutation = useUpdatePage();
  const viewMode = useDashboardUiStore((state) => state.rootViewMode);
  const setViewMode = useDashboardUiStore((state) => state.setRootViewMode);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
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
    e.dataTransfer.effectAllowed = "move";
  };

  const movePageToFolder = useCallback(
    async (pageId: string, folder: Folder) => {
      const page = pages.find((item) => item.id === pageId);
      if (!page || page.folderId === folder.id) return;

      try {
        await updatePageMutation.mutateAsync({
          id: pageId,
          data: { folderId: folder.id },
        });
        setMoveNotice(`Moved “${page.title || "Untitled"}” to ${folder.name}`);
        window.setTimeout(() => setMoveNotice(null), 2400);
        refreshDashboardData();
      } catch (error) {
        console.error("Failed to move page:", error);
        setMoveNotice("Could not move the page. Please try again.");
      }
    },
    [pages, refreshDashboardData, updatePageMutation],
  );

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
    <div className="mx-auto flex max-w-[1480px] flex-col gap-10 p-5 pb-16 md:p-8 md:pb-20 lg:p-10 lg:pb-24">
      <header className="flex flex-col gap-6 border-b border-border-subtle pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span>{pageCount} pages</span>
            <span className="h-1 w-1 rounded-full bg-border-strong" />
            <span>{folderCount} folders</span>
          </div>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-[-0.05em] text-text-heading md:text-5xl">
            Library
          </h1>
          <p className="mt-3 max-w-[55ch] text-sm leading-7 text-text-secondary">
            Open a page to keep working, or drag it onto a folder to organize
            it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsNewFolderOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border-default bg-surface-raised px-4 text-sm font-semibold text-text-body transition-all hover:-translate-y-0.5 hover:border-border-accent hover:text-text-heading active:translate-y-0"
          >
            <FolderPlus size={16} />
            New folder
          </button>
          <button
            onClick={() => router.push("/canvas")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-text transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
          >
            <Plus size={17} strokeWidth={2.4} />
            New page
          </button>
        </div>
      </header>

      {showLoadError ? (
        <DashboardLoadError onRetry={refreshDashboardData} />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-text-heading">
              Folders
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Drop a page here to move it. Open a folder to see what is inside.
            </p>
          </div>
          <p className="hidden text-xs text-text-secondary sm:block">
            {rootFolders.length} at the top level
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
                onPageDrop={(pageId) => movePageToFolder(pageId, folder)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-border-default bg-surface-paper/50 px-5 py-9 text-sm text-text-secondary">
            No folders yet. Create one to group related pages.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-text-heading">
              All pages
            </h2>
            <p className="mt-1.5 text-xs text-text-secondary">
              Drag to reorder. Use the grip on a page to move it into a folder.
            </p>
          </div>

          <div className="flex items-center rounded-full border border-border-default bg-surface-raised p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-full p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-accent-subtle text-accent"
                  : "text-text-muted hover:text-text-heading"
              }`}
              aria-label="Grid view"
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-full p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-accent-subtle text-accent"
                  : "text-text-muted hover:text-text-heading"
              }`}
              aria-label="List view"
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
                ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
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

      {moveNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-40 rounded-full border border-border-default bg-text-heading px-4 py-2.5 text-xs font-semibold text-surface-base shadow-elev-3"
        >
          {moveNotice}
        </div>
      ) : null}

      <NewFolderDialog
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onSuccess={refreshDashboardData}
        folders={folders}
      />
    </div>
  );
}

function FolderCard({
  folder,
  pageCount,
  childCount,
  onOpen,
  onPageDrop,
}: {
  folder: Folder;
  pageCount: number;
  childCount: number;
  onOpen: () => void;
  onPageDrop: (pageId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <button
      onClick={onOpen}
      onDragEnter={() => setIsDragOver(true)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
        const pageId = event.dataTransfer.getData("pageId");
        if (pageId) onPageDrop(pageId);
      }}
      className={`group flex min-h-24 items-center gap-4 rounded-[18px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
        isDragOver
          ? "border-border-accent-strong bg-accent-subtle shadow-glow-accent"
          : "border-border-subtle bg-surface-raised/80 hover:border-border-accent-strong hover:bg-surface-raised"
      }`}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-accent-subtle text-lg text-accent"
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

      {isDragOver ? (
        <span className="shrink-0 text-[10px] font-semibold text-accent">
          Move here
        </span>
      ) : (
        <ChevronRight
          size={16}
          className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        />
      )}
    </button>
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
          className="h-72 animate-pulse rounded-[20px] bg-surface-raised"
        />
      ))}
    </div>
  );
}

function EmptyNotesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-border-default bg-surface-paper/50 px-6 py-16 text-center">
      <div className="mb-5 rounded-[16px] bg-accent-subtle p-5 text-accent">
        <FileText size={38} strokeWidth={1.3} />
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-[-0.035em] text-text-heading">
        No pages yet
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-7 text-text-secondary">
        Create a note, diagram, or study page. It will appear here as soon as
        you save it.
      </p>
      <button
        onClick={onCreate}
        className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-text transition-all hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
      >
        <Plus size={16} strokeWidth={2.4} />
        Create page
      </button>
    </div>
  );
}
