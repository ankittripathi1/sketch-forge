"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";

const serif = { fontFamily: "Spectral, 'Iowan Old Style', Georgia, serif" };
const hand = { fontFamily: "Kalam, cursive" };

const rise: Transition = { type: "spring", duration: 0.75, bounce: 0.18 };

export function HomeHero() {
  const reduce = useReducedMotion();

  const fade = (delay: number) =>
    reduce
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { ...rise, delay },
        };

  return (
    <section className="relative">
      {/* Top rail */}
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          {...fade(0)}
          className="flex items-baseline justify-between border-b border-border-default py-4 text-[11px] uppercase tracking-[0.22em] text-text-muted"
        >
          <span>Issue №01 — A field guide</span>
          <span className="hidden md:inline">Thinking · drawing · keeping</span>
          <span>For any device</span>
        </motion.div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-12 gap-8 px-6 pb-24 pt-14 md:gap-12 md:pt-20 lg:pt-24">
        {/* Left: tight copy */}
        <div className="col-span-12 flex flex-col justify-center lg:col-span-5">
          <motion.p
            {...fade(0.08)}
            className="mb-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-text-secondary"
          >
            <span className="inline-block h-px w-6 bg-text-secondary" />
            An infinite canvas
          </motion.p>

          <motion.h1
            {...fade(0.16)}
            className="text-text-heading"
            style={{
              ...serif,
              fontSize: "clamp(54px, 8vw, 104px)",
              lineHeight: 0.98,
              letterSpacing: "-0.028em",
              fontWeight: 300,
            }}
          >
            Think with
            <br />
            <em
              className="text-accent"
              style={{ fontWeight: 400, fontStyle: "italic" }}
            >
              your hands.
            </em>
          </motion.h1>

          <motion.p
            {...fade(0.28)}
            className="mt-8 max-w-[44ch] text-[17px] leading-[1.65] text-text-body"
            style={{ ...serif, fontWeight: 400 }}
          >
            Sketch diagrams, drop notes, connect ideas — on one page that
            never runs out. Works on your phone, tablet, and laptop.
          </motion.p>

          <motion.div
            {...fade(0.38)}
            className="mt-8 flex flex-wrap items-center gap-6"
          >
            <motion.div whileTap={reduce ? undefined : { scale: 0.97 }}>
              <Link
                href="/canvas"
                className="group inline-flex items-center gap-3 bg-text-heading px-6 py-3.5 text-[14px] font-medium text-surface-base"
                style={serif}
              >
                Open the canvas
                <ArrowRight
                  size={15}
                  strokeWidth={1.8}
                  className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
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
        </div>

        {/* Right: live drawing loop on a paper surface */}
        <motion.div
          {...fade(0.22)}
          className="col-span-12 lg:col-span-7"
        >
          <DrawingLoop reduce={!!reduce} />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Drawing loop — sketches itself, erases, restarts ──────────────────── */

const LOOP = 11; // total seconds per cycle

function DrawingLoop({ reduce }: { reduce: boolean }) {
  // helper: scripted timeline for a single path
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

  // eraser sweep
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
    <div
      className="relative aspect-[5/4] w-full overflow-hidden bg-surface-raised"
      style={{
        backgroundImage:
          "linear-gradient(var(--color-border-faint) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-faint) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* corner crop marks — a designer's proof */}
      <CropMarks />

      {/* tiny floating toolbar (decorative, not interactive) */}
      <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border-default bg-surface-base/80 px-2 py-1.5 text-text-muted backdrop-blur-sm">
        {["▢", "○", "↗", "✎", "T"].map((g, i) => (
          <span
            key={i}
            className={`flex h-6 w-6 items-center justify-center text-[11px] ${
              i === 3 ? "bg-accent text-accent-text" : ""
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
        {/* box 1 */}
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

        {/* arrow */}
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

        {/* ellipse */}
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

        {/* highlighter stroke */}
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

        {/* sticky note (right-bottom) */}
        <motion.g {...fadeStep(5.2, 7.2)}>
          <rect
            x="282"
            y="216"
            width="146"
            height="106"
            fill="var(--color-accent)"
            opacity="0.85"
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

        {/* connector from box to sticky */}
        <motion.path
          {...draw(6.0, 0.4, 7.2)}
          d="M 130 198 C 150 220, 220 230, 282 248"
          stroke="var(--color-text-secondary)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="3 4"
        />

        {/* eraser pass — sweeps right across the canvas */}
        <motion.g {...eraser}>
          <rect
            x="0"
            y="60"
            width="60"
            height="280"
            fill="var(--color-surface-raised)"
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

      {/* "drawn just now" hand-written caption */}
      <p
        className="absolute bottom-3 left-4 z-20 text-[13px] text-text-muted"
        style={hand}
      >
        ↳ a working page · auth flow
      </p>

      {/* live cursor that follows the drawing */}
      <LiveCursor reduce={reduce} />
    </div>
  );
}

function CropMarks() {
  const base =
    "pointer-events-none absolute h-3 w-3 border-text-muted/60";
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
  // hand-tuned positions roughly matching the drawing sequence
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
