import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { ThemeSelector } from "../components/theme-selector";
import { HomeHero } from "./_components/HomeHero";
import { HomeBody } from "./_components/HomeBody";
import { ScrollProgress } from "./_components/ScrollProgress";

export const metadata: Metadata = {
  title: "Sketch Forge — Think with your hands",
  description:
    "An infinite canvas for sketching diagrams and writing notes — touch-first, keyboard-fluent, screen-agnostic. A field guide to thinking on paper, on any device.",
};

const serif = { fontFamily: "Spectral, 'Iowan Old Style', Georgia, serif" };
const hand = { fontFamily: "Kalam, cursive" };

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-surface-base text-text-primary grain">
      <AuroraBackdrop />
      <ScrollProgress />
      <Masthead />
      <HomeHero />
      <HomeBody />
      <Colophon />
    </div>
  );
}

/* ─── Aurora backdrop — fixed, blurred gradient orbs ─────────────────────── */
function AuroraBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-paper-dots opacity-60" />
      <div className="aurora absolute inset-[-20%]" />
    </div>
  );
}

/* ─── Masthead — glassmorphic, sticky ────────────────────────────────────── */
function Masthead() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-surface-base/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5">
        <Link href="/" className="group flex items-center gap-3">
          <Logomark />
          <span
            className="text-[20px] font-medium italic leading-none text-text-heading"
            style={serif}
          >
            Sketch Forge
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-text-muted md:inline">
            est. 2026
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-[12px] uppercase tracking-[0.14em] text-text-secondary">
          <Link
            href="#features"
            className="hidden px-3 py-2 transition-colors hover:text-text-primary md:inline"
          >
            Features
          </Link>
          <Link
            href="#how"
            className="hidden px-3 py-2 transition-colors hover:text-text-primary md:inline"
          >
            How
          </Link>
          <Link
            href="#faq"
            className="hidden px-3 py-2 transition-colors hover:text-text-primary md:inline"
          >
            FAQ
          </Link>
          <Link
            href="/dashboard"
            className="hidden px-3 py-2 transition-colors hover:text-text-primary lg:inline"
          >
            Dashboard
          </Link>
          <span className="mx-2 hidden h-3 w-px bg-border-default md:inline-block" />
          <ThemeSelector isCollapsed />
          <Link
            href="/canvas"
            className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[12px] font-medium normal-case tracking-normal text-accent-text shadow-glow-accent transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
            style={serif}
          >
            Open canvas
            <ArrowUpRight size={13} strokeWidth={2} />
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
      className="relative inline-flex h-7 w-7 items-center justify-center"
    >
      <span className="absolute inset-0 rounded-md bg-gradient-brand" />
      <span className="absolute inset-[2px] rounded-[4px] bg-surface-base/85" />
      <svg
        viewBox="0 0 24 24"
        className="relative h-4 w-4 text-text-heading"
        fill="none"
      >
        <path
          d="M 4 18 C 8 14, 10 22, 14 16 C 17 12, 19 18, 20 14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="20" cy="14" r="1.5" fill="var(--color-accent)" />
      </svg>
    </span>
  );
}

/* ─── Colophon (footer) ──────────────────────────────────────────────────── */
function Colophon() {
  return (
    <footer className="relative border-t border-border-default">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-12 gap-8 text-[13px] text-text-muted">
          <div className="col-span-12 md:col-span-5">
            <p
              className="mb-2 text-[24px] italic leading-none text-text-heading"
              style={serif}
            >
              Sketch Forge
            </p>
            <p className="max-w-[40ch] text-text-body" style={{ ...serif }}>
              An infinite canvas for thinking on paper — on any device. Made
              with care, by hand.
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.22em]">
              © 2026 — vol. 01
            </p>
          </div>

          <div className="col-span-6 md:col-span-2">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-text-dim">
              Pages
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/canvas" className="link-underline-on hover:text-text-primary">
                  Canvas
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="link-underline-on hover:text-text-primary">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="link-underline-on hover:text-text-primary">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-6 md:col-span-2">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-text-dim">
              Read
            </p>
            <ul className="space-y-2">
              <li><a className="link-underline-on hover:text-text-primary" href="#features">Features</a></li>
              <li><a className="link-underline-on hover:text-text-primary" href="#how">How it works</a></li>
              <li><a className="link-underline-on hover:text-text-primary" href="#faq">FAQ</a></li>
            </ul>
          </div>

          <div className="col-span-12 md:col-span-3">
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-text-dim">
              Set in
            </p>
            <ul className="space-y-2">
              <li style={serif}>Spectral — display &amp; body</li>
              <li>Geist — labels &amp; UI</li>
              <li style={hand}>Kalam — marginalia</li>
            </ul>
          </div>
        </div>
      </div>

      {/* huge wordmark */}
      <div
        aria-hidden
        className="select-none overflow-hidden border-t border-border-default px-6 py-12"
      >
        <p
          className="mx-auto max-w-7xl bg-gradient-brand bg-clip-text text-center text-[clamp(72px,16vw,260px)] font-light italic leading-[0.85] tracking-[-0.04em] text-transparent opacity-90"
          style={serif}
        >
          Sketch Forge
        </p>
      </div>
    </footer>
  );
}
