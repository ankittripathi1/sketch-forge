"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { useAppTheme } from "@/theme/ThemeProvider";

const transition: Transition = {
  duration: 0.75,
  ease: [0.16, 1, 0.3, 1],
};

export function HomeHero() {
  const reduceMotion = useReducedMotion();
  const { resolvedTheme, mounted } = useAppTheme();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section className="relative overflow-hidden pb-20 pt-14 md:pb-28 md:pt-20">
      <div aria-hidden className="home-orbit home-orbit-one" />
      <div aria-hidden className="home-orbit home-orbit-two" />

      <div className="relative mx-auto grid max-w-[1380px] items-center gap-14 px-5 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="relative z-10 max-w-[620px]"
        >
          <p className="mb-7 inline-flex items-center gap-2 text-[13px] font-semibold text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            The visual notebook for technical thinking
          </p>

          <h1 className="font-display text-[clamp(3.5rem,7vw,7.3rem)] font-semibold leading-[0.91] tracking-[-0.065em] text-text-heading">
            Think it.
            <br />
            Draw it.
            <br />
            <span className="text-accent">Make it clear.</span>
          </h1>

          <p className="mt-8 max-w-[54ch] text-[17px] leading-8 text-text-body md:text-[18px]">
            Sketch Forge gives engineers and students one calm place for
            diagrams, handwritten notes, and ideas that refuse to fit in a text
            box.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/canvas"
              className="group inline-flex h-13 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-text shadow-[0_14px_40px_var(--color-accent-glow)] transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]"
            >
              Start drawing
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="#inside"
              className="inline-flex h-13 items-center rounded-full px-2 text-[15px] font-semibold text-text-primary transition-colors hover:text-accent"
            >
              See what&apos;s inside
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-secondary">
            {["No account needed", "Offline-first", "Open export"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check size={14} className="text-accent" strokeWidth={2.5} />
                  {item}
                </span>
              ),
            )}
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 40, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ ...transition, delay: 0.15 }}
          className="relative min-h-[430px] sm:min-h-[570px] lg:min-h-[680px]"
        >
          <div aria-hidden className="home-hero-blob" />

          <div className="absolute inset-x-0 top-[8%] z-10 overflow-hidden rounded-[22px] border border-white/20 bg-surface-raised shadow-elev-4 sm:left-[4%] sm:right-[-14%] lg:left-[2%]">
            <div className="flex h-10 items-center gap-2 border-b border-border-subtle bg-surface-raised px-4">
              <span className="h-2 w-2 rounded-full bg-accent/75" />
              <span className="h-2 w-2 rounded-full bg-text-dim" />
              <span className="h-2 w-2 rounded-full bg-text-dim" />
              <span className="ml-auto text-[10px] font-medium text-text-muted">
                system-map.sketch
              </span>
            </div>
            <Image
              src={isDark ? "/canvas-dark.png" : "/canvas-light.png"}
              alt="Sketch Forge canvas showing drawing tools and a flexible infinite workspace"
              width={2560}
              height={1368}
              priority
              unoptimized
              className="aspect-[1.72/1] w-full object-cover object-left-top"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
