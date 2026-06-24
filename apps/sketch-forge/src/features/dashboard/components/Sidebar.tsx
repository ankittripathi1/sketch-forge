"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Zap,
  ChevronLeft,
  ChevronRight,
  Settings,
  FolderPlus,
  LayoutDashboard,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { FolderTreeItem } from "./FolderTreeItem";
import { NewFolderDialog } from "./NewFolderDialog";
import { SearchBar } from "./SearchBar";
import { useRouter, usePathname } from "next/navigation";
import {
  useCreatePage,
  useDashboardData,
  useUpdateFolder,
  useUpdatePage,
} from "@/api/hooks";
import type { Folder } from "@/api/types";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";

type FolderWithPageCount = Folder & {
  pageCount?: number;
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onSearchOpen: () => void;
}

export function Sidebar({ isCollapsed, onToggle, onSearchOpen }: SidebarProps) {
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isRootDropActive, setIsRootDropActive] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const pathname = usePathname();
  const draggingPage = useDashboardUiStore((state) => state.draggingPage);
  const setDraggingPage = useDashboardUiStore((state) => state.setDraggingPage);
  const { data, refetch } = useDashboardData();
  const createPageMutation = useCreatePage();
  const movePageMutation = useUpdatePage();
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
    setIsRootDropActive(false);

    const pageId = e.dataTransfer.getData("pageId");
    if (pageId) {
      try {
        await movePageMutation.mutateAsync({
          id: pageId,
          data: { folderId: targetId },
        });
        refreshAll();
        setDraggingPage(null);
      } catch (error) {
        console.error("Failed to move page:", error);
      }
      return;
    }

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
  const isSettings = pathname === "/dashboard/settings";
  const showRootDropHint = Boolean(draggingPage?.folderId);

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-border-subtle bg-surface-paper/75 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-[292px]"
      }`}
    >
      <div className="border-b border-border-subtle p-3.5">
        {isCollapsed ? (
          <div className="flex h-9 w-full items-center justify-center">
            <Logo size={30} rounded="rounded-[9px]" />
          </div>
        ) : (
          <div className="space-y-3.5 overflow-hidden">
            <div className="flex items-center gap-2.5">
              <Logo size={30} rounded="rounded-[9px]" />
              <span className="font-display text-[16px] font-semibold tracking-[-0.035em] text-text-heading">
                Sketch Forge
              </span>
            </div>
            <SearchBar onClick={onSearchOpen} />
          </div>
        )}
      </div>

      <nav className={`px-3 pb-1 pt-4 ${isCollapsed ? "px-2" : ""}`}>
        <button
          onClick={() => router.push("/dashboard")}
          title="Dashboard"
          onDragEnter={() => setIsRootDropActive(true)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setIsRootDropActive(true);
          }}
          onDragLeave={() => setIsRootDropActive(false)}
          onDrop={(event) => handleDrop(event, null)}
          className={`flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-xs font-semibold transition-all ${
            isRootDropActive
              ? "bg-accent text-accent-text shadow-glow-accent"
              : showRootDropHint
                ? "bg-accent-subtle text-accent ring-1 ring-inset ring-border-accent-strong"
                : isDashboard
                  ? "bg-accent-subtle text-accent"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-body"
          } ${isCollapsed ? "justify-center" : ""}`}
        >
          <LayoutDashboard size={14} />
          {!isCollapsed && (
            <span>
              {isRootDropActive
                ? "Release to move"
                : showRootDropHint
                  ? "Drop here for root"
                  : "All pages"}
            </span>
          )}
        </button>

        <button
          onClick={() => router.push("/capture")}
          className={`mt-1 flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-xs font-medium transition-all ${
            pathname === "/capture"
              ? "bg-accent-subtle text-accent"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-body"
          } ${isCollapsed ? "justify-center" : ""}`}
          title="Quick capture"
        >
          <Zap size={14} />
          {!isCollapsed && <span>Quick capture</span>}
        </button>
      </nav>

      <div
        className={`flex-1 overflow-y-auto py-3 ${isCollapsed ? "px-2" : "px-3"}`}
      >
        {!isCollapsed && (
          <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            <span>Notebooks</span>
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="rounded-md p-1 transition-colors hover:bg-accent-subtle hover:text-accent"
              aria-label="New folder"
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
      </div>

      <div className="mt-auto border-t border-border-subtle p-3">
        <button
          onClick={() => router.push("/dashboard/settings")}
          className={`flex w-full items-center gap-2.5 rounded-[12px] p-2 text-left transition-colors ${
            isSettings ? "bg-accent-subtle" : "hover:bg-surface-hover"
          } ${isCollapsed ? "justify-center" : ""}`}
          title="Settings"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-accent text-[11px] font-bold text-accent-text">
            A
          </div>
          {!isCollapsed && (
            <>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs font-semibold text-text-heading">
                  Ankit Tripathi
                </span>
                <span className="truncate text-[10px] text-text-muted">
                  Pro Plan
                </span>
              </div>
              <Settings
                size={15}
                className={isSettings ? "text-accent" : "text-text-muted"}
              />
            </>
          )}
        </button>
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-surface-raised text-text-muted shadow-elev-1 transition-all hover:border-border-accent hover:text-accent"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
