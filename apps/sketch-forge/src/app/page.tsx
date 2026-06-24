import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ThemeSelector } from "@/theme/ThemeSelector";
import { Logo } from "@/components/Logo";
import { HomeHero, HomeBody, ScrollProgress } from "@/features/home";

export const metadata: Metadata = {
  title: "Sketch Forge - The canvas notebook for engineers",
  description:
    "An infinite canvas for system diagrams, lecture notes, algorithm traces, and the rough engineering thinking that never fits in a text file.",
};

const NAV = [
  ["Inside", "#inside"],
  ["Tools", "#tools"],
  ["Flow", "#flow"],
] as const;

export default function Home() {
  return (
    <div className="home-shell relative min-h-dvh overflow-x-clip bg-surface-base text-text-primary grain">
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
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-base/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1380px] items-center justify-between gap-6 px-5 md:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-lg outline-none"
        >
          <Logo size={35} rounded="rounded-[10px]" />
          <span className="font-display text-[18px] font-semibold tracking-[-0.035em] text-text-heading">
            Sketch Forge
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="hidden px-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
          >
            Dashboard
          </Link>
          <ThemeSelector isCollapsed />
          <Link
            href="/canvas"
            className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-text transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
          >
            Open canvas
            <ArrowRight
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
    <footer className="px-5 pb-10 pt-12 md:px-8">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-8 border-t border-border-subtle pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2.5">
          <Logo size={30} rounded="rounded-[9px]" />
          <span className="font-display text-[16px] font-semibold tracking-[-0.03em] text-text-heading">
            Sketch Forge
          </span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-secondary">
          <Link href="/canvas" className="hover:text-text-primary">
            Canvas
          </Link>
          <Link href="/dashboard" className="hover:text-text-primary">
            Dashboard
          </Link>
          <Link href="/login" className="hover:text-text-primary">
            Sign in
          </Link>
          <span>© 2026</span>
        </div>
      </div>
    </footer>
  );
}
