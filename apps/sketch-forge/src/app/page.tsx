import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { ThemeSelector } from "@/theme/ThemeSelector";
import { Logo } from "@/components/Logo";
import { HomeHero, HomeBody, ScrollProgress } from "@/features/home";

export const metadata: Metadata = {
  title: "Sketch Forge - The canvas notebook for engineers",
  description:
    "An infinite canvas for system diagrams, lecture notes, algorithm traces, and the rough engineering thinking that never fits in a text file.",
};

const NAV = [
  ["Who it's for", "#who"],
  ["Flow", "#flow"],
  ["Tools", "#tools"],
  ["FAQ", "#faq"],
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
    <header className="sticky top-0 z-40 border-b border-border-strong bg-surface-base/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-330 items-center justify-between gap-6 px-5">
        {/* Brand */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-lg outline-none"
        >
          <Logo size={32} />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-text-heading">
            Sketch Forge
          </span>
        </Link>

        {/* Center nav — blueprint title-block labels */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 md:flex"
        >
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="link-underline-draw font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="link-underline-draw hidden font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-text-primary sm:inline-flex"
          >
            Dashboard
          </Link>
          <span className="hidden h-4 w-px bg-border-strong sm:block" />
          <ThemeSelector isCollapsed />
          <Link
            href="/canvas"
            className="group inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13px] font-semibold text-accent-text transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
          >
            Open canvas
            <ArrowUpRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </header>
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
                <Logo size={28} />
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
