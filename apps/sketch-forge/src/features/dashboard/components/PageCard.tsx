"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  ChevronRight,
  Clock,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Page, UpdatePageInput } from "@/api/types";
import { useDeletePage, useUpdatePage } from "@/api/hooks";
import { useAppTheme } from "@/theme/ThemeProvider";

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
    setContextMenuPos({ x: e.clientX, y: e.clientY });
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
      onDragStart={(e) => onDragStart(e, page.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, page.id)}
      onContextMenu={handleContextMenu}
      onClick={openPage}
      className={`group relative cursor-pointer overflow-hidden rounded-lg border border-border-default bg-surface-raised shadow-elev-1 transition-all duration-200 hover:-translate-y-1 hover:border-border-accent-strong hover:shadow-elev-3 ${
        viewMode === "list" ? "grid grid-cols-[12rem_1fr] gap-4 p-3" : "p-3"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-md border border-border-faint bg-surface-sunken ${
          viewMode === "list" ? "aspect-[4/3]" : "mb-3 aspect-[4/3]"
        }`}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={page.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-paper-grid text-text-dim">
            <FileText size={32} strokeWidth={1.3} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-text-primary transition-colors group-hover:text-accent">
              {page.title || "Untitled"}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted">
              <Clock size={12} />
              <span>Updated {updatedAt}</span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e);
            }}
            className="rounded-lg p-1.5 text-text-muted opacity-0 transition-all hover:bg-surface-hover hover:text-text-heading group-hover:opacity-100"
            title="Page actions"
          >
            <MoreVertical size={15} />
          </button>
        </div>

        <div className="mt-auto pt-4">
          <span className="inline-flex rounded-md border border-border-default px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
            Page
          </span>
        </div>
      </div>

      {showContextMenu && (
        <div
          className="fixed z-50 w-48 rounded-xl border border-border-default bg-surface-overlay p-1 shadow-2xl backdrop-blur-xl"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRename}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <Pencil size={14} /> Rename
          </button>

          <div className="relative">
            <button
              onMouseEnter={() => setShowMoveSubmenu(true)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={14} /> Move to folder
              </div>
              <ChevronRight size={12} />
            </button>

            {showMoveSubmenu && (
              <div
                className="absolute left-full top-0 ml-1 w-48 rounded-xl border border-border-default bg-surface-overlay p-1 shadow-2xl"
                onMouseLeave={() => setShowMoveSubmenu(false)}
              >
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-text-muted">
                  Select folder
                </div>
                <button
                  onClick={() => handleUpdate({ folderId: null })}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
                >
                  Root dashboard
                </button>
                {allFolders
                  .filter((folder) => folder.id !== page.folderId)
                  .map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleUpdate({ folderId: folder.id })}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
                    >
                      {folder.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="my-1 h-px bg-surface-hover" />

          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-status-danger hover:bg-status-danger-subtle"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </article>
  );
}
