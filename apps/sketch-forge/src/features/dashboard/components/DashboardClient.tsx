"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
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

gsap.registerPlugin(useGSAP);

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const rootRef = useRef<HTMLDivElement>(null);
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

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".dashboard-enter",
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.08,
            ease: "power3.out",
          },
        );
      });

      return () => media.revert();
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".dashboard-page-card",
          { autoAlpha: 0, y: 18, scale: 0.985 },
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
      dependencies: [rootPages.length, viewMode],
      revertOnUpdate: true,
    },
  );

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
    <div ref={rootRef} className="dashboard-workspace">
      <header className="dashboard-library-header dashboard-enter">
        <div>
          <h1 className="dashboard-title">Library</h1>
          <p className="mt-3 max-w-[55ch] text-sm leading-7 text-text-secondary">
            Open a page to keep working, or drag it onto a folder to organize
            it.
          </p>
        </div>

        <div className="dashboard-header-side">
          <dl className="dashboard-metrics" aria-label="Library totals">
            <div>
              <dt>Pages</dt>
              <dd>{pageCount}</dd>
            </div>
            <div>
              <dt>Folders</dt>
              <dd>{folderCount}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="dashboard-action dashboard-action-secondary"
            >
              <FolderPlus size={16} strokeWidth={1.7} />
              New folder
            </button>
            <button
              onClick={() => router.push("/canvas")}
              className="dashboard-action dashboard-action-primary"
            >
              <Plus size={17} strokeWidth={2} />
              New page
            </button>
          </div>
        </div>
      </header>

      {showLoadError ? (
        <DashboardLoadError onRetry={refreshDashboardData} />
      ) : null}

      <section className="dashboard-section dashboard-enter">
        <div className="dashboard-section-header">
          <div>
            <h2>Folders</h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Drop a page here to move it. Open a folder to see what is inside.
            </p>
          </div>
          <p className="hidden text-xs text-text-secondary sm:block">
            {rootFolders.length} at the top level
          </p>
        </div>

        {rootFolders.length > 0 ? (
          <div className="dashboard-folder-grid">
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
          <div className="dashboard-empty-inline">
            No folders yet. Create one to group related pages.
          </div>
        )}
      </section>

      <section className="dashboard-section dashboard-enter">
        <div className="dashboard-section-header">
          <div>
            <h2>All pages</h2>
            <p className="mt-1.5 text-xs text-text-secondary">
              Drag to reorder. Use the grip on a page to move it into a folder.
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

        {dashboardQuery.isFetching && rootPages.length === 0 ? (
          <PageGridSkeleton />
        ) : rootPages.length > 0 ? (
          <div
            className={`dashboard-page-grid ${
              viewMode === "grid"
                ? "dashboard-page-grid-grid"
                : "dashboard-page-grid-list"
            }`}
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
        <div role="status" aria-live="polite" className="dashboard-toast">
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
      className={`dashboard-folder-card group ${
        isDragOver ? "dashboard-folder-card-active" : ""
      }`}
    >
      <span
        className="dashboard-folder-glyph"
        style={folder.color ? { color: folder.color } : undefined}
        aria-hidden="true"
      >
        {folder.icon || <FolderIcon size={22} strokeWidth={1.7} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-heading">
          {folder.name}
        </span>
        <span className="mt-1.5 block text-xs text-text-secondary">
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
    <section className="dashboard-error dashboard-enter">
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
          className="dashboard-action dashboard-action-secondary h-9 text-xs"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function PageGridSkeleton() {
  return (
    <div className="dashboard-page-grid dashboard-page-grid-grid">
      {[0, 1, 2].map((item) => (
        <div key={item} className="dashboard-page-skeleton">
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function EmptyNotesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="dashboard-empty-state">
      <div className="dashboard-empty-icon">
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
        className="dashboard-action dashboard-action-primary mt-7"
      >
        <Plus size={16} strokeWidth={2} />
        Create page
      </button>
    </div>
  );
}
