"use client";

import { useEffect } from "react";
import { Sidebar, CommandPalette } from "@/features/dashboard";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isCollapsed = useDashboardUiStore((state) => state.sidebarCollapsed);
  const isPaletteOpen = useDashboardUiStore(
    (state) => state.commandPaletteOpen,
  );
  const toggleCollapse = useDashboardUiStore((state) => state.toggleSidebar);
  const togglePalette = useDashboardUiStore(
    (state) => state.toggleCommandPalette,
  );
  const setPaletteOpen = useDashboardUiStore(
    (state) => state.setCommandPaletteOpen,
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePalette]);

  return (
    <div className="dashboard-shell grain flex h-dvh w-screen overflow-hidden bg-surface-base text-text-body">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggleCollapse}
        onSearchOpen={() => setPaletteOpen(true)}
      />
      <main className="dashboard-main relative flex-1 overflow-auto">
        {children}
      </main>
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
