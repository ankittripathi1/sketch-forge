import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeSelector } from "@/theme/ThemeSelector";
import { HomeBody, HomeHero, ScrollProgress } from "@/features/home";

export const metadata: Metadata = {
  title: "Sketch Forge - Make technical ideas visible",
  description:
    "A visual-first technical notebook for diagrams, code, rough notes, and the ideas that need more room than a document.",
};

const NAV = [
  ["Who it's for", "#who"],
  ["Flow", "#flow"],
  ["Tools", "#tools"],
  ["FAQ", "#faq"],
] as const;

export default function Home() {
  return (
    <div className="home-shell relative min-h-dvh overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-80 focus:rounded-full focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text-primary focus:shadow-elev-2"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <Masthead />
      <HomeHero />
      <HomeBody />
      <Footer />
    </div>
  );
}

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="home-brand-mark">
        <span />
      </span>
      <span className="whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.035em] text-text-heading">
        Sketch Forge
      </span>
    </span>
  );
}

function Masthead() {
  return (
    <header className="home-masthead sticky top-0 z-40">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-5 md:px-8">
        <Link href="/" className="rounded-full outline-none">
          <Brand />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              className="home-nav-link whitespace-nowrap text-[13px] font-medium text-text-secondary"
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="home-nav-actions flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="hidden px-2 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
          >
            Dashboard
          </Link>
          <ThemeSelector isCollapsed />
          <Link href="/canvas" className="home-button home-button-small group">
            Open canvas
            <ArrowRight
              size={14}
              strokeWidth={1.8}
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="px-5 pb-8 pt-20 md:px-8 md:pb-10 md:pt-28">
      <div className="home-footer mx-auto max-w-[1380px]">
        <div className="grid gap-14 px-6 py-10 sm:px-9 md:grid-cols-[1.4fr_0.6fr] md:items-end md:px-12 md:py-12">
          <div>
            <Brand />
            <p className="mt-5 max-w-[36ch] text-[14px] leading-7 text-text-secondary">
              A visual notebook for technical ideas that deserve space to move.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-text-secondary md:justify-end">
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
      </div>
    </footer>
  );
}
