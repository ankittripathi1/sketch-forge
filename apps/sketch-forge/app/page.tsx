import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { ThemeSelector } from "../components/theme-selector";
import { HomeHero } from "./_components/HomeHero";
import { HomeBody } from "./_components/HomeBody";

export const metadata: Metadata = {
  title: "Sketch Forge — Think with your hands",
  description:
    "An infinite canvas for sketching diagrams and taking notes. A field guide to thinking on paper, on any device.",
};

const serif = { fontFamily: "Spectral, 'Iowan Old Style', Georgia, serif" };
const hand = { fontFamily: "Kalam, cursive" };

export default function Home() {
  return (
    <div
      className="min-h-screen bg-surface-base text-text-primary"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--color-border-faint) 1px, transparent 0)",
        backgroundSize: "28px 28px",
      }}
    >
      <Masthead />
      <HomeHero />
      <HomeBody />
      <Colophon />
    </div>
  );
}

function Masthead() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-surface-base/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span
            className="text-[22px] font-medium italic leading-none text-text-heading"
            style={serif}
          >
            Sketch Forge
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-text-muted sm:inline">
            est. 2026 — vol. 01
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-[12px] uppercase tracking-[0.14em] text-text-secondary">
          <Link
            href="/dashboard"
            className="hidden px-3 py-2 transition-colors hover:text-text-primary sm:inline"
          >
            Dashboard
          </Link>
          <Link
            href="/canvas"
            className="hidden px-3 py-2 transition-colors hover:text-text-primary sm:inline"
          >
            Canvas
          </Link>
          <span className="mx-2 hidden h-3 w-px bg-border-default sm:inline-block" />
          <ThemeSelector isCollapsed />
          <Link
            href="/canvas"
            className="link-underline-on ml-2 inline-flex items-center gap-1.5 pb-0.5 text-[12px] font-medium normal-case tracking-normal text-text-heading transition-transform duration-150 ease-out active:scale-[0.97]"
            style={serif}
          >
            Open the canvas
            <ArrowUpRight size={13} strokeWidth={1.8} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Colophon() {
  return (
    <footer className="border-t border-border-default px-6 py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 text-[12px] text-text-muted">
        <div className="col-span-12 md:col-span-4">
          <p
            className="mb-1 text-[18px] italic text-text-heading"
            style={serif}
          >
            Sketch Forge
          </p>
          <p>An infinite canvas for thinking on paper, on any device.</p>
        </div>

        <div className="col-span-6 md:col-span-3">
          <p className="mb-2 uppercase tracking-[0.18em]">Pages</p>
          <ul className="space-y-1">
            <li>
              <Link href="/canvas" className="hover:text-text-primary">
                Canvas
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-text-primary">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div className="col-span-6 md:col-span-3">
          <p className="mb-2 uppercase tracking-[0.18em]">Set in</p>
          <ul className="space-y-1">
            <li style={serif}>Spectral — display &amp; body</li>
            <li>Geist — labels &amp; UI</li>
            <li style={hand}>Kalam — marginalia</li>
          </ul>
        </div>

        <div className="col-span-12 self-end md:col-span-2 md:text-right">
          <p>© 2026 — vol. 01</p>
          <p>Made by hand.</p>
        </div>
      </div>
    </footer>
  );
}
