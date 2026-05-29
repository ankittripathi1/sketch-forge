"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Zap,
  ChevronLeft,
  ChevronRight,
  Book,
  Settings,
  FolderPlus,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import { FolderTreeItem } from "./FolderTreeItem";
import { NewFolderDialog } from "./NewFolderDialog";
import { SearchBar } from "./SearchBar";
import { useRouter, usePathname } from "next/navigation";
import { ThemeSelector } from "@/theme/ThemeSelector";
import {
  useCreatePage,
  useDashboardData,
  useDeletePage,
  useUpdateFolder,
  useUpdatePage,
} from "@/api/hooks";
import type { Folder, Page } from "@/api/types";

type FolderWithPageCount = Folder & {
  pageCount?: number;
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onSearchOpen: () => void;
}

interface RootPageItemProps {
  page: Page;
  onNavigate: (id: string) => void;
  onRefresh: () => void;
}

function RootPageItem({ page, onNavigate, onRefresh }: RootPageItemProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const updatePageMutation = useUpdatePage();
  const deletePageMutation = useDeletePage();

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  const handleRename = async () => {
    const newTitle = prompt("Rename page:", page.title);
    if (!newTitle || newTitle === page.title) return;
    try {
      await updatePageMutation.mutateAsync({
        id: page.id,
        data: { title: newTitle },
      });
      onRefresh();
    } catch (error) {
      console.error("Failed to rename page:", error);
    }
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${page.title}"?`)) return;
    try {
      await deletePageMutation.mutateAsync(page.id);
      onRefresh();
    } catch (error) {
      console.error("Failed to delete page:", error);
    }
    setContextMenu(null);
  };

  return (
    <div className="relative">
      <div
        className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs cursor-pointer text-text-secondary hover:bg-surface-hover hover:text-text-heading transition-all"
        onClick={() => onNavigate(page.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <FileText size={13} className="flex-shrink-0" />
        <span className="flex-1 truncate font-medium">{page.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-hover transition-opacity"
        >
          <Settings size={11} />
        </button>
      </div>
      {contextMenu && (
        <div
          className="fixed z-50 w-40 rounded-xl border border-border-default bg-surface-overlay p-1 shadow-2xl backdrop-blur-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRename}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-body hover:bg-surface-hover"
          >
            Rename
          </button>
          <div className="my-1 h-px bg-border-default" />
          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-400 hover:bg-red-400/10"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ isCollapsed, onToggle, onSearchOpen }: SidebarProps) {
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const pathname = usePathname();
  const { data, refetch } = useDashboardData();
  const createPageMutation = useCreatePage();
  const updateFolderMutation = useUpdateFolder();

  const pages = useMemo(() => data?.pages ?? [], [data?.pages]);
  const folders = useMemo<FolderWithPageCount[]>(
    () =>
      (data?.folders ?? []).map((folder) => ({
        ...folder,
        pageCount: pages.filter((page) => page.folderId === folder.id).length,
      })),
    [data?.folders, pages],
  );

  const refreshAll = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNewSubfolder = useCallback((parentId: string) => {
    setNewFolderParentId(parentId);
    setIsNewFolderOpen(true);
  }, []);

  const handleNewPage = useCallback(
    async (folderId: string) => {
      try {
        const page = await createPageMutation.mutateAsync({
          title: "Untitled",
          elements: [],
          folderId,
        });
        refreshAll();
        router.push(`/canvas?pageId=${page.id}&folderId=${folderId}`);
      } catch (error) {
        console.error("Failed to create page:", error);
      }
    },
    [createPageMutation, refreshAll, router],
  );

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("folderId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const folderId = e.dataTransfer.getData("folderId");
    if (!folderId || folderId === targetId) return;
    try {
      await updateFolderMutation.mutateAsync({
        id: folderId,
        data: { parentId: targetId },
      });
      refreshAll();
    } catch (error) {
      console.error("Failed to move folder:", error);
    }
  };

  const buildTree = (parentId: string | null = null) =>
    folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const isDashboard = pathname === "/dashboard";

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-border-default bg-surface-raised transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-12" : "w-[280px]"
      }`}
    >
      {/* Top: Logo & Search */}
      <div className="flex h-14 items-center border-b border-border-default px-3">
        {isCollapsed ? (
          <div className="flex w-full justify-center">
            <Book size={18} className="text-accent" />
          </div>
        ) : (
          <div className="flex w-full items-center gap-2.5 overflow-hidden">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Book size={18} className="text-accent" />
              <span className="font-bold tracking-tight text-text-primary text-sm">
                Sketch Forge
              </span>
            </div>
            <SearchBar onClick={onSearchOpen} />
          </div>
        )}
      </div>

      {/* Nav: Dashboard link */}
      <div className={`px-2 pt-3 pb-1 ${isCollapsed ? "px-1" : ""}`}>
        <button
          onClick={() => router.push("/dashboard")}
          title="Dashboard"
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
            isDashboard
              ? "bg-accent-subtle text-accent"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-body"
          } ${isCollapsed ? "justify-center" : ""}`}
        >
          <LayoutDashboard size={14} />
          {!isCollapsed && <span>Dashboard</span>}
        </button>
      </div>

      {/* Middle: Folder Tree */}
      <div
        className={`flex-1 overflow-y-auto py-2 ${isCollapsed ? "px-1" : "px-2"}`}
      >
        {!isCollapsed && (
          <div className="mb-1.5 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            <span>Library</span>
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="hover:text-accent transition-colors"
            >
              <FolderPlus size={13} />
            </button>
          </div>
        )}

        <div
          className="space-y-0.5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, null)}
        >
          {buildTree(null).map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              depth={0}
              isCollapsed={isCollapsed}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              allFolders={folders}
              refreshFolders={refreshAll}
              pages={pages}
              onNewSubfolder={handleNewSubfolder}
              onNewPage={handleNewPage}
            />
          ))}
        </div>

        {!isCollapsed &&
          pages.filter((p) => p.folderId === null).length > 0 && (
            <div className="mt-1 space-y-0.5">
              {pages
                .filter((p) => p.folderId === null)
                .map((p) => (
                  <RootPageItem
                    key={p.id}
                    page={p}
                    onNavigate={(id) => router.push(`/canvas?pageId=${id}`)}
                    onRefresh={refreshAll}
                  />
                ))}
            </div>
          )}
      </div>

      {/* Bottom: Actions & User */}
      <div className="mt-auto border-t border-border-default p-2.5">
        <div className="space-y-1 mb-3">
          <button
            onClick={() => router.push("/canvas")}
            className={`flex w-full items-center gap-2.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-text transition-all hover:bg-accent-hover active:scale-[0.98] ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Plus size={15} strokeWidth={2.5} />
            {!isCollapsed && <span>New Notebook</span>}
          </button>

          <button
            onClick={() => router.push("/capture")}
            className={`flex w-full items-center gap-2.5 rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-body transition-all hover:bg-surface-hover ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Zap size={15} className="text-accent" />
            {!isCollapsed && <span>Quick Capture</span>}
          </button>
        </div>

        {/* User profile row — theme toggle lives here */}
        <div
          className={`flex items-center gap-2.5 border-t border-border-default pt-2.5 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="h-7 w-7 rounded-full bg-gradient-brand flex-shrink-0 text-[10px] font-bold text-accent-text flex items-center justify-center">
            A
          </div>
          {!isCollapsed && (
            <>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs font-semibold text-text-primary">
                  Ankit Tripathi
                </span>
                <span className="truncate text-[10px] text-text-muted">
                  Pro Plan
                </span>
              </div>
              <div className="flex items-center gap-1">
                <ThemeSelector />
                <button className="p-1.5 rounded-lg text-text-muted hover:text-text-body hover:bg-surface-hover transition-all">
                  <Settings size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-surface-raised text-text-muted shadow-md hover:text-text-body z-10 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      <NewFolderDialog
        isOpen={isNewFolderOpen}
        onClose={() => {
          setIsNewFolderOpen(false);
          setNewFolderParentId(null);
        }}
        onSuccess={refreshAll}
        folders={folders}
        defaultParentId={newFolderParentId}
      />
    </aside>
  );
}
