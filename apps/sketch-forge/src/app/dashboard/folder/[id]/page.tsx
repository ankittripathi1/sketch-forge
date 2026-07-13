"use client";

import { useCallback, use, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
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

gsap.registerPlugin(useGSAP);

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
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

  useGSAP(
    () => {
      if (!rootRef.current) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".dashboard-enter",
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.07,
            ease: "power3.out",
          },
        );
        gsap.fromTo(
          ".dashboard-page-card",
          { autoAlpha: 0, y: 16, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            stagger: 0.045,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
        );
      });

      return () => media.revert();
    },
    {
      scope: rootRef,
      dependencies: [folder?.id, folder?.pages.length, isLoading, viewMode],
      revertOnUpdate: true,
    },
  );

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
      <div ref={rootRef} className="dashboard-workspace animate-pulse">
        <div className="mb-8 h-4 w-48 rounded bg-surface-raised" />
        <div className="mb-12 h-10 w-64 rounded bg-surface-raised" />
        <div className="dashboard-page-grid dashboard-page-grid-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dashboard-page-skeleton h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div
        ref={rootRef}
        className="dashboard-workspace font-medium text-text-secondary"
      >
        Folder not found.
      </div>
    );
  }

  return (
    <div ref={rootRef} className="dashboard-workspace">
      <header className="dashboard-library-header dashboard-enter block">
        <Breadcrumbs currentFolderId={id} allFolders={allFolders} />
        <div className="mt-6 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="flex items-center gap-3">
            <span
              className="dashboard-folder-glyph h-12 w-12 text-lg"
              aria-hidden="true"
            >
              {folder.icon || "F"}
            </span>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-[-0.055em] text-text-heading md:text-5xl">
                {folder.name}
              </h1>
              <p className="mt-1 text-xs text-text-secondary">
                {folder.pages.length} pages, {folder.children.length} folders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="dashboard-action dashboard-action-secondary"
            >
              <FolderPlus size={16} />
              <span>Sub-folder</span>
            </button>
            <button
              onClick={handleCreatePage}
              className="dashboard-action dashboard-action-primary"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>New page</span>
            </button>
          </div>
        </div>
      </header>

      {folder.children.length > 0 && (
        <section className="dashboard-section dashboard-enter">
          <div className="dashboard-section-header">
            <div>
              <h2>Sub-folders</h2>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                Drop a page onto a sub-folder to move it there.
              </p>
            </div>
          </div>
          <div className="dashboard-folder-grid">
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

      <section className="dashboard-section dashboard-enter">
        <div className="dashboard-section-header">
          <div>
            <h2>Pages</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Drag to reorder, move into a sub-folder, or drop on All pages in
              the sidebar to return to root.
            </p>
          </div>
          <div className="dashboard-view-toggle">
            <button
              onClick={() => setViewMode("grid")}
              className={`transition-colors ${
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
              className={`transition-colors ${
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
            className={`dashboard-page-grid ${
              viewMode === "grid"
                ? "dashboard-page-grid-grid"
                : "dashboard-page-grid-list"
            }`}
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
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">
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
              className="dashboard-action dashboard-action-primary mt-7"
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
        <div role="status" aria-live="polite" className="dashboard-toast">
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
      className={`dashboard-folder-card ${
        isDragOver ? "dashboard-folder-card-active" : ""
      }`}
    >
      <span className="dashboard-folder-glyph" aria-hidden="true">
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
