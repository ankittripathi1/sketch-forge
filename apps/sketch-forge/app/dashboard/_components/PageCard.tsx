"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  MoreVertical,
  Clock,
  Pencil,
  Trash2,
  ArrowRightLeft,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { deletePage, updatePage } from "../../../lib/api/client";
import type { UpdatePageInput } from "../../../lib/api/types";

interface Page {
  id: string;
  title: string;
  status: "new" | "learning" | "mastered";
  updatedAt: string;
  thumbnail: string | null;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
}

interface PageCardProps {
  page: Page;
  onRefresh: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  allFolders?: Folder[];
}

const STATUS_COLORS = {
  mastered: "bg-status-success",
  learning: "bg-status-warning",
  new: "bg-text-dim",
};

const STATUS_LABELS = {
  mastered: "Mastered",
  learning: "Learning",
  new: "New",
};

export function PageCard({
  page,
  onRefresh,
  onDragStart,
  onDrop,
  allFolders = [],
}: PageCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const router = useRouter();

  const handleUpdate = async (data: UpdatePageInput) => {
    try {
      await updatePage(page.id, data);
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

  const handleChangeStatus = (status: Page["status"]) => {
    handleUpdate({ status });
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${page.title}"?`)) return;
    try {
      await deletePage(page.id);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, page.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, page.id)}
      onContextMenu={handleContextMenu}
      onClick={() => {
        const params = new URLSearchParams({ pageId: page.id });
        if (page.folderId) params.set("folderId", page.folderId);
        router.push(`/canvas?${params.toString()}`);
      }}
      className="group relative flex flex-col rounded-2xl border border-border-default bg-surface-overlay/50 p-4 transition-all hover:border-border-accent-strong hover:bg-surface-overlay cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-4/3 w-full rounded-xl bg-surface-raised mb-3 flex items-center justify-center border border-border-faint overflow-hidden">
        {page.thumbnail ? (
          <Image
            src={page.thumbnail}
            alt={page.title}
            fill
            className="object-cover"
          />
        ) : (
          <FileText
            size={32}
            className="text-text-dim group-hover:text-accent/30 transition-colors"
          />
        )}
      </div>
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-sm text-text-primary truncate group-hover:text-accent transition-colors">
          {page.title}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e);
          }}
          className="p-1 rounded-lg hover:bg-surface-hover text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${STATUS_COLORS[page.status] || STATUS_COLORS.new}`}
          />
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
            {STATUS_LABELS[page.status] || STATUS_LABELS.new}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-dim">
          <Clock size={10} />
          <span>{formatDate(page.updatedAt)}</span>
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

          <div className="my-1 h-px bg-surface-hover" />

          <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-text-muted">
            Change Status
          </div>
          <button
            onClick={() => handleChangeStatus("new")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <div className={`h-2 w-2 rounded-full ${STATUS_COLORS.new}`} /> New
          </button>
          <button
            onClick={() => handleChangeStatus("learning")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <div className={`h-2 w-2 rounded-full ${STATUS_COLORS.learning}`} />{" "}
            Learning
          </button>
          <button
            onClick={() => handleChangeStatus("mastered")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <div className={`h-2 w-2 rounded-full ${STATUS_COLORS.mastered}`} />{" "}
            Mastered
          </button>

          <div className="my-1 h-px bg-surface-hover" />

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
                  Select Folder
                </div>
                <button
                  onClick={() => handleUpdate({ folderId: null })}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
                >
                  Root Dashboard
                </button>
                {allFolders
                  .filter((f) => f.id !== page.folderId)
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

          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
