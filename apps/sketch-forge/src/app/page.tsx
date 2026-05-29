import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { ThemeSelector } from "@/theme/ThemeSelector";
import { HomeHero, HomeBody, ScrollProgress } from "@/features/home";

export const metadata: Metadata = {
  title: "Sketch Forge - Think on an infinite canvas",
  description:
    "Sketch Forge is a clean canvas-first notebook for diagrams, handwritten notes, study pages, and visual planning.",
};

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-surface-base text-text-primary grain">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-primary focus:shadow-elev-2"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <Masthead />
      <HomeHero />
      <HomeBody />
      <Colophon />
    </div>
  );
}

function Masthead() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-base/82 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3.5">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-lg outline-none"
        >
          <Logomark />
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-text-heading">
            Sketch Forge
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex items-center gap-1 text-sm text-text-secondary"
        >
          <Link
            href="#features"
            className="hidden rounded-lg px-3 py-2 transition-colors hover:text-text-primary md:inline-flex"
          >
            Features
          </Link>
          <Link
            href="#how"
            className="hidden rounded-lg px-3 py-2 transition-colors hover:text-text-primary md:inline-flex"
          >
            Flow
          </Link>
          <Link
            href="#faq"
            className="hidden rounded-lg px-3 py-2 transition-colors hover:text-text-primary md:inline-flex"
          >
            FAQ
          </Link>
          <Link
            href="/dashboard"
            className="hidden rounded-lg px-3 py-2 transition-colors hover:text-text-primary lg:inline-flex"
          >
            Dashboard
          </Link>
          <ThemeSelector isCollapsed />
          <Link
            href="/canvas"
            className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-text transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
          >
            Canvas
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
        className="relative h-[18px] w-[18px] text-text-heading"
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

function Colophon() {
  const links = [
    ["Canvas", "/canvas"],
    ["Dashboard", "/dashboard"],
    ["Sign in", "/login"],
    ["Features", "#features"],
    ["FAQ", "#faq"],
  ] as const;

  return (
    <footer className="border-t border-border-default px-5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 py-14 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <Logomark />
            <p className="text-lg font-semibold tracking-[-0.02em] text-text-heading">
              Sketch Forge
            </p>
          </div>
          <p className="max-w-[48ch] text-sm leading-7 text-text-body">
            A canvas-first notebook for drawing, thinking, and organizing ideas
            without making early work feel too polished.
          </p>
          <p className="mt-6 font-mono text-xs text-text-muted">
            2026 - Sketch Forge
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-3 text-sm text-text-secondary sm:grid-cols-3 md:justify-self-end"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-1 py-1 transition-colors hover:text-text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
