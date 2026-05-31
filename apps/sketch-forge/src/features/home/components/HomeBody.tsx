"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  FileDown,
  Layers3,
  MousePointer2,
  PenLine,
  Plus,
  Sparkles,
  TextCursorInput,
  Zap,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Transition,
} from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { useAppTheme } from "@/theme/ThemeProvider";

const spring: Transition = { type: "spring", duration: 0.7, bounce: 0.12 };

function useReveal() {
  const reduce = useReducedMotion();
  return (delay = 0) =>
    reduce
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { ...spring, delay },
        };
}

const features = [
  {
    icon: Sparkles,
    title: "AI Beautify",
    body: "Sketch a messy diagram. Get a clean, aligned version in seconds — without losing the hand-drawn feel.",
    accent: "from-amber-400/30 to-rose-400/20",
  },
  {
    icon: TextCursorInput,
    title: "Handwriting → Text",
    body: "Write with stylus, mouse, or finger. Convert when the thought settles. Strokes stay if you want them.",
    accent: "from-sky-400/30 to-cyan-400/20",
  },
  {
    icon: Layers3,
    title: "Pages & Folders",
    body: "Nest a year of study notes. Theme-aware thumbnails so you can find that one diagram from October.",
    accent: "from-violet-400/30 to-fuchsia-400/20",
  },
  {
    icon: Zap,
    title: "Built for Speed",
    body: "Sub-frame pointer latency. Infinite zoom. Works offline. Your hand never waits for the canvas.",
    accent: "from-emerald-400/30 to-teal-400/20",
  },
  {
    icon: FileDown,
    title: "Open Export",
    body: "PNG, SVG, or raw JSON. Take your work anywhere. No lock-in, no proprietary format.",
    accent: "from-orange-400/30 to-red-400/20",
  },
  {
    icon: Brain,
    title: "Think First",
    body: "Built around the rough draft. The product gets out of the way until you ask for help.",
    accent: "from-indigo-400/30 to-blue-400/20",
  },
];

const steps = [
  {
    icon: MousePointer2,
    title: "Open a page",
    body: "Start clean. Pick a paper, grid, or dot background. Light or dark — tuned for both.",
  },
  {
    icon: PenLine,
    title: "Make it visible",
    body: "Boxes, arrows, freehand, code blocks, text. Whatever shape the thought wants.",
  },
  {
    icon: Brain,
    title: "Clean up what helps",
    body: "Beautify the layout, convert scribbles to text, or leave the mess. Your call.",
  },
];

const faqs: [string, string][] = [
  [
    "Is it only for diagrams?",
    "No. People use it for lecture notes, system design sketches, product flows, study sheets, and morning pages.",
  ],
  [
    "Does it run offline?",
    "Yes. Pages save to local storage instantly and sync when you're back online.",
  ],
  [
    "Do I need an account?",
    "No. Open the canvas and start. Accounts are only needed for syncing across devices.",
  ],
  [
    "Is my data private?",
    "Your sketches stay on your device by default. AI features only run when you trigger them.",
  ],
  [
    "What's the AI built on?",
    "You bring your own Gemini API key. Nothing routes through our servers — direct from your browser.",
  ],
];

const stats = [
  { value: "<8ms", label: "Pointer latency" },
  { value: "∞", label: "Canvas size" },
  { value: "100%", label: "Offline ready" },
  { value: "0", label: "Vendor lock-in" },
];

const useCases = [
  "Lecture notes",
  "System diagrams",
  "Product flows",
  "Mind maps",
  "Code architecture",
  "Study sheets",
  "Wireframes",
  "Math working",
  "Whiteboard sessions",
];

export function HomeBody() {
  return (
    <main id="main-content">
      <Marquee />
      <StatsRow />
      <FeatureSection />
      <WorkflowSection />
      <ShowcaseSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={spring}
      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted"
    >
      <span className="h-px w-6 bg-border-strong" />
      {children}
    </motion.p>
  );
}

function Marquee() {
  const reduce = useReducedMotion();
  return (
    <section className="border-y border-border-subtle bg-surface-sunken/30 py-8 overflow-hidden">
      <div className="mb-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
        Used for
      </div>
      <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <motion.div
          className="flex shrink-0 gap-3 pr-3"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          {[...useCases, ...useCases, ...useCases].map((item, i) => (
            <span
              key={i}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border-default bg-surface-raised px-4 py-1.5 text-[13px] font-medium text-text-secondary"
            >
              <span className="h-1 w-1 rounded-full bg-accent" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function StatsRow() {
  const reveal = useReveal();
  return (
    <section className="border-b border-border-subtle px-6 py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border-default bg-border-subtle md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            {...reveal(i * 0.05)}
            className="bg-surface-base p-6 text-center md:p-8"
          >
            <div className="font-mono text-3xl font-semibold tracking-tight text-text-heading md:text-4xl">
              {s.value}
            </div>
            <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FeatureSection() {
  const reveal = useReveal();

  return (
    <section
      id="features"
      className="relative border-b border-border-subtle px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <motion.header {...reveal()} className="mx-auto max-w-2xl text-center">
          <SectionLabel>Tools</SectionLabel>
          <h2 className="mt-4 text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-text-heading">
            Everything you need to think out loud.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[15px] leading-7 text-text-secondary">
            Six focused tools. Zero dropdown menus.
          </p>
        </motion.header>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, index) => (
            <FeatureCard key={f.title} feature={f} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  return (
    <motion.article
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...spring, delay: index * 0.05 }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="group relative overflow-hidden rounded-xl border border-border-default bg-surface-raised p-7 transition-shadow duration-300 hover:shadow-elev-3"
    >
      <motion.div
        aria-hidden
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${feature.accent}`}
        initial={false}
        animate={{ opacity: hover ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />
      <motion.div
        animate={hover && !reduce ? { rotate: [0, -8, 6, 0] } : { rotate: 0 }}
        transition={{ duration: 0.5 }}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-surface-base text-accent"
      >
        <feature.icon size={18} strokeWidth={1.75} />
      </motion.div>
      <h3 className="mt-6 text-[17px] font-semibold tracking-[-0.015em] text-text-heading">
        {feature.title}
      </h3>
      <p className="mt-2 text-[14px] leading-6 text-text-secondary">
        {feature.body}
      </p>
    </motion.article>
  );
}

function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.7", "end 0.4"],
  });
  const lineScale = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const reveal = useReveal();

  return (
    <section
      id="how"
      className="border-b border-border-subtle px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <motion.header {...reveal()} className="max-w-2xl">
          <SectionLabel>Flow</SectionLabel>
          <h2 className="mt-4 text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-text-heading">
            Fewer steps. More thinking.
          </h2>
        </motion.header>

        <div
          ref={ref}
          className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          <div className="pointer-events-none absolute left-6 right-6 top-5 hidden h-px bg-border-subtle md:block">
            <motion.div
              style={{
                scaleX: reduce ? 1 : lineScale,
                transformOrigin: "left",
              }}
              className="h-full w-full bg-gradient-to-r from-accent via-accent to-accent/40"
            />
          </div>

          {steps.map((step, index) => (
            <motion.article
              key={step.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...spring, delay: index * 0.1 }}
              className="relative"
            >
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-base font-mono text-[12px] font-semibold text-text-primary shadow-elev-1">
                0{index + 1}
              </div>
              <step.icon
                size={18}
                className="mt-7 text-accent"
                strokeWidth={1.75}
              />
              <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.015em] text-text-heading">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[42ch] text-[14px] leading-6 text-text-secondary">
                {step.body}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  const reveal = useReveal();
  const reduce = useReducedMotion();
  const { resolvedTheme, mounted } = useAppTheme();

  const isDark = mounted && resolvedTheme === "dark";
  const imageSrc = isDark
    ? "/features/01-beautify-dark.png"
    : "/features/01-beautify-light.png";

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(
    scrollYProgress,
    [0, 1],
    [reduce ? 0 : 40, reduce ? 0 : -40],
  );

  return (
    <section className="border-b border-border-subtle bg-surface-sunken/30 px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <motion.div {...reveal()} className="max-w-lg">
          <SectionLabel>One product, two rooms</SectionLabel>
          <h2 className="mt-4 text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-text-heading">
            Light, dark, and quiet in both.
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-text-secondary">
            Surfaces, borders, strokes, and shadows shift as a system — never
            one-off values. Theme-aware thumbnails. Tokenized everything.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Tokens", "Themed strokes", "Auto contrast", "OS aware"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-default bg-surface-raised px-3 py-1 font-mono text-[11px] text-text-secondary"
                >
                  {tag}
                </span>
              ),
            )}
          </div>
        </motion.div>

        <motion.div ref={ref} {...reveal(0.08)} className="relative">
          <motion.div
            style={{ y: imgY }}
            className="overflow-hidden rounded-xl border border-border-default bg-surface-raised shadow-elev-3"
          >
            <Image
              src={imageSrc}
              alt="Canvas diagram before and after layout cleanup"
              width={1280}
              height={920}
              className="h-auto w-full"
              unoptimized
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FAQSection() {
  const reveal = useReveal();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="border-b border-border-subtle px-6 py-24 md:py-32"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-[0.8fr_1.2fr]">
        <motion.header {...reveal()}>
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="mt-4 text-[clamp(2.1rem,4.2vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-text-heading">
            Quick answers before you open it.
          </h2>
          <p className="mt-5 text-[14px] leading-7 text-text-secondary">
            Still curious?{" "}
            <Link href="/canvas" className="text-accent hover:underline">
              Just open the canvas →
            </Link>
          </p>
        </motion.header>

        <div className="divide-y divide-border-subtle border-y border-border-subtle">
          {faqs.map(([question, answer], index) => {
            const isOpen = open === index;
            return (
              <motion.div
                key={question}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...spring, delay: index * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-text-primary"
                >
                  <span className="text-[15.5px] font-semibold tracking-[-0.01em] text-text-heading">
                    {question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary"
                  >
                    <Plus size={14} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[60ch] pb-5 text-[14px] leading-7 text-text-secondary">
                        {answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="px-6 py-24 md:py-32">
      <motion.div
        ref={ref}
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={inView ? { opacity: 1, scale: 1 } : undefined}
        transition={spring}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border-default bg-surface-raised px-6 py-16 text-center shadow-elev-3 md:px-12 md:py-20"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          animate={
            reduce
              ? undefined
              : {
                  background: [
                    "radial-gradient(circle at 20% 30%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 60%)",
                    "radial-gradient(circle at 80% 70%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 60%)",
                    "radial-gradient(circle at 20% 30%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 60%)",
                  ],
                }
          }
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        <SectionLabel>Start drawing</SectionLabel>
        <h2 className="mx-auto mt-4 max-w-[16ch] text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-text-heading">
          Give the next idea room to breathe.
        </h2>
        <p className="mx-auto mt-5 max-w-[44ch] text-[15px] leading-7 text-text-secondary">
          Open a canvas, draw something rough, and shape it later. No signup
          wall, no setup menu, no friction.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/canvas"
            className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-accent px-5 text-[14px] font-semibold text-accent-text transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
          >
            Open the canvas
            <motion.span
              className="inline-flex"
              animate={reduce ? undefined : { x: [0, 4, 0] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ArrowRight size={16} />
            </motion.span>
          </Link>
          <Link
            href="#features"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border-default bg-surface-base px-5 text-[14px] font-semibold text-text-primary transition-all duration-150 hover:-translate-y-0.5 hover:bg-surface-hover active:translate-y-0 active:scale-[0.98]"
          >
            See features
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
