"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useInView,
  animate,
  useMotionValue,
  useTransform,
  type Transition,
} from "motion/react";
import {
  ArrowRight,
  Layers,
  Monitor,
  MousePointer2,
  PenLine,
  Plus,
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
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { ...reveal, delay },
        };
}

/* ─── Body ─────────────────────────────────────────────────────────────────── */
export function HomeBody() {
  return (
    <>
      <Rule label="§ I — What it is" id="features" />
      <Features />
      <StatsStrip />
      <Rule label="§ II — How it works" id="how" />
      <HowItWorks />
      <Rule label="§ III — In their words" />
      <Testimonial />
      <Rule label="§ IV — Common questions" id="faq" />
      <FAQ />
      <Rule label="§ V — What's next" />
      <ComingSoon />
    </>
  );
}

function Rule({ label, id }: { label: string; id?: string }) {
  const r = useReveal();
  return (
    <div id={id} className="mx-auto max-w-7xl px-6 scroll-mt-24">
      <motion.div {...r()} className="flex items-center gap-4 py-14">
        <span className="h-px flex-1 bg-border-default" />
        <span
          className="text-[11px] uppercase tracking-[0.24em] text-text-muted"
          style={serif}
        >
          {label}
        </span>
        <span className="h-px flex-1 bg-border-default" />
      </motion.div>
    </div>
  );
}

/* ─── Features (bento) ─────────────────────────────────────────────────────── */
function Features() {
  const r = useReveal();

  return (
    <section className="px-6 pb-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-12 gap-6">
          <motion.header {...r()} className="col-span-12 mb-12 md:col-span-6">
            <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-text-muted">
              The things it does
            </p>
            <h2
              className="text-text-heading"
              style={{
                ...serif,
                fontSize: "clamp(36px, 4.6vw, 64px)",
                lineHeight: 1.04,
                letterSpacing: "-0.022em",
                fontWeight: 300,
              }}
            >
              A short list,
              <br />
              <em style={{ fontWeight: 400 }} className="text-gradient-brand">
                kept honest.
              </em>
            </h2>
          </motion.header>
          <motion.p
            {...r(0.08)}
            className="col-span-12 self-end text-[16px] leading-[1.7] text-text-body md:col-span-5 md:col-start-8"
            style={{ ...serif, fontWeight: 400 }}
          >
            Three ideas, done with care. Hover the cards — small things move in
            small ways.
          </motion.p>
        </div>

        {/* Bento grid */}
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-6 md:gap-5">
          <BentoCard
            className="md:col-span-3"
            n="01"
            title="One canvas. No modes."
            body="Draw, write, drop an image, leave a sticky. They share one infinite page."
            aside={`no "note app" to switch to`}
            visual={<CanvasFanVisual />}
          />
          <BentoCard
            className="md:col-span-3"
            n="02"
            title="The hand you have."
            body="Mouse, trackpad, finger, stylus. Touch-first, keyboard-fluent, screen-agnostic."
            aside="even a 2019 Pixel"
            visual={<DevicesVisual />}
          />
          <BentoCard
            className="md:col-span-2"
            n="03"
            title="Tidy when ready."
            body="Capture first, structure later. Ask Sketch Forge to clean up the mess."
            aside="coming soon"
            visual={<TidyVisual />}
            compact
          />
          <BentoCard
            className="md:col-span-2"
            n="04"
            title="Yours, forever."
            body="Local-first. Export anytime to PNG, SVG, or markdown — no lock-in."
            aside="paper > platforms"
            visual={<ExportVisual />}
            compact
          />
          <BentoCard
            className="md:col-span-2"
            n="05"
            title="Hand-drawn, by default."
            body="Powered by Rough.js. Every shape feels sketched, never sterile."
            aside="warmth on purpose"
            visual={<HandDrawnVisual />}
            compact
          />
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  n,
  title,
  body,
  aside,
  visual,
  className = "",
  compact = false,
}: {
  n: string;
  title: string;
  body: string;
  aside: string;
  visual: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const r = useReveal();
  const [hover, setHover] = useState(false);

  return (
    <motion.article
      {...r(0.06)}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      className={`group relative flex flex-col overflow-hidden rounded-md border border-border-default bg-surface-raised shadow-elev-1 transition-shadow duration-300 hover:shadow-elev-3 ${className}`}
    >
      {/* spotlight tint on hover */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-0"
        animate={{ opacity: hover ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />

      <div
        className={`relative overflow-hidden border-b border-border-default bg-surface-base ${
          compact ? "aspect-[5/3]" : "aspect-[4/3]"
        }`}
      >
        <FeatureVisualContext.Provider value={{ hover }}>
          {visual}
        </FeatureVisualContext.Provider>
      </div>

      <div className="relative flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <span
            className="text-[14px] italic text-accent"
            style={{ ...serif, fontWeight: 300 }}
          >
            № {n}
          </span>
          <span className="text-[12px] text-text-muted" style={hand}>
            ↳ {aside}
          </span>
        </div>
        <h3
          className="mb-2 text-text-heading"
          style={{
            ...serif,
            fontSize: "22px",
            lineHeight: 1.2,
            letterSpacing: "-0.010em",
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

const FeatureVisualContext = React.createContext({ hover: false });
function useHover() {
  return React.useContext(FeatureVisualContext).hover;
}

/* ─── Feature visuals ─────────────────────────────────────────────────────── */

function CanvasFanVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  const t = reduce
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.55, bounce: 0.25 };

  return (
    <div className="absolute inset-0 bg-surface-base bg-paper-grid">
      <motion.div
        className="absolute left-[18%] top-[22%] h-[44%] w-[36%] rounded-sm border border-border-default bg-surface-raised shadow-elev-1"
        animate={hover ? { x: -20, y: -10, rotate: -4 } : { x: 0, y: 0, rotate: -2 }}
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

      <motion.div
        className="absolute left-[34%] top-[18%] flex h-[50%] w-[42%] flex-col gap-1.5 rounded-sm border border-border-default bg-surface-raised px-3 py-3 shadow-elev-1"
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
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </motion.svg>

      <motion.div
        className="absolute right-[10%] top-[12%] flex h-[26%] w-[26%] flex-col items-center justify-center bg-accent/80 text-accent-text shadow-elev-2"
        animate={hover ? { x: 10, y: -6, rotate: 6 } : { x: 0, y: 0, rotate: 3 }}
        transition={t}
      >
        <PenLine size={14} strokeWidth={1.6} />
        <span className="mt-1 text-[8px] uppercase tracking-[0.16em]">draw</span>
      </motion.div>
    </div>
  );
}

function DevicesVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  const t = (delay = 0) =>
    reduce
      ? { duration: 0 }
      : { type: "spring" as const, duration: 0.6, bounce: 0.2, delay };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-base">
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
        <DeviceFrame width={56} height={92} hover={hover} icon={<Smartphone size={16} strokeWidth={1.4} />} t={t(0)} />
        <DeviceFrame width={108} height={84} hover={hover} icon={<Tablet size={20} strokeWidth={1.4} />} t={t(0.1)} />
        <DeviceFrame width={148} height={96} hover={hover} icon={<Monitor size={22} strokeWidth={1.4} />} t={t(0.2)} />
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
  hover: boolean;
  icon: React.ReactNode;
  t: Transition;
}) {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center rounded-sm border border-text-secondary bg-surface-raised shadow-elev-1"
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

function TidyVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  const progress = reduce ? 1 : hover ? 1 : 0;

  return (
    <div className="absolute inset-0 bg-surface-base">
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
            <span className="text-[10px] text-text-muted" style={serif}>0{i + 1}</span>
            <span className="text-[11px] text-text-primary" style={serif}>{t}</span>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="absolute inset-y-0 w-px bg-accent"
        animate={{ left: `${progress * 100}%` }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.05 }}
        style={{ boxShadow: "0 0 12px var(--color-accent-glow)" }}
      />

      <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-text-muted">
        <Layers size={10} strokeWidth={1.6} />
        hover to tidy
      </div>
    </div>
  );
}

function ExportVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  const t = reduce
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.55, bounce: 0.25 };
  const formats = ["png", "svg", ".md", "pdf"];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-base">
      <div className="relative flex items-center justify-center">
        {/* central document */}
        <motion.div
          className="relative z-10 h-20 w-16 rounded-sm border border-border-default bg-surface-raised shadow-elev-2"
          animate={hover ? { rotate: -2, y: -2 } : { rotate: 0, y: 0 }}
          transition={t}
        >
          <div className="space-y-1 p-2">
            <div className="h-px w-full bg-border-default" />
            <div className="h-px w-3/4 bg-border-default" />
            <div className="h-px w-1/2 bg-border-default" />
            <div className="h-4 w-full bg-accent/20" />
          </div>
        </motion.div>
        {/* radiating format chips */}
        {formats.map((f, i) => {
          const angle = (i / formats.length) * Math.PI * 2 - Math.PI / 2;
          const dist = hover ? 80 : 56;
          return (
            <motion.span
              key={f}
              className="absolute rounded-full border border-border-default bg-surface-raised px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-text-secondary shadow-elev-1"
              animate={{
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: hover ? 1 : 0.7,
              }}
              transition={t}
            >
              {f}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

function HandDrawnVisual() {
  const hover = useHover();
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-base bg-paper-grid">
      <svg viewBox="0 0 200 120" className="h-3/4 w-3/4" fill="none">
        {/* sterile (left) */}
        <rect x="14" y="34" width="64" height="50" stroke="var(--color-text-muted)" strokeWidth="1.2" rx="2" />
        <line x1="46" y1="34" x2="46" y2="84" stroke="var(--color-text-muted)" strokeWidth="1.2" strokeDasharray="2 2" />

        {/* arrow */}
        <motion.path
          d="M 90 60 L 120 60"
          stroke="var(--color-text-secondary)"
          strokeWidth="1.4"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <path d="M 114 54 L 122 60 L 114 66" stroke="var(--color-text-secondary)" strokeWidth="1.4" fill="none" strokeLinejoin="round" />

        {/* hand-drawn (right) */}
        <motion.path
          animate={hover ? { d: "M 134 36 C 138 32, 196 32, 198 36 C 200 40, 200 80, 198 84 C 194 88, 134 88, 132 84 C 130 80, 132 40, 134 36 Z" } : { d: "M 134 36 C 138 32, 196 32, 198 36 C 200 40, 200 80, 198 84 C 194 88, 134 88, 132 84 C 130 80, 132 40, 134 36 Z" }}
          d="M 134 36 C 138 32, 196 32, 198 36 C 200 40, 200 80, 198 84 C 194 88, 134 88, 132 84 C 130 80, 132 40, 134 36 Z"
          stroke="var(--color-text-heading)"
          strokeWidth="1.6"
          strokeLinecap="round"
          transition={{ duration: 0.3 }}
        />
        <motion.path
          d="M 164 36 C 162 50, 168 70, 165 84"
          stroke="var(--color-text-heading)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />
      </svg>
      <span
        className="absolute bottom-2 right-3 text-[11px] text-text-muted"
        style={hand}
      >
        warmer →
      </span>
    </div>
  );
}

/* ─── Stats strip — animated counters ─────────────────────────────────────── */
function StatsStrip() {
  const r = useReveal();
  return (
    <section className="px-6 pb-4">
      <motion.div
        {...r()}
        className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden rounded-md border border-border-default bg-border-default md:grid-cols-4"
      >
        <Stat value={2400} suffix="+" label="active thinkers" />
        <Stat value={68} suffix="k" label="canvases drawn" />
        <Stat value={120} prefix="<" suffix="ms" label="pointer latency" />
        <Stat value={0} suffix="" label="lock-in" hand />
      </motion.div>
    </section>
  );
}

function Stat({
  value,
  prefix,
  suffix,
  label,
  hand: useHand,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  hand?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());

  React.useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 1.4, ease: [0.23, 1, 0.32, 1] });
    return c.stop;
  }, [inView, reduce, mv, value]);

  return (
    <div
      ref={ref}
      className="flex flex-col items-start gap-2 bg-surface-base p-7"
    >
      <div
        className="flex items-baseline gap-1 text-text-heading"
        style={{ ...serif, fontWeight: 300, letterSpacing: "-0.022em" }}
      >
        {prefix && <span className="text-[28px]">{prefix}</span>}
        <motion.span className="text-[44px] leading-none">{rounded}</motion.span>
        {suffix && <span className="text-[28px]">{suffix}</span>}
      </div>
      <p
        className={`text-[11px] uppercase tracking-[0.22em] ${
          useHand ? "text-accent" : "text-text-muted"
        }`}
        style={useHand ? hand : undefined}
      >
        {label}
      </p>
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
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((s, i) => (
          <motion.article
            key={s.n}
            {...r(i * 0.08)}
            className={`relative ${i > 0 ? "md:border-l md:border-border-default md:pl-8" : ""}`}
          >
            <div className="mb-5 h-28 w-full">{s.visual}</div>
            <span
              className="text-[13px] uppercase tracking-[0.24em] text-text-muted"
              style={serif}
            >
              Step {s.n}
            </span>
            <h3
              className="mt-3 text-text-heading"
              style={{
                ...serif,
                fontSize: "26px",
                lineHeight: 1.16,
                letterSpacing: "-0.014em",
                fontWeight: 400,
              }}
            >
              {s.title}
            </h3>
            <p
              className="mt-3 max-w-[38ch] text-[15px] leading-[1.75] text-text-body"
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
    <div className="relative h-full w-32 rounded-sm border border-border-default bg-surface-raised shadow-elev-1">
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
          className="w-2 bg-accent/80"
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

/* ─── Testimonial pull-quote ──────────────────────────────────────────────── */
function Testimonial() {
  const r = useReveal();
  return (
    <section className="px-6 pb-24">
      <motion.figure
        {...r()}
        className="mx-auto max-w-4xl text-center"
      >
        <span
          aria-hidden
          className="block text-[120px] leading-none text-accent/60"
          style={serif}
        >
          &ldquo;
        </span>
        <blockquote
          className="-mt-8 text-text-heading"
          style={{
            ...serif,
            fontSize: "clamp(26px, 3.4vw, 44px)",
            lineHeight: 1.28,
            letterSpacing: "-0.012em",
            fontStyle: "italic",
            fontWeight: 300,
          }}
        >
          It&rsquo;s the only tool that feels like the back of a notebook —
          where I actually think, before any of it becomes work.
        </blockquote>
        <figcaption className="mt-8 inline-flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-text-muted">
          <span className="h-px w-8 bg-text-muted" />
          Maya R. — design lead at a startup you&rsquo;d know
          <span className="h-px w-8 bg-text-muted" />
        </figcaption>
      </motion.figure>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────────────────── */
function FAQ() {
  const items = [
    {
      q: "Is it free?",
      a: "Yes — the core canvas is free and always will be. We're shipping optional cloud sync and collaboration later, which will have a small paid tier.",
    },
    {
      q: "Where is my data stored?",
      a: "Locally, in your browser, by default. If you sign in, we encrypt it and sync it to our servers — but you can export and leave at any time.",
    },
    {
      q: "Does it work on iPad / Apple Pencil?",
      a: "First-class. Pressure, palm-rejection, and a touch-first toolbar tuned for Pencil. Same for Surface, S-Pen, and Pixelbook stylus.",
    },
    {
      q: "Can I use it offline?",
      a: "Yes — it's a PWA. Install it, lose the wifi, keep sketching.",
    },
    {
      q: "When does collaboration ship?",
      a: "Live cursors and presence are next on the roadmap. Drop your email in the form below and you'll get the invite first.",
    },
  ];
  const r = useReveal();
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-3xl">
        <ul className="divide-y divide-border-default border-y border-border-default">
          {items.map((it, i) => (
            <motion.li key={it.q} {...r(i * 0.04)}>
              <FAQRow q={it.q} a={it.a} />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FAQRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="group flex w-full items-start gap-6 py-6 text-left transition-colors hover:bg-surface-hover/30"
      aria-expanded={open}
    >
      <span
        className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary transition-colors group-hover:border-border-accent-strong group-hover:text-accent"
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus size={14} strokeWidth={1.8} />
        </motion.span>
      </span>

      <span className="flex-1">
        <span
          className="block text-[18px] text-text-heading"
          style={{ ...serif, fontWeight: 400 }}
        >
          {q}
        </span>
        <motion.span
          initial={false}
          animate={{
            height: open ? "auto" : 0,
            opacity: open ? 1 : 0,
            marginTop: open ? 12 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="block overflow-hidden text-[15px] leading-[1.7] text-text-body"
          style={{ ...serif, fontWeight: 400 }}
        >
          {a}
        </motion.span>
      </span>
    </button>
  );
}

/* ─── Coming Soon / CTA ───────────────────────────────────────────────────── */
function ComingSoon() {
  const r = useReveal();
  return (
    <section className="px-6 pb-32">
      <div className="mx-auto max-w-4xl">
        <motion.div
          {...r()}
          className="relative overflow-hidden rounded-lg border border-border-default bg-surface-raised px-8 py-20 text-center shadow-elev-3"
        >
          <CollabCanvas />

          <p className="relative mb-6 text-[11px] uppercase tracking-[0.22em] text-accent">
            On the next page
          </p>
          <blockquote
            className="relative mx-auto max-w-[28ch] text-text-heading"
            style={{
              ...serif,
              fontSize: "clamp(28px, 3.6vw, 48px)",
              lineHeight: 1.18,
              letterSpacing: "-0.014em",
              fontStyle: "italic",
              fontWeight: 300,
            }}
          >
            Real-time collaboration — sketching together, on the same page,
            from anywhere.
          </blockquote>

          <form
            action="#"
            method="post"
            className="relative mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end"
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
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-[14px] font-medium text-accent-text shadow-glow-accent transition-shadow hover:shadow-elev-3"
              style={serif}
            >
              Send me word
              <ArrowRight size={14} strokeWidth={1.8} />
            </motion.button>
          </form>

          <p className="relative mt-6 text-[12px] text-text-muted">
            Or{" "}
            <Link
              href="/canvas"
              className="link-underline-on text-text-primary"
              style={serif}
            >
              skip the wait and start sketching
            </Link>
            .
          </p>
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
