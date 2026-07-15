"use client";

import { useState, type FormEvent } from "react";
import {
  Folder,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Book,
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
  const [creation, setCreation] = useState<{
    kind: "folder" | "page";
    folderId?: string;
  } | null>(null);
  const [draftName, setDraftName] = useState("");
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

  const beginCreation = (kind: "folder" | "page", folderId?: string) => {
    setCreation({ kind, folderId });
    setDraftName("");
  };

  const submitCreation = async (event: FormEvent) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!creation || !name) return;

    if (creation.kind === "folder") {
      await createFolder(name);
    } else {
      const newPage = await createPage(name, creation.folderId);
      if (newPage) {
        handleSelectPage(newPage);
      }
    }
    setCreation(null);
    setDraftName("");
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
          type="button"
          onClick={onClose}
          aria-label="Close notebook sidebar"
          className="rounded-lg p-1 hover:bg-surface-hover transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {creation && (
          <form
            onSubmit={submitCreation}
            className="mx-1 mb-3 rounded-xl border border-border-default bg-surface-raised p-2 shadow-elev-1"
          >
            <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {creation.kind === "folder" ? "New folder" : "New page"}
            </label>
            <div className="mt-1.5 flex gap-1.5">
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setCreation(null);
                }}
                placeholder={
                  creation.kind === "folder" ? "Folder name" : "Page title"
                }
                className="h-8 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-base px-2 text-[11px] text-text-body outline-none placeholder:text-text-dim focus:border-accent"
              />
              <button
                type="submit"
                disabled={!draftName.trim()}
                className="rounded-lg bg-accent px-2.5 text-[10px] font-semibold text-accent-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </form>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Folders</span>
            <button
              type="button"
              onClick={() => beginCreation("folder")}
              aria-label="Create folder"
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
                  <div className="group flex w-full items-center rounded-lg transition-colors hover:bg-surface-hover">
                    <button
                      type="button"
                      onClick={() => toggleFolder(folder.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-xs"
                      aria-expanded={Boolean(expandedFolders[folder.id])}
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
                    </button>
                    <button
                      type="button"
                      onClick={() => beginCreation("page", folder.id)}
                      aria-label={`Create page in ${folder.name}`}
                      className="mr-1 flex h-7 w-7 items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity hover:bg-surface-raised hover:text-accent focus:opacity-100 group-hover:opacity-100"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

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
                        type="button"
                        onClick={() => beginCreation("page", folder.id)}
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
              type="button"
              onClick={() => beginCreation("page")}
              aria-label="Create standalone page"
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
    </div>
  );
}
