"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  FileDown,
  FolderTree,
  Infinity as InfinityIcon,
  PenTool,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useAppTheme } from "@/theme/ThemeProvider";

const features = [
  {
    icon: InfinityIcon,
    title: "Space that keeps up",
    body: "Move from the architecture to the awkward edge case without opening a new file.",
  },
  {
    icon: PenTool,
    title: "Ink that feels direct",
    body: "Use a pen, mouse, or trackpad. Your rough lines stay expressive and editable.",
  },
  {
    icon: Sparkles,
    title: "AI only when invited",
    body: "Straighten a diagram or convert handwriting when you ask—not while you think.",
  },
  {
    icon: FolderTree,
    title: "A home for every sketch",
    body: "Folders, pages, and thumbnails make last month’s good idea easy to find.",
  },
  {
    icon: Braces,
    title: "Made for technical work",
    body: "System diagrams, algorithm traces, lecture notes, and whiteboard practice belong here.",
  },
  {
    icon: FileDown,
    title: "Your work leaves with you",
    body: "Export clean PNG, SVG, or JSON for the README, RFC, slide deck, or archive.",
  },
] as const;

function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HomeBody() {
  return (
    <main id="main-content">
      <IntroBand />
      <ProductStory />
      <FeatureField />
      <Workflow />
      <Closing />
    </main>
  );
}

function IntroBand() {
  return (
    <section className="border-y border-border-subtle bg-surface-raised">
      <div className="mx-auto grid max-w-[1380px] gap-8 px-5 py-10 md:grid-cols-[0.7fr_1.3fr] md:items-center md:px-8 md:py-14">
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-accent">
          Built for minds that sketch
        </p>
        <p className="font-display max-w-[28ch] text-[clamp(1.8rem,3.2vw,3.2rem)] font-medium leading-[1.13] tracking-[-0.035em] text-text-heading">
          Some ideas start as sentences. The useful ones usually become boxes,
          arrows, and a note in the margin.
        </p>
      </div>
    </section>
  );
}

function ProductStory() {
  const { resolvedTheme, mounted } = useAppTheme();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section id="inside" className="overflow-hidden py-24 md:py-36">
      <div className="mx-auto max-w-[1380px] px-5 md:px-8">
        <Reveal className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div className="max-w-lg">
            <p className="home-kicker">One notebook, every stage</p>
            <h2 className="home-heading mt-5">
              From first scribble to the diagram worth sharing.
            </h2>
          </div>
          <p className="max-w-[58ch] text-[16px] leading-8 text-text-body lg:justify-self-end">
            Sketch Forge stays out of the way while an idea is fragile. When it
            is ready, tidy the structure, convert the ink, and send it wherever
            the real work lives.
          </p>
        </Reveal>

        <Reveal className="relative mt-16 md:mt-24">
          <div className="home-product-stage">
            <div className="home-product-copy">
              <span className="text-[12px] font-semibold text-accent">
                01 / DRAW
              </span>
              <h3 className="mt-4 font-display text-[clamp(2rem,4vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-text-heading">
                Capture the thought before it disappears.
              </h3>
              <p className="mt-6 max-w-[42ch] text-[15px] leading-7 text-text-body">
                Freehand ink, shapes, arrows, text, and code blocks share the
                same endless surface.
              </p>
            </div>
            <div className="home-screen-wrap">
              <Image
                src={isDark ? "/canvas-dark.png" : "/canvas-light.png"}
                alt="Sketch Forge canvas interface"
                width={2560}
                height={1368}
                unoptimized
                className="h-full w-full object-cover object-left-top"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FeatureField() {
  return (
    <section id="tools" className="home-feature-field py-24 md:py-36">
      <div className="mx-auto max-w-[1380px] px-5 md:px-8">
        <Reveal className="max-w-3xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-accent">
            The useful six
          </p>
          <h2 className="font-display mt-5 text-[clamp(2.8rem,6vw,6.4rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
            Less interface.
            <br />
            More thinking.
          </h2>
        </Reveal>

        <div className="home-feature-line mt-16 grid border-t md:grid-cols-2 lg:mt-24 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal
                key={feature.title}
                className="home-feature-line group border-b py-9 md:min-h-[260px] md:px-7 lg:px-9"
              >
                <div className="flex items-center justify-between">
                  <Icon size={24} className="text-accent" strokeWidth={1.7} />
                  <span className="home-feature-faint text-[11px] tabular-nums">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-10 font-display text-[25px] font-semibold tracking-[-0.025em]">
                  {feature.title}
                </h3>
                <p className="home-feature-muted mt-3 max-w-[36ch] text-[14px] leading-7">
                  {feature.body}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    [
      "Scribble",
      "Put the architecture, lecture, or half-formed answer down fast.",
    ],
    [
      "Shape",
      "Align the structure and convert handwriting only when it helps.",
    ],
    [
      "Share",
      "Export an open file and drop it into the rest of your workflow.",
    ],
  ] as const;

  return (
    <section id="flow" className="relative overflow-hidden py-24 md:py-36">
      <div aria-hidden className="home-orbit home-orbit-three" />
      <div className="relative mx-auto max-w-[1380px] px-5 md:px-8">
        <Reveal className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="home-kicker">A very short learning curve</p>
            <h2 className="home-heading mt-5 max-w-[11ch]">
              Your hand already knows how.
            </h2>
          </div>
          <div className="border-t border-border-default">
            {steps.map(([title, body], index) => (
              <div
                key={title}
                className="grid gap-4 border-b border-border-default py-8 sm:grid-cols-[52px_160px_1fr] sm:items-baseline"
              >
                <span className="text-[12px] font-semibold text-accent">
                  0{index + 1}
                </span>
                <h3 className="font-display text-[27px] font-semibold tracking-[-0.03em] text-text-heading">
                  {title}
                </h3>
                <p className="max-w-[48ch] text-[14px] leading-7 text-text-secondary">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="px-5 pb-8 md:px-8">
      <Reveal className="home-closing mx-auto max-w-[1380px] overflow-hidden rounded-[28px] px-6 py-16 text-center md:px-12 md:py-24">
        <p className="text-[13px] font-semibold text-accent">
          Free during beta
        </p>
        <h2 className="font-display mx-auto mt-5 max-w-[12ch] text-[clamp(3rem,7vw,7rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-text-heading">
          Give the idea room to become clear.
        </h2>
        <p className="mx-auto mt-7 max-w-[50ch] text-[16px] leading-8 text-text-body">
          Open a blank canvas. No setup, no account, no ceremony.
        </p>
        <Link
          href="/canvas"
          className="group mt-9 inline-flex h-13 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-text transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
        >
          Open Sketch Forge
          <ArrowRight
            size={17}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      </Reveal>
    </section>
  );
}
