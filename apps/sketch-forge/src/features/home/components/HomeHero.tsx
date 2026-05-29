"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Circle,
  Diamond,
  MousePointer2,
  Pencil,
  Square,
  Type,
} from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Transition,
} from "motion/react";
import { useEffect, useRef } from "react";
import { useAppTheme } from "@/theme/ThemeProvider";

const spring: Transition = { type: "spring", duration: 0.8, bounce: 0.15 };

const HEADLINE = "Sketch the way you think.";

const FLOATING_TOOLS = [
  { Icon: Square, x: "-12%", y: "8%", delay: 0.4, rotate: -8 },
  { Icon: Circle, x: "108%", y: "12%", delay: 0.55, rotate: 12 },
  { Icon: Diamond, x: "-8%", y: "72%", delay: 0.7, rotate: 6 },
  { Icon: Pencil, x: "104%", y: "78%", delay: 0.85, rotate: -10 },
  { Icon: Type, x: "50%", y: "-8%", delay: 1.0, rotate: 0 },
  { Icon: MousePointer2, x: "92%", y: "48%", delay: 1.15, rotate: 8 },
];

export function HomeHero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, mounted } = useAppTheme();

  const isDark = mounted && resolvedTheme === "dark";
  const screenshotSrc = isDark ? "/canvas-dark.png" : "/canvas-light.png";

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const previewY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -64]);
  const previewScale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, reduce ? 1 : 0.94],
  );
  const previewOpacity = useTransform(
    scrollYProgress,
    [0, 1],
    [1, reduce ? 1 : 0.7],
  );

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 90, damping: 18 });
  const smoothY = useSpring(mouseY, { stiffness: 90, damping: 18 });
  const tiltX = useTransform(smoothY, [0, 1], [4, -4]);
  const tiltY = useTransform(smoothX, [0, 1], [-6, 6]);
  const glowX = useTransform(smoothX, (v) => `${v * 100}%`);
  const glowY = useTransform(smoothY, (v) => `${v * 100}%`);
  const glowBg = useMotionTemplate`radial-gradient(60% 60% at ${glowX} ${glowY}, var(--color-accent) 0%, transparent 70%)`;

  useEffect(() => {
    if (reduce) return;
    const el = previewWrapRef.current;
    if (!el) return;
    function onMove(e: PointerEvent) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      mouseX.set((e.clientX - r.left) / r.width);
      mouseY.set((e.clientY - r.top) / r.height);
    }
    function onLeave() {
      mouseX.set(0.5);
      mouseY.set(0.5);
    }
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [mouseX, mouseY, reduce]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden px-6 pb-20 pt-20 md:pb-32 md:pt-28"
    >
      <AnimatedBackdrop />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="group mb-7 inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-raised/70 px-3 py-1 text-[12px] font-medium text-text-secondary backdrop-blur-xl"
        >
          <span className="relative flex h-1.5 w-1.5">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-accent"
              animate={
                reduce
                  ? undefined
                  : { scale: [1, 1.9, 1], opacity: [0.55, 0, 0.55] }
              }
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          v0.9 — public beta is live
          <ArrowRight
            size={12}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </motion.div>

        <h1 className="text-[clamp(2.6rem,6.5vw,5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-text-heading text-balance">
          <AnimatedHeadline text={HEADLINE} reduce={!!reduce} />
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...spring,
            delay: HEADLINE.split(" ").length * 0.07 + 0.1,
          }}
          className="mt-6 max-w-[46ch] text-[15px] leading-7 text-text-secondary md:text-[17px] md:leading-8"
        >
          An infinite canvas built for diagrams, handwritten notes, and the
          rough work that comes{" "}
          <em className="not-italic text-text-primary">before</em> the polish.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...spring,
            delay: HEADLINE.split(" ").length * 0.07 + 0.2,
          }}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/canvas"
            className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-[13.5px] font-semibold text-accent-text transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
          >
            Start drawing
            <motion.span
              className="inline-flex"
              animate={reduce ? undefined : { x: [0, 3, 0] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ArrowRight size={15} />
            </motion.span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border-default bg-surface-raised/60 px-4 text-[13.5px] font-semibold text-text-primary backdrop-blur transition-all duration-150 hover:-translate-y-0.5 hover:bg-surface-hover active:translate-y-0 active:scale-[0.98]"
          >
            View dashboard
          </Link>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-5 font-mono text-[11px] text-text-muted"
        >
          ⌘K to open · ⌘S to save · No account needed to try
        </motion.div>
      </div>

      <motion.div
        ref={previewWrapRef}
        style={{
          y: previewY,
          scale: previewScale,
          opacity: previewOpacity,
          perspective: 1200,
        }}
        initial={reduce ? false : { opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.35 }}
        className="relative mx-auto mt-20 max-w-6xl"
      >
        {FLOATING_TOOLS.map(({ Icon, x, y, delay, rotate }, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, scale: 0.4, rotate }}
            animate={{ opacity: 1, scale: 1, rotate }}
            transition={{ ...spring, delay: 0.4 + delay }}
            className="pointer-events-none absolute z-20 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-border-default bg-surface-raised/95 text-text-primary shadow-elev-3 backdrop-blur-xl md:flex"
            style={{ left: x, top: y }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -5, 0] }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            >
              <Icon size={17} strokeWidth={1.7} />
            </motion.div>
          </motion.div>
        ))}

        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 -inset-y-6 -z-10 rounded-[2.5rem] opacity-60 blur-3xl"
          style={{ background: glowBg }}
        />

        <motion.div
          style={{
            rotateX: tiltX,
            rotateY: tiltY,
            transformStyle: "preserve-3d",
          }}
          className="relative overflow-hidden rounded-xl border border-border-default bg-surface-raised shadow-elev-4"
        >
          <div className="flex h-9 items-center gap-2 border-b border-border-subtle bg-surface-overlay px-3.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
              <span className="h-1 w-1 rounded-full bg-accent" />
              sketch-forge / canvas
            </div>
            <div className="w-10" />
          </div>
          <Image
            src={screenshotSrc}
            alt="Sketch Forge canvas editor"
            width={2560}
            height={1368}
            className="block h-auto w-full"
            priority
            unoptimized
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(115deg, transparent 30%, color-mix(in oklab, white 14%, transparent) 50%, transparent 70%)",
              x: useTransform(smoothX, [0, 1], ["-30%", "30%"]),
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

function AnimatedHeadline({ text, reduce }: { text: string; reduce: boolean }) {
  const words = text.split(" ");
  return (
    <span className="inline-block">
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden pr-[0.22em] align-bottom"
        >
          <motion.span
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ ...spring, delay: 0.05 + i * 0.07 }}
            className="inline-block"
          >
            {word === "think." ? (
              <span className="relative inline-block bg-gradient-to-br from-text-heading via-text-heading to-accent bg-clip-text text-transparent">
                {word}
              </span>
            ) : (
              word
            )}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function AnimatedBackdrop() {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-paper-grid opacity-[0.18]" />
      <motion.div
        className="absolute left-1/2 top-[-12rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
        animate={
          reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }
        }
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10rem] top-[10rem] h-[22rem] w-[22rem] rounded-full bg-accent/10 blur-[100px]"
        animate={reduce ? undefined : { x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-surface-base" />
    </div>
  );
}
