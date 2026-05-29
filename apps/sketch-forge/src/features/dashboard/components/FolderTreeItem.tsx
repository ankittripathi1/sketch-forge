"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Palette,
  ArrowRightLeft,
  Smile,
  FolderPlus,
  FilePlus,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import {
  useDeleteFolder,
  useDeletePage,
  useUpdateFolder,
  useUpdatePage,
} from "@/api/hooks";
import type { Folder, Page, UpdateFolderInput } from "@/api/types";

type FolderWithPageCount = Folder & {
  pageCount?: number;
};

interface FolderTreeItemProps {
  folder: FolderWithPageCount;
  depth: number;
  isCollapsed: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string | null) => void;
  allFolders: FolderWithPageCount[];
  refreshFolders: () => void;
  pages?: Page[];
  onNewSubfolder: (parentId: string) => void;
  onNewPage: (folderId: string) => void;
}

export function FolderTreeItem({
  folder,
  depth,
  isCollapsed,
  onDragStart,
  onDrop,
  allFolders,
  refreshFolders,
  pages = [],
  onNewSubfolder,
  onNewPage,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(folder.name);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const router = useRouter();
  const pathname = usePathname();
  const editInputRef = useRef<HTMLInputElement>(null);
  const isActive = pathname === `/dashboard/folder/${folder.id}`;
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const updatePageMutation = useUpdatePage();
  const deletePageMutation = useDeletePage();

  const childFolders = allFolders
    .filter((f) => f.parentId === folder.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const folderPages = pages.filter((p) => p.folderId === folder.id);

  const [pageContextMenu, setPageContextMenu] = useState<{
    pageId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    if (isCollapsed) return;
    router.push(`/dashboard/folder/${folder.id}`);
  };

  const handleRename = async () => {
    if (editedName.trim() === "" || editedName === folder.name) {
      setIsEditing(false);
      setEditedName(folder.name);
      return;
    }

    try {
      await updateFolderMutation.mutateAsync({
        id: folder.id,
        data: { name: editedName },
      });
      refreshFolders();
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
    setIsEditing(false);
  };

  const handleUpdate = async (data: UpdateFolderInput) => {
    try {
      await updateFolderMutation.mutateAsync({ id: folder.id, data });
      refreshFolders();
    } catch (error) {
      console.error("Failed to update folder:", error);
    }
    setShowContextMenu(false);
  };

  const handleChangeIcon = () => {
    const newIcon = prompt("Enter new emoji icon:", folder.icon || "📁");
    if (newIcon) handleUpdate({ icon: newIcon });
  };

  const handleChangeColor = () => {
    const newColor = prompt(
      "Enter new hex color (e.g. #5a8ae8):",
      folder.color || "#5a8ae8",
    );
    if (newColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newColor)) {
      handleUpdate({ color: newColor });
    } else if (newColor) {
      alert("Invalid hex color format.");
    }
  };

  const handleMove = () => {
    const parentId = prompt(
      "Enter parent folder ID (leave empty for top-level):",
      folder.parentId || "",
    );
    if (parentId !== null) {
      handleUpdate({ parentId: parentId.trim() || null });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${folder.name}"?`)) return;
    try {
      await deleteFolderMutation.mutateAsync(folder.id);
      refreshFolders();
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
    setShowContextMenu(false);
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

  useEffect(() => {
    const handleClickOutside = () => setPageContextMenu(null);
    if (pageContextMenu) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [pageContextMenu]);

  const handlePageRename = async (page: Page) => {
    const newTitle = prompt("Rename page:", page.title);
    if (!newTitle || newTitle === page.title) return;
    try {
      await updatePageMutation.mutateAsync({
        id: page.id,
        data: { title: newTitle },
      });
      refreshFolders();
    } catch (error) {
      console.error("Failed to rename page:", error);
    }
    setPageContextMenu(null);
  };

  const handlePageDelete = async (page: Page) => {
    if (!confirm(`Delete "${page.title}"?`)) return;
    try {
      await deletePageMutation.mutateAsync(page.id);
      refreshFolders();
    } catch (error) {
      console.error("Failed to delete page:", error);
    }
    setPageContextMenu(null);
  };

  if (isCollapsed) {
    return (
      <div
        className="group relative flex h-10 w-full items-center justify-center rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
        title={folder.name}
        onClick={() => router.push(`/dashboard/folder/${folder.id}`)}
      >
        <span className="text-base">{folder.icon || "📁"}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, folder.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, folder.id)}
        onContextMenu={handleContextMenu}
        onClick={handleSelect}
        onDoubleClick={() => setIsEditing(true)}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-all cursor-pointer ${
          isActive
            ? "bg-accent-subtle text-accent"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-heading"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={handleToggle}
          className={`flex h-4 w-4 items-center justify-center rounded transition-colors hover:bg-surface-hover ${
            childFolders.length === 0 && folderPages.length === 0
              ? "invisible"
              : ""
          }`}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        <span className="flex-shrink-0 text-sm mr-1">
          {folder.icon || "📁"}
        </span>

        {isEditing ? (
          <input
            ref={editInputRef}
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setIsEditing(false);
                setEditedName(folder.name);
              }
            }}
            className="flex-1 bg-transparent outline-none border-none p-0 text-xs font-medium text-text-heading"
          />
        ) : (
          <span className="flex-1 truncate font-medium">{folder.name}</span>
        )}

        {folder.pageCount !== undefined && folder.pageCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-surface-hover text-text-muted">
            {folder.pageCount}
          </span>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewPage(folder.id);
            }}
            title="New Page"
            className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-accent transition-colors"
          >
            <FilePlus size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewSubfolder(folder.id);
            }}
            title="New Subfolder"
            className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-accent transition-colors"
          >
            <FolderPlus size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(true);
              setContextMenuPos({ x: e.clientX, y: e.clientY });
            }}
            className="p-1 rounded hover:bg-surface-hover transition-colors"
          >
            <MoreVertical size={12} />
          </button>
        </div>
      </div>

      {isExpanded && (childFolders.length > 0 || folderPages.length > 0) && (
        <div className="mt-0.5 space-y-0.5">
          {childFolders.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              isCollapsed={isCollapsed}
              onDragStart={onDragStart}
              onDrop={onDrop}
              allFolders={allFolders}
              refreshFolders={refreshFolders}
              pages={pages}
              onNewSubfolder={onNewSubfolder}
              onNewPage={onNewPage}
            />
          ))}
          {folderPages.map((page) => (
            <div
              key={page.id}
              className="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs cursor-pointer text-text-secondary hover:bg-surface-hover hover:text-text-heading transition-all"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              onClick={() => router.push(`/canvas?pageId=${page.id}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                setPageContextMenu({
                  pageId: page.id,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
            >
              <span className="flex h-4 w-4 items-center justify-center flex-shrink-0">
                <FileText size={12} />
              </span>
              <span className="flex-1 truncate font-medium">{page.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPageContextMenu({
                    pageId: page.id,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-hover transition-opacity"
              >
                <MoreVertical size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {pageContextMenu &&
        (() => {
          const page = pages.find((p) => p.id === pageContextMenu.pageId);
          if (!page) return null;
          return (
            <div
              className="fixed z-50 w-40 rounded-xl border border-border-default bg-surface-overlay p-1 shadow-2xl backdrop-blur-xl"
              style={{ top: pageContextMenu.y, left: pageContextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handlePageRename(page)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
              >
                <Pencil size={14} /> Rename
              </button>
              <div className="my-1 h-px bg-border-default" />
              <button
                onClick={() => handlePageDelete(page)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          );
        })()}

      {showContextMenu && (
        <div
          className="fixed z-50 w-48 rounded-xl border border-border-default bg-surface-overlay p-1 shadow-2xl backdrop-blur-xl"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onNewPage(folder.id);
              setShowContextMenu(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <FilePlus size={14} /> New Page
          </button>
          <button
            onClick={() => {
              onNewSubfolder(folder.id);
              setShowContextMenu(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <FolderPlus size={14} /> New Subfolder
          </button>
          <div className="my-1 h-px bg-border-default" />
          <button
            onClick={() => {
              setIsEditing(true);
              setShowContextMenu(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <Pencil size={14} /> Rename
          </button>
          <button
            onClick={handleChangeIcon}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <Smile size={14} /> Change Icon
          </button>
          <button
            onClick={handleChangeColor}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <Palette size={14} /> Change Color
          </button>
          <button
            onClick={handleMove}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            <ArrowRightLeft size={14} /> Move
          </button>

          <div className="my-1 h-px bg-border-default" />
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
