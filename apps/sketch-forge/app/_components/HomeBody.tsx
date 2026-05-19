"use client";

import * as React from "react";
import { useState } from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  ArrowRight,
  Layers,
  Monitor,
  MousePointer2,
  PenLine,
  Smartphone,
  Sparkles,
  Tablet,
  Type as TypeIcon,
} from "lucide-react";

const serif = { fontFamily: "Spectral, 'Iowan Old Style', Georgia, serif" };
const hand = { fontFamily: "Kalam, cursive" };

const reveal: Transition = { type: "spring", duration: 0.7, bounce: 0.18 };

function useReveal() {
  const reduce = useReducedMotion();
  return (delay = 0) =>
    reduce
      ? {
          initial: false,
          animate: { opacity: 1, y: 0 },
        }
      : {
          initial: { opacity: 0, y: 14 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { ...reveal, delay },
        };
}

/* ─── Body ─────────────────────────────────────────────────────────────────── */

export function HomeBody() {
  return (
    <>
      <Rule label="§ I — What it is" />
      <Features />
      <Rule label="§ II — How it works" />
      <HowItWorks />
      <Rule label="§ III — What's next" />
      <ComingSoon />
    </>
  );
}

function Rule({ label }: { label: string }) {
  const r = useReveal();
  return (
    <div className="mx-auto max-w-6xl px-6">
      <motion.div
        {...r()}
        className="flex items-center gap-4 py-10"
      >
        <span className="h-px flex-1 bg-border-default" />
        <span
          className="text-[11px] uppercase tracking-[0.22em] text-text-muted"
          style={serif}
        >
          {label}
        </span>
        <span className="h-px flex-1 bg-border-default" />
      </motion.div>
    </div>
  );
}

/* ─── Features ─────────────────────────────────────────────────────────────── */

function Features() {
  const r = useReveal();

  return (
    <section className="px-6 pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-12 gap-6">
          <motion.header
            {...r()}
            className="col-span-12 mb-12 md:col-span-5"
          >
            <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-text-muted">
              The things it does
            </p>
            <h2
              className="text-text-heading"
              style={{
                ...serif,
                fontSize: "clamp(30px, 3.6vw, 46px)",
                lineHeight: 1.06,
                letterSpacing: "-0.018em",
                fontWeight: 300,
              }}
            >
              A short list,
              <br />
              <em style={{ fontWeight: 400 }}>kept honest.</em>
            </h2>
          </motion.header>
          <motion.p
            {...r(0.08)}
            className="col-span-12 self-end text-[15px] leading-[1.7] text-text-body md:col-span-6 md:col-start-7"
            style={{ ...serif, fontWeight: 400 }}
          >
            Three ideas, done with care. Hover the cards — small things move
            in small ways.
          </motion.p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            n="01"
            title="One canvas. No modes."
            body="Draw, write, drop an image, leave a sticky. They share one infinite page."
            visual={<CanvasFanVisual />}
            aside="no “note app” to switch to"
          />
          <FeatureCard
            n="02"
            title="The hand you have."
            body="Mouse, trackpad, finger, stylus. Touch-first, keyboard-fluent, screen-agnostic."
            visual={<DevicesVisual />}
            aside="even a 2019 Pixel"
          />
          <FeatureCard
            n="03"
            title="Tidy when ready."
            body="Capture first, structure later. Ask Sketch Forge to clean up the mess when you're done."
            visual={<TidyVisual />}
            aside="coming soon"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  n,
  title,
  body,
  visual,
  aside,
}: {
  n: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  aside: string;
}) {
  const r = useReveal();
  const [hover, setHover] = useState(false);

  return (
    <motion.article
      {...r(0.1)}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      className="group relative flex flex-col border border-border-default bg-surface-raised"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-border-default bg-surface-base">
        <FeatureVisualContext.Provider value={{ hover }}>
          {visual}
        </FeatureVisualContext.Provider>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <span
            className="text-[14px] italic text-accent"
            style={{ ...serif, fontWeight: 300 }}
          >
            № {n}
          </span>
          <span
            className="text-[12px] text-text-muted"
            style={hand}
          >
            ↳ {aside}
          </span>
        </div>
        <h3
          className="mb-2 text-text-heading"
          style={{
            ...serif,
            fontSize: "20px",
            lineHeight: 1.2,
            letterSpacing: "-0.008em",
            fontWeight: 400,
          }}
        >
          {title}
        </h3>
        <p
          className="text-[14px] leading-[1.65] text-text-body"
          style={{ ...serif, fontWeight: 400 }}
        >
          {body}
        </p>
      </div>
    </motion.article>
  );
}

/* shared hover state for feature visuals */
const FeatureVisualContext = React.createContext({ hover: false });

function useHover() {
  return React.useContext(FeatureVisualContext).hover;
}

/* ─── Feature visual 1: layered canvas elements that fan on hover ─────────── */

function CanvasFanVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  const t = reduce ? { duration: 0 } : { type: "spring" as const, duration: 0.55, bounce: 0.25 };

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: "var(--color-surface-base)",
        backgroundImage:
          "linear-gradient(var(--color-border-faint) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-faint) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      {/* image card */}
      <motion.div
        className="absolute left-[18%] top-[22%] h-[44%] w-[36%] border border-border-default bg-surface-raised"
        animate={hover ? { x: -18, y: -8, rotate: -4 } : { x: 0, y: 0, rotate: -2 }}
        transition={t}
      >
        <div className="flex h-full w-full items-center justify-center text-text-muted">
          <svg viewBox="0 0 40 30" className="h-1/2 w-1/2" fill="none">
            <rect x="2" y="2" width="36" height="26" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5" />
            <path d="M 4 24 L 14 16 L 22 22 L 36 12" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
        </div>
      </motion.div>

      {/* text card */}
      <motion.div
        className="absolute left-[34%] top-[18%] flex h-[50%] w-[42%] flex-col gap-1.5 border border-border-default bg-surface-raised px-3 py-3"
        animate={hover ? { x: 0, y: -14, rotate: 1.5 } : { x: 0, y: 0, rotate: 0 }}
        transition={t}
      >
        <div className="flex items-center gap-1.5 text-text-muted">
          <TypeIcon size={10} strokeWidth={1.6} />
          <span className="text-[8px] uppercase tracking-[0.18em]">notes</span>
        </div>
        <div className="h-px w-full bg-border-default" />
        <div className="h-1.5 w-[80%] rounded-full bg-border-default" />
        <div className="h-1.5 w-[60%] rounded-full bg-border-default" />
        <div className="h-1.5 w-[70%] rounded-full bg-border-default" />
      </motion.div>

      {/* scribble */}
      <motion.svg
        viewBox="0 0 100 60"
        className="absolute bottom-[14%] left-[28%] h-[28%] w-[50%] text-accent"
        animate={hover ? { x: 14, y: 10, rotate: -2 } : { x: 0, y: 0, rotate: 0 }}
        transition={t}
        fill="none"
      >
        <path
          d="M 4 40 C 14 20, 26 50, 38 28 C 50 8, 62 44, 74 26 C 84 12, 92 32, 96 24"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </motion.svg>

      {/* sticky */}
      <motion.div
        className="absolute right-[10%] top-[12%] flex h-[26%] w-[26%] flex-col items-center justify-center bg-accent/70 text-[oklch(0.18_0.012_75)]"
        animate={hover ? { x: 10, y: -6, rotate: 6 } : { x: 0, y: 0, rotate: 3 }}
        transition={t}
        style={{ boxShadow: "0 4px 12px oklch(0 0 0 / 0.12)" }}
      >
        <PenLine size={14} strokeWidth={1.6} />
        <span className="mt-1 text-[8px] uppercase tracking-[0.16em]">draw</span>
      </motion.div>
    </div>
  );
}

/* ─── Feature visual 2: three devices, synced glow ────────────────────────── */

function DevicesVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  const t = (delay = 0) =>
    reduce
      ? { duration: 0 }
      : { type: "spring" as const, duration: 0.6, bounce: 0.2, delay };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-base">
      {/* dotted connector */}
      <svg
        className="absolute inset-0 h-full w-full text-border-default"
        viewBox="0 0 400 300"
        fill="none"
      >
        <motion.path
          d="M 95 150 C 140 110, 180 110, 200 150 C 220 190, 260 190, 305 150"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 4"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>

      <div className="relative z-10 flex items-end gap-6">
        <DeviceFrame
          width={56}
          height={92}
          delay={0}
          hover={hover}
          icon={<Smartphone size={16} strokeWidth={1.4} />}
          t={t(0)}
        />
        <DeviceFrame
          width={108}
          height={84}
          delay={0.1}
          hover={hover}
          icon={<Tablet size={20} strokeWidth={1.4} />}
          t={t(0.1)}
        />
        <DeviceFrame
          width={148}
          height={96}
          delay={0.2}
          hover={hover}
          icon={<Monitor size={22} strokeWidth={1.4} />}
          t={t(0.2)}
        />
      </div>
    </div>
  );
}

function DeviceFrame({
  width,
  height,
  hover,
  icon,
  t,
}: {
  width: number;
  height: number;
  delay: number;
  hover: boolean;
  icon: React.ReactNode;
  t: Transition;
}) {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center border border-text-secondary bg-surface-raised"
      style={{ width, height }}
      animate={hover ? { y: -6 } : { y: 0 }}
      transition={t}
    >
      <motion.div
        className="absolute inset-1.5"
        animate={hover ? { backgroundColor: "var(--color-accent-subtle)" } : { backgroundColor: "transparent" }}
        transition={{ duration: 0.3 }}
      />
      <div className="relative text-text-secondary">{icon}</div>
    </motion.div>
  );
}

/* ─── Feature visual 3: messy → tidy, swept by a divider ──────────────────── */

function TidyVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  const progress = reduce ? 1 : hover ? 1 : 0;

  return (
    <div className="absolute inset-0 bg-surface-base">
      {/* messy state (underneath) */}
      <svg
        viewBox="0 0 320 240"
        className="absolute inset-0 h-full w-full text-text-secondary"
        fill="none"
      >
        <path d="M 30 50 C 60 30, 80 90, 130 60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 40 110 C 80 90, 110 140, 150 100" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="200" cy="70" r="22" stroke="currentColor" strokeWidth="1.5" />
        <rect x="60" y="160" width="80" height="40" stroke="currentColor" strokeWidth="1.5" rx="3" transform="rotate(-4 100 180)" />
        <path d="M 180 140 L 280 200" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 230 50 C 240 70, 260 60, 270 80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* tidy state (revealed via clip-path) */}
      <motion.div
        className="absolute inset-0 flex flex-col gap-2 bg-surface-raised p-5"
        animate={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.05 }}
      >
        <div className="mb-1 flex items-center gap-2 text-accent">
          <Sparkles size={12} strokeWidth={1.6} />
          <span className="text-[9px] uppercase tracking-[0.22em]">organized</span>
        </div>
        {["Auth flow", "Dashboard layout", "Analytics events", "Open questions"].map((t, i) => (
          <div key={t} className="flex items-center gap-2 border-b border-dotted border-border-default pb-1.5">
            <span className="text-[10px] text-text-muted" style={serif}>
              0{i + 1}
            </span>
            <span className="text-[11px] text-text-primary" style={serif}>
              {t}
            </span>
          </div>
        ))}
      </motion.div>

      {/* the sweeping divider line */}
      <motion.div
        className="absolute inset-y-0 w-px bg-accent"
        animate={{ left: `${progress * 100}%` }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.05 }}
        style={{ boxShadow: "0 0 12px var(--color-accent-glow)" }}
      />

      {/* legend */}
      <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-text-muted">
        <Layers size={10} strokeWidth={1.6} />
        hover to tidy
      </div>
    </div>
  );
}

/* ─── How it works ────────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: "i.",
      title: "Open a page.",
      body: "There is no template, no onboarding, no welcome modal. Just a page.",
      visual: <StepBlank />,
    },
    {
      n: "ii.",
      title: "Make a mess.",
      body: "Boxes, arrows, scribbles. Move things. Zoom out. The canvas doesn't care about your method.",
      visual: <StepMess />,
    },
    {
      n: "iii.",
      title: "Keep what matters.",
      body: "Save. Come back tomorrow. Ask Sketch Forge to tidy — or don't.",
      visual: <StepKeep />,
    },
  ];
  const r = useReveal();

  return (
    <section className="px-6 pb-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
        {steps.map((s, i) => (
          <motion.article
            key={s.n}
            {...r(i * 0.08)}
            className={`relative ${i > 0 ? "md:border-l md:border-border-default md:pl-6" : ""}`}
          >
            <div className="mb-4 h-28 w-full">{s.visual}</div>
            <span
              className="text-[13px] uppercase tracking-[0.22em] text-text-muted"
              style={serif}
            >
              Step {s.n}
            </span>
            <h3
              className="mt-3 text-text-heading"
              style={{
                ...serif,
                fontSize: "24px",
                lineHeight: 1.18,
                letterSpacing: "-0.012em",
                fontWeight: 400,
              }}
            >
              {s.title}
            </h3>
            <p
              className="mt-3 max-w-[36ch] text-[15px] leading-[1.75] text-text-body"
              style={{ ...serif, fontWeight: 400 }}
            >
              {s.body}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function StepBlank() {
  return (
    <div className="relative h-full w-32 border border-border-default bg-surface-raised">
      <motion.div
        className="absolute left-3 top-3 h-3 w-px bg-text-heading"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function StepMess() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 140 80" className="h-full w-36 text-text-secondary" fill="none">
      {[
        "M 8 60 C 18 40, 28 70, 40 50",
        "M 46 30 C 60 18, 70 40, 86 24",
        "M 90 60 C 100 50, 110 64, 124 52",
      ].map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.2 + i * 0.18,
            duration: 0.6,
            ease: [0.23, 1, 0.32, 1],
          }}
        />
      ))}
      <motion.circle
        cx="110"
        cy="22"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      />
    </svg>
  );
}

function StepKeep() {
  return (
    <div className="flex h-full items-end gap-1.5">
      {[14, 22, 18, 28, 20, 24].map((h, i) => (
        <motion.div
          key={i}
          className="w-2 bg-accent/70"
          initial={{ height: 0 }}
          whileInView={{ height: h * 2 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.1 + i * 0.06,
            type: "spring",
            duration: 0.6,
            bounce: 0.2,
          }}
        />
      ))}
      <div className="ml-2 flex flex-col gap-1">
        <div className="h-1.5 w-12 bg-text-secondary/40" />
        <div className="h-1.5 w-10 bg-text-secondary/40" />
        <div className="h-1.5 w-8 bg-text-secondary/40" />
      </div>
    </div>
  );
}

/* ─── Coming Soon (collab teaser with floating cursors) ───────────────────── */

function ComingSoon() {
  const r = useReveal();
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          {...r()}
          className="relative overflow-hidden border-y border-border-default px-6 py-16 text-center"
        >
          <CollabCanvas />

          <p className="relative mb-6 text-[11px] uppercase tracking-[0.22em] text-text-muted">
            On the next page
          </p>
          <blockquote
            className="relative text-text-heading"
            style={{
              ...serif,
              fontSize: "clamp(24px, 3vw, 36px)",
              lineHeight: 1.22,
              letterSpacing: "-0.008em",
              fontStyle: "italic",
              fontWeight: 300,
            }}
          >
            &ldquo;Real-time collaboration — sketching together, on the same
            page, from anywhere.&rdquo;
          </blockquote>

          <form
            action="#"
            method="post"
            className="relative mx-auto mt-10 flex max-w-md items-end gap-3"
          >
            <label className="flex-1 text-left">
              <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-text-muted">
                Your email
              </span>
              <input
                type="email"
                placeholder="hello@yourdomain.com"
                className="w-full border-b border-text-secondary bg-transparent py-2 text-[15px] text-text-primary placeholder:text-text-muted focus:border-text-heading focus:outline-none"
                style={serif}
              />
            </label>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="link-underline-on inline-flex items-center gap-1.5 pb-2 text-[14px] text-text-heading"
              style={serif}
            >
              Send me word
              <ArrowRight size={14} strokeWidth={1.8} />
            </motion.button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

function CollabCanvas() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage:
          "linear-gradient(var(--color-border-faint) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-faint) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        maskImage:
          "radial-gradient(ellipse at center, black 30%, transparent 75%)",
      }}
    >
      <FloatingCursor
        name="Maya"
        color="oklch(0.65 0.18 25)"
        path={[
          { x: 12, y: 18 },
          { x: 28, y: 34 },
          { x: 22, y: 60 },
          { x: 40, y: 72 },
          { x: 12, y: 18 },
        ]}
        duration={14}
      />
      <FloatingCursor
        name="Jun"
        color="oklch(0.62 0.18 240)"
        path={[
          { x: 78, y: 24 },
          { x: 64, y: 50 },
          { x: 82, y: 66 },
          { x: 90, y: 40 },
          { x: 78, y: 24 },
        ]}
        duration={17}
      />
    </div>
  );
}

function FloatingCursor({
  name,
  color,
  path,
  duration,
}: {
  name: string;
  color: string;
  path: { x: number; y: number }[];
  duration: number;
}) {
  const start = path[0]!;
  return (
    <motion.div
      className="absolute"
      initial={{ left: `${start.x}%`, top: `${start.y}%` }}
      animate={{
        left: path.map((p) => `${p.x}%`),
        top: path.map((p) => `${p.y}%`),
      }}
      transition={{
        duration,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "loop",
        times: path.map((_, i) => i / (path.length - 1)),
      }}
    >
      <div className="relative -translate-x-1 -translate-y-1">
        <MousePointer2 size={14} strokeWidth={1.4} fill={color} color={color} />
        <span
          className="absolute left-3 top-3 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[9px] font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {name}
        </span>
      </div>
    </motion.div>
  );
}
