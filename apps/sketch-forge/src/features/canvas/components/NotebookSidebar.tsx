"use client";

import { useState } from "react";
import {
  Folder,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Book,
  Trash2,
  X,
  PlusCircle,
  FolderPlus,
  PenLine,
} from "lucide-react";
import { useNotebookData } from "../hooks/useNotebookData";
import { useRouter, useSearchParams } from "next/navigation";

interface NotebookSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotebookSidebar({ isOpen, onClose }: NotebookSidebarProps) {
  const { folders, pages, canvases, createFolder, createPage } =
    useNotebookData();

  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentId =
    searchParams.get("pageId") ||
    (searchParams.get("type") === "page" ? searchParams.get("id") : null);
  const currentType = searchParams.get("type");

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleSelectPage = (page: { id: string; folderId?: string | null }) => {
    const params = new URLSearchParams();
    params.set("pageId", page.id);
    if (page.folderId) params.set("folderId", page.folderId);
    router.push(`/canvas?${params.toString()}`);
  };

  const handleSelectCanvas = (id: string) => {
    const params = new URLSearchParams();
    params.set("id", id);
    params.set("type", "canvas");
    router.push(`/canvas?${params.toString()}`);
  };

  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:");
    if (name) await createFolder(name);
  };

  const handleCreatePage = async (folderId?: string) => {
    const title = prompt("Enter page title:");
    if (title) {
      const newPage = await createPage(title, folderId);
      if (newPage) {
        handleSelectPage(newPage);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 top-0 z-30 flex h-full w-72 flex-col border-r border-border-default bg-surface-base text-text-body shadow-2xl transition-all duration-300 ease-in-out">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-4">
        <div className="flex items-center gap-2">
          <Book size={18} className="text-accent" />
          <span className="text-sm font-bold tracking-tight">Notebooks</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-surface-hover transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Folders</span>
            <button
              onClick={handleCreateFolder}
              className="hover:text-accent transition-colors"
            >
              <FolderPlus size={14} />
            </button>
          </div>

          <div className="mt-1 space-y-0.5">
            {folders
              .filter((f) => !f.parentId)
              .map((folder) => (
                <div key={folder.id}>
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-surface-hover"
                  >
                    {expandedFolders[folder.id] ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    <Folder size={14} className="text-accent" />
                    <span className="flex-1 text-left truncate">
                      {folder.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreatePage(folder.id);
                      }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-accent"
                    >
                      <Plus size={12} />
                    </button>
                  </button>

                  {expandedFolders[folder.id] && (
                    <div className="ml-6 mt-0.5 border-l border-border-default pl-2 space-y-0.5">
                      {pages
                        .filter((p) => p.folderId === folder.id)
                        .map((page) => (
                          <button
                            key={page.id}
                            onClick={() => handleSelectPage(page)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                              currentId === page.id
                                ? "bg-accent-subtle text-accent"
                                : "hover:bg-surface-hover"
                            }`}
                          >
                            <FileText size={12} />
                            <span className="flex-1 text-left truncate">
                              {page.title}
                            </span>
                          </button>
                        ))}
                      <button
                        onClick={() => handleCreatePage(folder.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text-body"
                      >
                        <Plus size={12} />
                        <span>New Page</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Standalone Pages</span>
            <button
              onClick={() => handleCreatePage()}
              className="hover:text-accent transition-colors"
            >
              <PlusCircle size={14} />
            </button>
          </div>
          <div className="mt-1 space-y-0.5">
            {pages
              .filter((p) => !p.folderId)
              .map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                    currentId === page.id
                      ? "bg-accent-subtle text-accent"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <FileText size={12} />
                  <span className="flex-1 text-left truncate">
                    {page.title}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {canvases.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <span>Scratch Canvases</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {canvases.map((canvas) => (
                <button
                  key={canvas.id}
                  onClick={() => handleSelectCanvas(canvas.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                    currentId === canvas.id && currentType !== "page"
                      ? "bg-accent-subtle text-accent"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <PenLine size={12} />
                  <span className="flex-1 text-left truncate">
                    {canvas.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-border-default p-4">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-hover">
          <Trash2 size={16} className="text-text-secondary" />
          <span>Trash</span>
        </button>
      </div>
    </div>
  );
}
