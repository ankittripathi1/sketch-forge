"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ViewMode = "grid" | "list";
type DraggingPage = { id: string; folderId: string | null };

type DashboardUiState = {
  sidebarCollapsed: boolean;
  rootViewMode: ViewMode;
  folderViewMode: ViewMode;
  commandPaletteOpen: boolean;
  draggingPage: DraggingPage | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  setRootViewMode: (value: ViewMode) => void;
  setFolderViewMode: (value: ViewMode) => void;
  setCommandPaletteOpen: (value: boolean) => void;
  toggleCommandPalette: () => void;
  setDraggingPage: (page: DraggingPage | null) => void;
};

export const useDashboardUiStore = create<DashboardUiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      rootViewMode: "grid",
      folderViewMode: "grid",
      commandPaletteOpen: false,
      draggingPage: null,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setRootViewMode: (rootViewMode) => set({ rootViewMode }),
      setFolderViewMode: (folderViewMode) => set({ folderViewMode }),
      setCommandPaletteOpen: (commandPaletteOpen) =>
        set({ commandPaletteOpen }),
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
      setDraggingPage: (draggingPage) => set({ draggingPage }),
    }),
    {
      name: "sketch-forge-dashboard-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        rootViewMode: state.rootViewMode,
        folderViewMode: state.folderViewMode,
      }),
    },
  ),
);
