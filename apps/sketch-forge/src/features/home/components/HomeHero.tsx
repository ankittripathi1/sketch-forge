"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Transition,
} from "motion/react";
import { useRef, type ReactNode } from "react";
import { useAppTheme } from "@/theme/ThemeProvider";

const spring: Transition = { type: "spring", duration: 0.8, bounce: 0 };

export function HomeHero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { resolvedTheme, mounted } = useAppTheme();

  const isDark = mounted && resolvedTheme === "dark";
  const screenshotSrc = isDark ? "/canvas-dark.png" : "/canvas-light.png";

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const figureY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -48]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-b border-border-subtle"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-paper-grid"
        style={{
          maskImage:
            "radial-gradient(120% 90% at 30% 0%, black 30%, transparent 78%)",
        }}
      />

      <div className="relative mx-auto max-w-[1320px] px-5 pb-16 pt-16 md:pb-24 md:pt-24">
        <div className="max-w-[980px]">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            a canvas notebook for technical minds
          </motion.p>

          <h1 className="font-display mt-7 text-[clamp(2.9rem,7.2vw,6rem)] font-semibold leading-[0.98] tracking-[-0.01em] text-text-heading">
            <RiseLine delay={0.05}>
              Notes for{" "}
              <span className="relative inline-block">
                engineers
                <span
                  aria-hidden
                  className="font-handwriting absolute -top-7 right-0 hidden rotate-[-3deg] whitespace-nowrap text-[16px] font-normal normal-case tracking-normal text-accent lg:block"
                >
                  (that&apos;s you)
                </span>
              </span>
            </RiseLine>
            <RiseLine delay={0.18}>
              who think in <CircledWord reduce={!!reduce}>diagrams</CircledWord>
            </RiseLine>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.4 }}
            className="mt-7 max-w-[54ch] text-[16px] leading-8 text-text-body md:text-[17px]"
          >
            System designs, lecture notes, algorithm traces, whiteboard rounds
            — on an infinite canvas that keeps up with your hand. Draw it
            rough, beautify it when it matters, export it into the doc.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.5 }}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4"
          >
            <Link
              href="/canvas"
              className="group inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[14px] font-semibold text-accent-text transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
            >
              Start sketching
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border-default bg-surface-raised/70 px-5 text-[14px] font-semibold text-text-primary transition-all duration-150 hover:-translate-y-0.5 hover:bg-surface-hover active:translate-y-0 active:scale-[0.98]"
            >
              View dashboard
            </Link>
            <Link
              href="#flow"
              className="link-underline-draw inline-flex items-center gap-1.5 text-[14px] font-semibold text-text-secondary"
            >
              See the flow
              <ArrowDown size={14} />
            </Link>
          </motion.div>

          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-5 font-mono text-[11px] text-text-muted"
          >
            free in beta · no account needed · offline-first
          </motion.p>
        </div>

        <motion.figure
          style={{ y: figureY }}
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.45 }}
          className="relative mx-auto mt-20 max-w-[1100px]"
        >
          <DimensionLine label="∞ — the canvas does not end" />

          <div className="relative mt-4">
            <RegMark className="-left-2.5 -top-2.5" />
            <RegMark className="-right-2.5 -top-2.5" />
            <RegMark className="-bottom-2.5 -left-2.5" />
            <RegMark className="-bottom-2.5 -right-2.5" />

            <div className="overflow-hidden rounded-sm border border-border-strong bg-surface-raised shadow-elev-3">
              <Image
                src={screenshotSrc}
                alt="The Sketch Forge canvas with a hand-drawn system diagram, shape tools, and pages sidebar"
                width={2560}
                height={1368}
                className="block h-auto w-full"
                priority
                unoptimized
              />
            </div>

            <div
              aria-hidden
              className="font-handwriting absolute left-[54%] top-[16%] hidden w-44 rotate-2 text-[15px] leading-6 text-accent xl:block"
            >
              11:40pm — the rate limiter finally made sense here
            </div>
          </div>

          <figcaption className="mt-3.5 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[11px] text-text-muted">
            <span>
              <span className="text-accent">fig. 01</span> — the canvas. light
              &amp; dark, same notebook.
            </span>
            <span>sketch-forge / canvas</span>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}

function RiseLine({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      className="block pb-[0.08em] pt-[0.04em]"
    >
      {children}
    </motion.span>
  );
}

function CircledWord({
  children,
  reduce,
}: {
  children: ReactNode;
  reduce: boolean;
}) {
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 320 120"
        fill="none"
        preserveAspectRatio="none"
        className="pointer-events-none absolute left-[-8%] top-[-14%] h-[130%] w-[118%]"
      >
        <motion.path
          d="M18,64 C22,26 148,10 248,18 C304,24 312,52 296,76 C272,106 92,116 38,96 C12,86 10,76 18,64"
          stroke="var(--color-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 1.05, ease: "easeInOut" }}
        />
      </svg>
    </span>
  );
}

function DimensionLine({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted"
    >
      <span className="h-3 w-px bg-border-strong" />
      <span className="h-px flex-1 bg-border-strong" />
      <span className="shrink-0">{label}</span>
      <span className="h-px flex-1 bg-border-strong" />
      <span className="h-3 w-px bg-border-strong" />
    </div>
  );
}

function RegMark({ className }: { className: string }) {
  return (
    <span aria-hidden className={`absolute z-10 h-5 w-5 ${className}`}>
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border-strong" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border-strong" />
    </span>
  );
}
