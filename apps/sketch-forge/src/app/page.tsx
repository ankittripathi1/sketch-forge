import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { ThemeSelector } from "@/theme/ThemeSelector";
import { HomeHero, HomeBody, ScrollProgress } from "@/features/home";

export const metadata: Metadata = {
  title: "Sketch Forge - The canvas notebook for engineers",
  description:
    "An infinite canvas for system diagrams, lecture notes, algorithm traces, and the rough engineering thinking that never fits in a text file.",
};

const NAV = [
  ["01", "Who it's for", "#who"],
  ["02", "Flow", "#flow"],
  ["03", "Tools", "#tools"],
  ["04", "FAQ", "#faq"],
] as const;

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-surface-base text-text-primary grain">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-80 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-primary focus:shadow-elev-2"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <Masthead />
      <HomeHero />
      <HomeBody />
      <TitleBlockFooter />
    </div>
  );
}

function Masthead() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-base/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-330 items-center justify-between gap-5 px-5">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-lg outline-none"
        >
          <Logomark />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-text-heading">
            Sketch Forge
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted lg:inline">
            nb-001
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex items-center gap-0.5 text-[13px] text-text-secondary"
        >
          {NAV.map(([no, label, href]) => (
            <Link
              key={href}
              href={href}
              className="hidden items-baseline gap-1.5 rounded-lg px-3 py-2 transition-colors hover:text-text-primary md:inline-flex"
            >
              <span className="font-mono text-[10px] text-text-muted">
                {no}
              </span>
              {label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="hidden rounded-lg px-3 py-2 transition-colors hover:text-text-primary lg:inline-flex"
          >
            Dashboard
          </Link>
          <ThemeSelector isCollapsed />
          <Link
            href="/canvas"
            className="ml-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-accent-text transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
          >
            Open canvas
            <ArrowUpRight size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Logomark() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-border-default bg-surface-raised shadow-elev-1"
    >
      <span className="absolute inset-0 bg-gradient-mesh opacity-80" />
      <svg
        viewBox="0 0 24 24"
        className="relative h-4.5 w-4.5 text-text-heading"
        fill="none"
      >
        <path
          d="M4 17.5C7.2 13.6 10.4 20.4 13.8 15.5C16.2 12 18.3 17 20 13.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.9"
        />
        <circle cx="19.8" cy="13.2" r="1.45" fill="var(--color-accent)" />
      </svg>
    </span>
  );
}

function TitleBlockFooter() {
  return (
    <footer className="px-5 pb-10 pt-4">
      <div className="mx-auto max-w-330">
        <div className="overflow-hidden rounded-sm border border-border-strong">
          <div className="grid grid-cols-2 gap-px bg-border-strong md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <Cell label="project" className="col-span-2 md:col-span-1">
              <span className="inline-flex items-center gap-2.5">
                <Logomark />
                <span className="text-[14px] font-semibold tracking-[-0.01em] text-text-heading">
                  Sketch Forge — canvas notebook
                </span>
              </span>
            </Cell>
            <Cell label="sheet">01 of 01</Cell>
            <Cell label="scale">1 : ∞</Cell>
            <Cell label="rev">v0.9 — public beta</Cell>

            <Cell label="drawn by">you</Cell>
            <Cell label="checked by">nobody — it&apos;s your notebook</Cell>
            <Cell label="date">2026</Cell>
            <Cell label="index">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                <Link href="/canvas" className="link-underline-draw">
                  Canvas
                </Link>
                <Link href="/dashboard" className="link-underline-draw">
                  Dashboard
                </Link>
                <Link href="/login" className="link-underline-draw">
                  Sign in
                </Link>
              </span>
            </Cell>
          </div>
        </div>
        <p className="mt-4 font-mono text-[11px] text-text-muted">
          © 2026 Sketch Forge · all sketches remain the property of their
          thinker
        </p>
      </div>
    </footer>
  );
}

function Cell({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface-base px-4 py-3.5 ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
      <div className="mt-1.5 text-[13px] font-medium text-text-primary">
        {children}
      </div>
    </div>
  );
}
