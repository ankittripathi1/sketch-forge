"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Sidebar, CommandPalette } from "@/features/dashboard";
import { useDashboardUiStore } from "@/stores/dashboardUiStore";

gsap.registerPlugin(useGSAP);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
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
  const setSidebarCollapsed = useDashboardUiStore(
    (state) => state.setSidebarCollapsed,
  );

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".dashboard-sidebar", {
            x: -24,
            autoAlpha: 0,
            duration: 0.6,
          })
          .from(
            ".dashboard-main",
            { y: 18, autoAlpha: 0, duration: 0.65 },
            "<0.1",
          );
      });

      return () => media.revert();
    },
    { scope: shellRef },
  );

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setSidebarCollapsed(true);
    }
  }, [setSidebarCollapsed]);

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
    <div
      ref={shellRef}
      className="dashboard-shell flex h-dvh w-screen overflow-hidden bg-surface-base text-text-body"
    >
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-80 focus:rounded-full focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-primary focus:shadow-elev-2"
      >
        Skip to library
      </a>
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggleCollapse}
        onSearchOpen={() => setPaletteOpen(true)}
      />
      <main
        id="dashboard-content"
        className="dashboard-main relative flex-1 overflow-auto"
      >
        {children}
      </main>
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
