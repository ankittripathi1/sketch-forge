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
} from "@/api/hooks";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const router = useRouter();
  const {
    data: folder,
    isLoading,
    refetch: refetchFolder,
  } = useFolderDetail(id);
  const { data: dashboardData, refetch: refetchDashboard } = useDashboardData();
  const createPageMutation = useCreatePage();
  const reorderPagesMutation = useReorderPages(id);
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
      <div className="mx-auto max-w-6xl animate-pulse p-6">
        <div className="mb-8 h-4 w-48 rounded bg-surface-raised" />
        <div className="mb-12 h-10 w-64 rounded bg-surface-raised" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-lg bg-surface-raised" />
          ))}
        </div>
      </div>
    );
  }

  if (!folder) return <div className="p-6">Folder not found</div>;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 p-5 md:p-8">
      <header className="border-b border-border-subtle pb-8">
        <Breadcrumbs currentFolderId={id} allFolders={allFolders} />
        <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-border-default bg-surface-raised text-xl shadow-elev-1"
              aria-hidden="true"
            >
              {folder.icon || "F"}
            </span>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-accent">
                Folder
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-text-heading md:text-5xl">
                {folder.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border-default bg-surface-raised px-4 text-sm font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:bg-surface-hover hover:text-text-heading active:translate-y-0 active:scale-[0.98]"
            >
              <FolderPlus size={16} />
              <span>Sub-folder</span>
            </button>
            <button
              onClick={handleCreatePage}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-text shadow-glow-accent transition-all hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>New page</span>
            </button>
          </div>
        </div>
      </header>

      {folder.children.length > 0 && (
        <section>
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            Sub-folders
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {folder.children.map((child) => (
              <button
                key={child.id}
                onClick={() => router.push(`/dashboard/folder/${child.id}`)}
                className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-raised p-3 text-left shadow-elev-1 transition-all hover:-translate-y-0.5 hover:border-border-accent hover:bg-surface-hover"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-sunken text-sm text-text-secondary"
                  aria-hidden="true"
                >
                  {child.icon || "F"}
                </span>
                <span className="truncate text-sm font-semibold text-text-heading">
                  {child.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-heading">
              Pages
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              {folder.pages.length} saved{" "}
              {folder.pages.length === 1 ? "page" : "pages"} in this folder.
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

        {folder.pages.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
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
          <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-surface-raised/40 px-6 py-16 text-center">
            <div className="mb-5 rounded-lg border border-border-default bg-surface-raised p-5 text-text-dim shadow-elev-1">
              <FileText size={38} strokeWidth={1.3} />
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-text-heading">
              No pages in this folder
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-7 text-text-secondary">
              Start by creating your first sketch or note.
            </p>
            <button
              onClick={handleCreatePage}
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-text transition-all hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
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
    </div>
  );
}
