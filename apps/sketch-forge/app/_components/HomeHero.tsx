"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Transition,
} from "motion/react";
import { useRef } from "react";

const serif = { fontFamily: "Spectral, 'Iowan Old Style', Georgia, serif" };
const hand = { fontFamily: "Kalam, cursive" };

const rise: Transition = { type: "spring", duration: 0.85, bounce: 0.18 };

export function HomeHero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const parallaxOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  const fade = (delay: number) =>
    reduce
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { ...rise, delay },
        };

  return (
    <section ref={sectionRef} className="relative">
      {/* Top rail */}
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          {...fade(0)}
          className="flex items-baseline justify-between border-b border-border-default py-4 text-[11px] uppercase tracking-[0.22em] text-text-muted"
        >
          <span>Issue №01 — A field guide</span>
          <span className="hidden md:inline">Thinking · drawing · keeping</span>
          <span>For any device</span>
        </motion.div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-8 px-6 pb-28 pt-14 md:gap-12 md:pt-20 lg:pt-24">
        {/* Left: tight copy */}
        <motion.div
          style={{ y: parallaxY, opacity: parallaxOpacity }}
          className="col-span-12 flex flex-col justify-center lg:col-span-6"
        >
          {/* Badge */}
          <motion.div {...fade(0.04)} className="mb-8">
            <span className="group inline-flex items-center gap-2 rounded-full border border-border-accent bg-accent-subtle px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-accent backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Now in open beta
              <Sparkles size={11} strokeWidth={1.6} />
            </span>
          </motion.div>

          <motion.h1
            {...fade(0.16)}
            className="text-text-heading"
            style={{
              ...serif,
              fontSize: "clamp(56px, 9vw, 124px)",
              lineHeight: 0.94,
              letterSpacing: "-0.032em",
              fontWeight: 300,
            }}
          >
            Think with
            <br />
            <em
              className="text-gradient-brand"
              style={{ fontWeight: 400, fontStyle: "italic" }}
            >
              your hands.
            </em>
          </motion.h1>

          <motion.p
            {...fade(0.28)}
            className="mt-8 max-w-[46ch] text-[17px] leading-[1.7] text-text-body"
            style={{ ...serif, fontWeight: 400 }}
          >
            Sketch diagrams, drop notes, connect ideas — on one page that
            never runs out. Works on your phone, tablet, and laptop, with
            touch, stylus, or keyboard.
          </motion.p>

          <motion.div
            {...fade(0.38)}
            className="mt-10 flex flex-wrap items-center gap-5"
          >
            <motion.div whileTap={reduce ? undefined : { scale: 0.97 }}>
              <Link
                href="/canvas"
                className="group inline-flex items-center gap-3 rounded-full bg-text-heading px-7 py-4 text-[14px] font-medium text-surface-base shadow-elev-2 transition-shadow hover:shadow-elev-3"
                style={serif}
              >
                Open the canvas
                <ArrowRight
                  size={15}
                  strokeWidth={2}
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                />
              </Link>
            </motion.div>
            <motion.div whileTap={reduce ? undefined : { scale: 0.97 }}>
              <Link
                href="/dashboard"
                className="link-underline-on inline-flex items-center gap-1.5 pb-0.5 text-[14px] text-text-secondary hover:text-text-heading"
                style={serif}
              >
                Browse the dashboard
              </Link>
            </motion.div>
          </motion.div>

          {/* Inline social proof */}
          <motion.div
            {...fade(0.48)}
            className="mt-10 flex items-center gap-4 text-[12px] text-text-muted"
          >
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="inline-block h-7 w-7 rounded-full border border-border-default bg-gradient-brand"
                  style={{ opacity: 0.7 - i * 0.1 }}
                />
              ))}
            </div>
            <span>
              <strong className="text-text-primary">2,400+</strong> thinkers
              sketching this week
            </span>
          </motion.div>
        </motion.div>

        {/* Right: live drawing loop on a paper surface */}
        <motion.div
          {...fade(0.22)}
          className="col-span-12 lg:col-span-6"
        >
          <DrawingLoop reduce={!!reduce} />
        </motion.div>
      </div>

      {/* Trusted-by marquee */}
      <Marquee />
    </section>
  );
}

/* ─── Marquee ─────────────────────────────────────────────────────────────── */
function Marquee() {
  const items = [
    "Pixel · Android",
    "iPad · Apple Pencil",
    "MacBook · trackpad",
    "Surface · stylus",
    "Phone · finger",
    "ChromeOS · touch",
    "Windows · mouse",
    "Linux · keyboard",
  ];
  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-y border-border-default bg-surface-raised/40 py-5"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-surface-base to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-surface-base to-transparent" />
      <div className="marquee-track flex w-max items-center gap-12 text-[12px] uppercase tracking-[0.22em] text-text-muted">
        {[...items, ...items].map((label, i) => (
          <span key={i} className="inline-flex items-center gap-3">
            <span className="h-1 w-1 rounded-full bg-accent/70" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Drawing loop — premium paper card with depth ──────────────────────── */
const LOOP = 11;

function DrawingLoop({ reduce }: { reduce: boolean }) {
  const draw = (start: number, drawDur: number, holdUntil: number) => {
    if (reduce) return { initial: { pathLength: 1, opacity: 1 } };
    const t0 = start / LOOP;
    const t1 = (start + drawDur) / LOOP;
    const t2 = holdUntil / LOOP;
    const t3 = (holdUntil + 0.6) / LOOP;
    return {
      initial: { pathLength: 0, opacity: 0 },
      animate: {
        pathLength: [0, 0, 1, 1, 0],
        opacity: [0, 1, 1, 1, 0],
      },
      transition: {
        duration: LOOP,
        times: [0, t0, t1, t2, t3],
        repeat: Infinity,
        ease: "linear" as const,
      },
    };
  };

  const fadeStep = (start: number, holdUntil: number) => {
    if (reduce) return { initial: { opacity: 1 } };
    const t0 = start / LOOP;
    const t1 = (start + 0.25) / LOOP;
    const t2 = holdUntil / LOOP;
    const t3 = (holdUntil + 0.6) / LOOP;
    return {
      initial: { opacity: 0 },
      animate: { opacity: [0, 0, 1, 1, 0] },
      transition: {
        duration: LOOP,
        times: [0, t0, t1, t2, t3],
        repeat: Infinity,
        ease: "linear" as const,
      },
    };
  };

  const eraser = reduce
    ? { initial: { opacity: 0 } }
    : {
        initial: { x: -60, opacity: 0 },
        animate: {
          x: [-60, -60, 360, 360, -60],
          opacity: [0, 0, 1, 0, 0],
        },
        transition: {
          duration: LOOP,
          times: [0, 7.4 / LOOP, 8.6 / LOOP, 9.0 / LOOP, 9.6 / LOOP],
          repeat: Infinity,
          ease: "linear" as const,
        },
      };

  return (
    <div className="relative">
      {/* layered paper stack — bottom ghosts give depth */}
      <div
        aria-hidden
        className="absolute -inset-3 -z-10 rounded-md border border-border-subtle bg-surface-raised/40 shadow-elev-2"
        style={{ transform: "rotate(-1.4deg)" }}
      />
      <div
        aria-hidden
        className="absolute -inset-1.5 -z-10 rounded-md border border-border-default bg-surface-raised/80 shadow-elev-1"
        style={{ transform: "rotate(0.8deg)" }}
      />

      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-md border border-border-default bg-surface-paper bg-paper-grid shadow-elev-3">
        <CropMarks />

        {/* glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        />

        {/* tiny floating toolbar */}
        <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border-default bg-surface-base/85 px-2 py-1.5 text-text-muted shadow-elev-2 backdrop-blur-md">
          {["▢", "○", "↗", "✎", "T"].map((g, i) => (
            <span
              key={i}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors ${
                i === 3
                  ? "bg-accent text-accent-text shadow-glow-accent"
                  : "hover:bg-surface-hover"
              }`}
              style={hand}
            >
              {g}
            </span>
          ))}
        </div>

        {/* the drawing */}
        <svg
          viewBox="0 0 480 384"
          className="absolute inset-0 h-full w-full"
          fill="none"
        >
          <motion.path
            {...draw(0.4, 0.9, 7.2)}
            d="M 56 100 C 60 96, 196 96, 200 100 C 203 105, 204 188, 200 192 C 196 196, 58 196, 54 192 C 51 187, 53 105, 56 100 Z"
            stroke="var(--color-text-heading)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <motion.text
            {...fadeStep(1.3, 7.2)}
            x="128"
            y="148"
            textAnchor="middle"
            style={{ ...hand, fontSize: "20px", fill: "var(--color-text-heading)" }}
          >
            User auth
          </motion.text>
          <motion.text
            {...fadeStep(1.6, 7.2)}
            x="128"
            y="172"
            textAnchor="middle"
            style={{ ...hand, fontSize: "14px", fill: "var(--color-text-secondary)" }}
          >
            login · signup
          </motion.text>

          <motion.path
            {...draw(2.0, 0.5, 7.2)}
            d="M 204 146 C 232 146, 256 142, 282 138"
            stroke="var(--color-text-heading)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <motion.path
            {...draw(2.5, 0.25, 7.2)}
            d="M 273 130 L 285 138 L 274 146"
            stroke="var(--color-text-heading)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <motion.path
            {...draw(2.8, 0.9, 7.2)}
            d="M 296 108 C 300 86, 412 84, 416 108 C 420 132, 416 172, 400 178 C 374 184, 296 180, 294 158 C 291 140, 294 124, 296 108 Z"
            stroke="var(--color-text-heading)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <motion.text
            {...fadeStep(3.7, 7.2)}
            x="355"
            y="146"
            textAnchor="middle"
            style={{ ...hand, fontSize: "20px", fill: "var(--color-text-heading)" }}
          >
            Dashboard
          </motion.text>

          <motion.path
            {...draw(4.2, 0.6, 7.2)}
            d="M 62 240 C 88 234, 112 248, 138 240 C 164 232, 188 248, 214 240"
            stroke="var(--color-accent)"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.5"
          />
          <motion.text
            {...fadeStep(4.5, 7.2)}
            x="138"
            y="246"
            textAnchor="middle"
            style={{ ...hand, fontSize: "17px", fill: "var(--color-text-heading)" }}
          >
            ship by friday
          </motion.text>

          <motion.g {...fadeStep(5.2, 7.2)}>
            <rect
              x="282"
              y="216"
              width="146"
              height="106"
              fill="var(--color-accent)"
              opacity="0.92"
              transform="rotate(2.5 355 269)"
            />
            <text
              x="297"
              y="244"
              transform="rotate(2.5 355 269)"
              style={{ ...hand, fontSize: "14px", fill: "var(--color-accent-text)" }}
            >
              todo
            </text>
            <text
              x="297"
              y="268"
              transform="rotate(2.5 355 269)"
              style={{ ...hand, fontSize: "13px", fill: "var(--color-accent-text)" }}
            >
              · refresh token
            </text>
            <text
              x="297"
              y="288"
              transform="rotate(2.5 355 269)"
              style={{ ...hand, fontSize: "13px", fill: "var(--color-accent-text)" }}
            >
              · rate limit
            </text>
            <text
              x="297"
              y="308"
              transform="rotate(2.5 355 269)"
              style={{ ...hand, fontSize: "13px", fill: "var(--color-accent-text)" }}
            >
              · oauth callback
            </text>
          </motion.g>

          <motion.path
            {...draw(6.0, 0.4, 7.2)}
            d="M 130 198 C 150 220, 220 230, 282 248"
            stroke="var(--color-text-secondary)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray="3 4"
          />

          <motion.g {...eraser}>
            <rect
              x="0"
              y="60"
              width="60"
              height="280"
              fill="var(--color-surface-paper)"
              opacity="0.95"
            />
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="340"
              stroke="var(--color-text-muted)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          </motion.g>
        </svg>

        <p
          className="absolute bottom-3 left-4 z-20 text-[13px] text-text-muted"
          style={hand}
        >
          ↳ a working page · auth flow
        </p>

        <LiveCursor reduce={reduce} />
      </div>
    </div>
  );
}

function CropMarks() {
  const base = "pointer-events-none absolute h-3 w-3 border-text-muted/60";
  return (
    <>
      <span className={`${base} left-1 top-1 border-l border-t`} />
      <span className={`${base} right-1 top-1 border-r border-t`} />
      <span className={`${base} bottom-1 left-1 border-b border-l`} />
      <span className={`${base} bottom-1 right-1 border-b border-r`} />
    </>
  );
}

function LiveCursor({ reduce }: { reduce: boolean }) {
  if (reduce) return null;
  const path = [
    { t: 0.4, x: 12, y: 32 },
    { t: 1.3, x: 28, y: 40 },
    { t: 2.0, x: 42, y: 38 },
    { t: 2.8, x: 56, y: 32 },
    { t: 3.7, x: 72, y: 38 },
    { t: 4.2, x: 14, y: 62 },
    { t: 4.8, x: 30, y: 62 },
    { t: 5.2, x: 72, y: 68 },
    { t: 6.0, x: 50, y: 56 },
    { t: 7.2, x: 50, y: 56 },
    { t: 8.6, x: 92, y: 88 },
  ];
  const times = path.map((p) => p.t / LOOP);
  return (
    <motion.div
      className="pointer-events-none absolute z-10 -translate-x-1 -translate-y-1"
      initial={{ left: `${path[0]!.x}%`, top: `${path[0]!.y}%`, opacity: 0 }}
      animate={{
        left: path.map((p) => `${p.x}%`),
        top: path.map((p) => `${p.y}%`),
        opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      }}
      transition={{
        duration: LOOP,
        times,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
        <path
          d="M 1 1 L 1 14 L 5 10 L 8 16 L 10 15 L 7 9 L 12 9 Z"
          fill="var(--color-text-heading)"
          stroke="var(--color-surface-base)"
          strokeWidth="1"
        />
      </svg>
    </motion.div>
  );
}
