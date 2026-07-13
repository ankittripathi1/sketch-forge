"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  ChevronRight,
  Clock,
  FileText,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import type { Page, UpdatePageInput } from "@/api/types";
import { useDeletePage, useUpdatePage } from "@/api/hooks";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";

interface Folder {
  id: string;
  name: string;
}

interface PageCardProps {
  page: Page;
  viewMode?: "grid" | "list";
  onRefresh: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  allFolders?: Folder[];
}

export function PageCard({
  page,
  viewMode = "grid",
  onRefresh,
  onDragStart,
  onDrop,
  allFolders = [],
}: PageCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const { resolvedTheme, mounted } = useAppTheme();
  const updatePageMutation = useUpdatePage();
  const deletePageMutation = useDeletePage();
  const setDraggingPage = useDashboardUiStore((state) => state.setDraggingPage);

  const thumbnail = useMemo(() => {
    if (mounted && resolvedTheme === "dark") {
      return page.thumbnailDark ?? page.thumbnail ?? page.thumbnailLight;
    }
    return page.thumbnailLight ?? page.thumbnail ?? page.thumbnailDark;
  }, [
    mounted,
    page.thumbnail,
    page.thumbnailDark,
    page.thumbnailLight,
    resolvedTheme,
  ]);

  const handleUpdate = async (data: UpdatePageInput) => {
    try {
      await updatePageMutation.mutateAsync({ id: page.id, data });
      onRefresh();
    } catch (error) {
      console.error("Failed to update page:", error);
    }
    setShowContextMenu(false);
    setShowMoveSubmenu(false);
  };

  const handleRename = () => {
    const newTitle = prompt("Enter new page title:", page.title);
    if (newTitle && newTitle !== page.title) {
      handleUpdate({ title: newTitle });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${page.title}"?`)) return;
    try {
      await deletePageMutation.mutateAsync(page.id);
      onRefresh();
    } catch (error) {
      console.error("Failed to delete page:", error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 208;
    const menuHeight = 320;
    setContextMenuPos({
      x: Math.max(12, Math.min(e.clientX, window.innerWidth - menuWidth - 12)),
      y: Math.max(
        12,
        Math.min(e.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
    setShowContextMenu(true);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showContextMenu]);

  const openPage = () => {
    const params = new URLSearchParams({ pageId: page.id });
    if (page.folderId) params.set("folderId", page.folderId);
    router.push(`/canvas?${params.toString()}`);
  };

  const updatedAt = new Date(page.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("pageId", page.id);
        e.dataTransfer.effectAllowed = "move";
        setDraggingPage({ id: page.id, folderId: page.folderId });
        onDragStart(e, page.id);
      }}
      onDragEnd={() => setDraggingPage(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, page.id)}
      onContextMenu={handleContextMenu}
      onClick={openPage}
      className={`dashboard-page-card group ${
        viewMode === "list"
          ? "dashboard-page-card-list"
          : "dashboard-page-card-grid"
      }`}
    >
      <div className="dashboard-page-thumbnail">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={`${page.title || "Untitled"} canvas preview`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-paper-grid text-text-dim">
            <FileText size={32} strokeWidth={1.3} />
          </div>
        )}
      </div>

      <div className="dashboard-page-copy">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display truncate text-[15px] font-semibold tracking-[-0.025em] text-text-heading transition-colors group-hover:text-accent">
              {page.title || "Untitled"}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
              <Clock size={12} />
              <span>Updated {updatedAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <span
              className="rounded-lg p-1.5 text-text-muted"
              title="Drag this page onto a folder"
              aria-hidden="true"
            >
              <GripVertical size={15} />
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e);
              }}
              className="dashboard-page-menu-button"
              title="Page actions"
            >
              <MoreVertical size={15} />
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <span className="dashboard-page-kind">Canvas page</span>
        </div>
      </div>

      {showContextMenu &&
        createPortal(
          <div
            className="dashboard-context-menu"
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleRename} className="dashboard-menu-item">
              <Pencil size={14} /> Rename
            </button>

            <button
              onClick={() => setShowMoveSubmenu((value) => !value)}
              className="dashboard-menu-item justify-between"
              aria-expanded={showMoveSubmenu}
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft size={14} /> Move to
              </span>
              <ChevronRight
                size={12}
                className={`transition-transform ${showMoveSubmenu ? "rotate-90" : ""}`}
              />
            </button>

            {showMoveSubmenu ? (
              <div className="mt-1 space-y-0.5 border-t border-border-subtle pt-1">
                <p className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Destination
                </p>
                {page.folderId ? (
                  <button
                    onClick={() => handleUpdate({ folderId: null })}
                    className="dashboard-menu-item hover:text-accent"
                  >
                    All pages (root)
                  </button>
                ) : null}
                {allFolders
                  .filter((folder) => folder.id !== page.folderId)
                  .map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleUpdate({ folderId: folder.id })}
                      className="dashboard-menu-item hover:text-accent"
                    >
                      {folder.name}
                    </button>
                  ))}
              </div>
            ) : null}

            <div className="dashboard-menu-divider" />

            <button
              onClick={handleDelete}
              className="dashboard-menu-item text-status-danger hover:bg-status-danger-subtle"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>,
          document.body,
        )}
    </article>
  );
}
