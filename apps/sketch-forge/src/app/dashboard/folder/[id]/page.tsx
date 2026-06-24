"use client";

import { useCallback, use, useState } from "react";
import { FileText, FolderPlus, LayoutGrid, List, Plus } from "lucide-react";

import { Breadcrumbs, PageCard, NewFolderDialog } from "@/features/dashboard";
import { useRouter } from "next/navigation";
import {
  useCreatePage,
  useDashboardData,
  useFolderDetail,
  useReorderPages,
  useUpdatePage,
} from "@/api/hooks";
import type { Folder } from "@/api/types";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [moveNotice, setMoveNotice] = useState<string | null>(null);
  const router = useRouter();
  const {
    data: folder,
    isLoading,
    refetch: refetchFolder,
  } = useFolderDetail(id);
  const { data: dashboardData, refetch: refetchDashboard } = useDashboardData();
  const createPageMutation = useCreatePage();
  const reorderPagesMutation = useReorderPages(id);
  const updatePageMutation = useUpdatePage();
  const viewMode = useDashboardUiStore((state) => state.folderViewMode);
  const setViewMode = useDashboardUiStore((state) => state.setFolderViewMode);

  const allFolders = dashboardData?.folders ?? [];

  const refreshFolderData = useCallback(() => {
    void refetchFolder();
    void refetchDashboard();
  }, [refetchDashboard, refetchFolder]);

  const handleCreatePage = async () => {
    try {
      const newPage = await createPageMutation.mutateAsync({
        title: "Untitled page",
        folderId: id,
      });
      router.push(`/canvas?pageId=${newPage.id}&folderId=${id}`);
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("pageId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleMovePage = async (pageId: string, target: Folder) => {
    const page = folder?.pages.find((item) => item.id === pageId);
    if (!page || page.folderId === target.id) return;

    try {
      await updatePageMutation.mutateAsync({
        id: pageId,
        data: { folderId: target.id },
      });
      setMoveNotice(`Moved “${page.title || "Untitled"}” to ${target.name}`);
      window.setTimeout(() => setMoveNotice(null), 2400);
      refreshFolderData();
    } catch (error) {
      console.error("Failed to move page:", error);
      setMoveNotice("Could not move the page. Please try again.");
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("pageId");
      if (!draggedId || draggedId === targetId || !folder) return;

      const pages = [...folder.pages].sort((a, b) => a.pageOrder - b.pageOrder);
      const draggedIndex = pages.findIndex((p) => p.id === draggedId);
      const targetIndex = pages.findIndex((p) => p.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const [movedPage] = pages.splice(draggedIndex, 1);
      if (!movedPage) return;
      pages.splice(targetIndex, 0, movedPage);

      const updatedPages = pages.map((p, index) => ({
        ...p,
        pageOrder: index,
      }));

      try {
        await reorderPagesMutation.mutateAsync(updatedPages);
      } catch (error) {
        console.error("Failed to persist reordering:", error);
        refreshFolderData();
      }
    },
    [folder, refreshFolderData, reorderPagesMutation],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1380px] animate-pulse p-6 md:p-10">
        <div className="mb-8 h-4 w-48 rounded bg-surface-raised" />
        <div className="mb-12 h-10 w-64 rounded bg-surface-raised" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-[20px] bg-surface-raised" />
          ))}
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="p-8 font-medium text-text-secondary">
        Folder not found.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-10 p-5 pb-16 md:p-8 md:pb-20 lg:p-10 lg:pb-24">
      <header className="border-b border-border-subtle pb-7">
        <Breadcrumbs currentFolderId={id} allFolders={allFolders} />
        <div className="mt-6 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent-subtle text-lg text-accent"
              aria-hidden="true"
            >
              {folder.icon || "F"}
            </span>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-text-heading md:text-4xl">
                {folder.name}
              </h1>
              <p className="mt-1 text-xs text-text-secondary">
                {folder.pages.length} pages · {folder.children.length} folders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border-default bg-surface-raised px-4 text-sm font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:bg-surface-hover hover:text-text-heading active:translate-y-0 active:scale-[0.98]"
            >
              <FolderPlus size={16} />
              <span>Sub-folder</span>
            </button>
            <button
              onClick={handleCreatePage}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-accent-text transition-all hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>New page</span>
            </button>
          </div>
        </div>
      </header>

      {folder.children.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-text-heading">
            Sub-folders
          </h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-text-secondary">
            Drop a page onto a sub-folder to move it there.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {folder.children.map((child) => (
              <SubfolderDropCard
                key={child.id}
                folder={child}
                onOpen={() => router.push(`/dashboard/folder/${child.id}`)}
                onPageDrop={(pageId) => handleMovePage(pageId, child)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-text-heading">
              Pages
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Drag to reorder, move into a sub-folder, or drop on All pages in
              the sidebar to return to root.
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

        {folder.pages.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                : "grid grid-cols-1 gap-3"
            }
          >
            {folder.pages
              .sort((a, b) => a.pageOrder - b.pageOrder)
              .map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  viewMode={viewMode}
                  onRefresh={refreshFolderData}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  allFolders={allFolders}
                />
              ))}
          </div>
        ) : (
          <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-[24px] border border-dashed border-border-default bg-surface-paper/50 px-6 py-16 text-center">
            <div className="mb-5 rounded-[16px] bg-accent-subtle p-5 text-accent">
              <FileText size={38} strokeWidth={1.3} />
            </div>
            <h3 className="font-display text-2xl font-semibold tracking-[-0.035em] text-text-heading">
              No pages in this folder
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-7 text-text-secondary">
              Start by creating your first sketch or note.
            </p>
            <button
              onClick={handleCreatePage}
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-text transition-all hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Create page</span>
            </button>
          </div>
        )}
      </section>

      <NewFolderDialog
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onSuccess={refreshFolderData}
        folders={allFolders}
        defaultParentId={id}
      />

      {moveNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-40 rounded-full border border-border-default bg-text-heading px-4 py-2.5 text-xs font-semibold text-surface-base shadow-elev-3"
        >
          {moveNotice}
        </div>
      ) : null}
    </div>
  );
}

function SubfolderDropCard({
  folder,
  onOpen,
  onPageDrop,
}: {
  folder: Folder;
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
      className={`flex min-h-24 items-center gap-3 rounded-[18px] border p-4 text-left transition-all hover:-translate-y-0.5 ${
        isDragOver
          ? "border-border-accent-strong bg-accent-subtle shadow-glow-accent"
          : "border-border-subtle bg-surface-raised/80 hover:border-border-accent-strong hover:bg-surface-raised"
      }`}
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-accent-subtle text-sm text-accent"
        aria-hidden="true"
      >
        {folder.icon || "F"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-heading">
        {folder.name}
      </span>
      {isDragOver ? (
        <span className="text-[10px] font-semibold text-accent">Move here</span>
      ) : null}
    </button>
  );
}
