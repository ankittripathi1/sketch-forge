"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { useState, type ReactNode } from "react";
import { useAppTheme } from "@/theme/ThemeProvider";

const spring: Transition = { type: "spring", duration: 0.7, bounce: 0 };

const INK_BLUE = "var(--color-status-info)";
const INK_RED = "var(--color-accent)";
const INK_PENCIL = "var(--color-text-secondary)";

function useReveal() {
  const reduce = useReducedMotion();
  return (delay = 0) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-70px" },
          transition: { ...spring, delay },
        };
}

/* ---------------------------------- data --------------------------------- */

const audiences = [
  {
    index: "01",
    title: "Software engineers",
    desc: "Architecture sketches before the RFC, incident scribbles during, postmortem diagrams after.",
    pages: "system designs · API flows · debug maps",
    caption: "fig. a — a service sketched before the RFC",
  },
  {
    index: "02",
    title: "Engineering students",
    desc: "Lecture notes where the diagram sits next to the derivation — not in a separate app.",
    pages: "lecture notes · algorithm traces · exam sheets",
    caption: "fig. b — lecture notes that survive finals week",
  },
  {
    index: "03",
    title: "Interview candidates",
    desc: "Whiteboard practice on infinite paper. Review last week's rounds, keep the good ones.",
    pages: "system design rounds · DSA walkthroughs",
    caption: "fig. c — tuesday's practice round, kept",
  },
  {
    index: "04",
    title: "Leads & educators",
    desc: "Explain the system once, export the SVG, drop it in the wiki and the slide deck.",
    pages: "talk figures · onboarding maps · wiki diagrams",
    caption: "fig. d — one diagram, three rooms",
  },
];

const steps = [
  {
    no: "01",
    title: "Scribble",
    body: "Boxes, arrows, freehand, code blocks. Capture the thought at the speed you think it.",
    rotate: "-1.5deg",
  },
  {
    no: "02",
    title: "Shape",
    body: "AI beautify aligns the mess. Handwriting becomes text. Only when you ask.",
    rotate: "1.6deg",
  },
  {
    no: "03",
    title: "Ship",
    body: "Export SVG or PNG straight into the RFC, the README, or the slide.",
    rotate: "-1deg",
  },
];

const tools = [
  {
    title: "AI beautify",
    body: "Sketch the messy version. One tap aligns the boxes, straightens the arrows, and keeps the hand-drawn voice.",
  },
  {
    title: "Handwriting → text",
    body: "Write with stylus, mouse, or finger. Convert strokes to type when the thought settles — or never.",
  },
  {
    title: "Infinite canvas",
    body: "Sub-frame pointer latency, endless zoom. Pan from the big picture to the edge case without changing pages.",
  },
  {
    title: "Pages & folders",
    body: "A semester of notes or a codebase of designs, nested and thumbnailed so October's diagram is findable in March.",
  },
  {
    title: "Open export",
    body: "PNG, SVG, or raw JSON. Paste straight into the README, the RFC, or the slide. No lock-in.",
  },
  {
    title: "Offline-first",
    body: "Pages save to your device first and sync later. Lecture halls with bad wifi were a design requirement.",
  },
];

const faqs = [
  {
    q: "Who is Sketch Forge for?",
    a: "Developers, CS and engineering students, and anyone whose notes keep turning into boxes and arrows — system designs, lecture notes, algorithm traces, study sheets.",
  },
  {
    q: "Do I need an account?",
    a: "No. Open the canvas and start drawing. An account only matters when you want to sync pages across devices.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. Pages save to local storage instantly and sync when you're back online. Flaky lecture-hall wifi can't lose your notes.",
  },
  {
    q: "Is my data private?",
    a: "Your sketches stay on your device by default. AI features run only when you trigger them, and nothing is used for anything else.",
  },
  {
    q: "What runs the AI features?",
    a: "You bring your own Gemini API key. Requests go from your browser to Google directly — nothing routes through our servers.",
  },
  {
    q: "Is it free?",
    a: "The beta is free. Everything you make is exportable as PNG, SVG, or JSON, so nothing you draw is ever stuck here.",
  },
];

/* --------------------------------- shell --------------------------------- */

export function HomeBody() {
  return (
    <main id="main-content">
      <AudienceSection />
      <FlowSection />
      <ToolsSection />
      <ShowcaseSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}

function SectionTag({ no, children }: { no: string; children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
      <span className="text-accent">{no}</span>
      <span className="mx-2">·</span>
      {children}
    </p>
  );
}

/* ------------------------- §1 · who it's for ------------------------------ */

function AudienceSection() {
  const reveal = useReveal();
  const [active, setActive] = useState(0);

  return (
    <section id="who" className="border-b border-border-subtle">
      <div className="mx-auto max-w-[1320px] px-5 py-20 md:py-28">
        <motion.header
          {...reveal()}
          className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6"
        >
          <div>
            <SectionTag no="§1">Who it&apos;s for</SectionTag>
            <h2 className="font-display mt-4 text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[1] tracking-[-0.01em] text-text-heading">
              Made for the diagram-prone.
            </h2>
          </div>
          <p className="max-w-[42ch] text-[14px] leading-7 text-text-secondary">
            If your notes keep turning into boxes and arrows, stop forcing them
            into bullet lists. This notebook is shaped like your thinking.
          </p>
        </motion.header>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_430px] lg:gap-16">
          <div className="border-t border-border-default">
            {audiences.map((row, i) => (
              <motion.div
                key={row.title}
                {...reveal(i * 0.06)}
                onPointerEnter={() => setActive(i)}
                className={`group grid grid-cols-[44px_1fr] gap-x-4 gap-y-2 border-b border-border-default py-6 transition-colors duration-200 md:px-3 md:py-7 ${
                  active === i ? "bg-surface-raised/70" : ""
                }`}
              >
                <span
                  className={`font-mono text-[12px] transition-colors duration-200 ${
                    active === i ? "text-accent" : "text-text-muted"
                  }`}
                >
                  {row.index}
                </span>
                <div>
                  <h3 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.005em] text-text-heading md:text-[26px]">
                    {row.title}
                  </h3>
                  <p className="mt-1.5 max-w-[58ch] text-[14px] leading-6 text-text-secondary">
                    {row.desc}
                  </p>
                  <p className="mt-2 font-mono text-[11px] leading-6 text-text-muted">
                    {row.pages}
                  </p>
                </div>
                <div className="col-span-2 mt-2 lg:hidden">
                  <SketchPanel index={i} caption={row.caption} />
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            {...reveal(0.1)}
            aria-hidden
            className="relative hidden lg:block"
          >
            <div className="sticky top-24">
              <div className="relative overflow-hidden rounded-sm border border-border-strong bg-surface-raised shadow-elev-2">
                <div className="absolute inset-0 bg-paper-grid opacity-60" />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="relative"
                  >
                    <AudienceSketch index={active} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <ActiveCaption caption={audiences[active]?.caption ?? ""} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ActiveCaption({ caption }: { caption: string }) {
  const [figLabel = "", figText = ""] = caption.split(" — ");
  return (
    <p className="mt-3 font-mono text-[11px] text-text-muted">
      <span className="text-accent">{figLabel}</span>
      {" — "}
      {figText}
    </p>
  );
}

function SketchPanel({ index, caption }: { index: number; caption: string }) {
  return (
    <div aria-hidden>
      <div className="relative overflow-hidden rounded-sm border border-border-default bg-surface-raised">
        <div className="absolute inset-0 bg-paper-grid opacity-60" />
        <div className="relative">
          <AudienceSketch index={index} />
        </div>
      </div>
      <p className="mt-2 font-mono text-[10px] text-text-muted">{caption}</p>
    </div>
  );
}

function AudienceSketch({ index }: { index: number }) {
  const sketches = [
    <SketchSystem key="sys" />,
    <SketchLecture key="lec" />,
    <SketchInterview key="int" />,
    <SketchLeads key="lead" />,
  ];
  return sketches[index] ?? sketches[0];
}

function Ink({
  d,
  color = INK_BLUE,
  width = 2,
  dash,
}: {
  d: string;
  color?: string;
  width?: number;
  dash?: string;
}) {
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      fill="none"
    />
  );
}

function HandText({
  x,
  y,
  children,
  color = "var(--color-text-body)",
  size = 16,
}: {
  x: number;
  y: number;
  children: string;
  color?: string;
  size?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      style={{ fontFamily: "Kalam, cursive" }}
    >
      {children}
    </text>
  );
}

function SketchSystem() {
  return (
    <svg viewBox="0 0 430 300" className="block h-auto w-full" fill="none">
      <Ink d="M36,52 C70,48 100,49 128,52 C131,68 130,86 127,100 C96,104 64,103 38,100 C34,84 34,66 36,52 Z" />
      <HandText x={56} y={83}>client</HandText>
      <Ink d="M178,52 C216,48 250,49 282,52 C285,68 284,86 281,100 C246,104 210,103 180,100 C176,84 176,66 178,52 Z" />
      <HandText x={196} y={83}>gateway</HandText>
      <Ink d="M178,180 C216,176 250,177 282,180 C285,196 284,214 281,228 C246,232 210,231 180,228 C176,212 176,194 178,180 Z" />
      <HandText x={194} y={211}>service</HandText>
      <Ink d="M330,182 C354,178 376,179 396,182 C399,196 398,214 395,226 C374,230 352,229 332,226 C328,212 328,196 330,182 Z" />
      <Ink d="M330,182 C352,190 374,190 396,182" />
      <HandText x={348} y={216}>db</HandText>
      <Ink d="M132,76 L172,76 M163,70 L174,76 L164,83" />
      <Ink d="M230,104 L230,172 M224,162 L230,174 L237,162" />
      <Ink d="M286,204 L324,204 M316,198 L326,204 L317,211" />
      <Ink d="M36,180 C60,176 86,177 110,180 C113,194 112,212 109,226 C84,230 60,229 38,226 C34,212 34,194 36,180 Z" dash="5 6" />
      <HandText x={48} y={211}>cache?</HandText>
      <Ink d="M114,204 L172,204" dash="5 6" />
      <Ink
        d="M30,170 C40,156 96,150 120,164 C136,176 120,238 96,240 C60,244 24,224 28,196 C30,182 34,174 42,168"
        color={INK_RED}
      />
      <HandText x={28} y={266} color={INK_RED} size={15}>
        decide before standup!
      </HandText>
    </svg>
  );
}

function SketchLecture() {
  return (
    <svg viewBox="0 0 430 300" className="block h-auto w-full" fill="none">
      <HandText x={32} y={44} size={19}>AVL rotations</HandText>
      <Ink d="M30,52 C90,56 130,54 178,50" color={INK_PENCIL} />
      <circle cx={215} cy={92} r={16} stroke={INK_BLUE} strokeWidth={2} />
      <circle cx={150} cy={158} r={16} stroke={INK_BLUE} strokeWidth={2} />
      <circle cx={280} cy={158} r={16} stroke={INK_BLUE} strokeWidth={2} />
      <circle cx={108} cy={224} r={16} stroke={INK_BLUE} strokeWidth={2} />
      <circle cx={192} cy={224} r={16} stroke={INK_BLUE} strokeWidth={2} />
      <circle cx={322} cy={224} r={16} stroke={INK_BLUE} strokeWidth={2} />
      <Ink d="M204,104 C188,122 174,134 161,146" />
      <Ink d="M226,104 C242,122 256,134 269,146" />
      <Ink d="M140,170 C130,186 122,200 114,210" />
      <Ink d="M160,170 C170,186 178,200 184,210" />
      <Ink d="M290,170 C300,186 308,200 314,210" />
      <HandText x={209} y={98} size={15}>8</HandText>
      <HandText x={144} y={164} size={15}>4</HandText>
      <HandText x={272} y={164} size={15}>12</HandText>
      <HandText x={102} y={230} size={15}>2</HandText>
      <HandText x={186} y={230} size={15}>6</HandText>
      <HandText x={314} y={230} size={15}>14</HandText>
      <Ink d="M330,84 C350,76 372,80 384,94" color={INK_RED} />
      <Ink d="M376,86 L386,95 L374,99" color={INK_RED} />
      <HandText x={300} y={66} color={INK_RED} size={15}>
        height diff ≤ 1
      </HandText>
      <HandText x={34} y={278} color={INK_PENCIL} size={15}>
        rotate left when right-heavy…
      </HandText>
    </svg>
  );
}

function SketchInterview() {
  return (
    <svg viewBox="0 0 430 300" className="block h-auto w-full" fill="none">
      <Ink
        d="M24,30 C150,24 290,25 406,30 C410,108 409,196 405,272 C280,278 140,277 26,272 C21,192 21,108 24,30 Z"
        color={INK_PENCIL}
      />
      <HandText x={40} y={62} size={18}>design: tinyurl</HandText>
      <Ink d="M38,72 C100,76 150,74 196,71" color={INK_PENCIL} />
      <Ink d="M44,110 C78,106 108,107 136,110 C139,124 138,142 135,156 C106,160 76,159 46,156 C42,142 42,124 44,110 Z" />
      <HandText x={62} y={140}>hash</HandText>
      <Ink d="M180,110 C214,106 244,107 272,110 C275,124 274,142 271,156 C242,160 212,159 182,156 C178,142 178,124 180,110 Z" />
      <HandText x={194} y={140}>kv store</HandText>
      <Ink d="M140,132 L176,132 M168,126 L178,132 L169,139" />
      <Ink d="M120,196 C160,192 200,193 236,196 C239,210 238,228 235,242 C198,246 160,245 122,242 C118,228 118,210 120,196 Z" />
      <HandText x={138} y={226}>302 redirect</HandText>
      <Ink d="M226,160 L226,190 M220,182 L226,192 L233,182" />
      <Ink
        d="M296,52 C306,40 366,38 380,52 C392,66 380,88 348,90 C316,92 290,80 292,64 C293,57 296,54 302,50"
        color={INK_RED}
      />
      <HandText x={306} y={72} color={INK_RED} size={15}>10M/day</HandText>
      <HandText x={282} y={232} color={INK_RED} size={15}>
        cache the hot 1%
      </HandText>
      <Ink d="M286,238 C306,244 330,244 352,240" color={INK_RED} />
    </svg>
  );
}

function SketchLeads() {
  return (
    <svg viewBox="0 0 430 300" className="block h-auto w-full" fill="none">
      <Ink d="M34,70 C76,66 112,67 146,70 C149,96 148,130 145,158 C110,162 74,161 36,158 C32,130 32,96 34,70 Z" />
      <Ink d="M52,96 C70,90 90,98 104,92 C116,88 124,96 130,92" />
      <Ink d="M52,118 C74,112 96,122 118,114" />
      <Ink d="M52,140 C68,134 84,142 100,136" />
      <HandText x={44} y={186} color={INK_PENCIL} size={14}>monday&apos;s mess</HandText>
      <Ink d="M162,112 L212,112 M202,105 L214,112 L203,120" color={INK_RED} />
      <HandText x={154} y={100} color={INK_RED} size={14}>beautify</HandText>
      <Ink d="M228,70 L388,70 L388,158 L228,158 Z" width={2.2} />
      <Ink d="M248,96 L332,96 M248,118 L368,118 M248,140 L308,140" />
      <HandText x={240} y={186} color={INK_PENCIL} size={14}>
        wiki + slide, same file
      </HandText>
      <Ink d="M306,196 C322,210 330,224 332,242 M324,234 L332,244 L338,232" color={INK_RED} />
      <HandText x={344} y={252} color={INK_RED} size={15}>export.svg</HandText>
    </svg>
  );
}

/* ----------------------------- §2 · the flow ------------------------------ */

function FlowSection() {
  const reveal = useReveal();
  const reduce = useReducedMotion();

  return (
    <section
      id="flow"
      className="border-b border-border-subtle bg-surface-paper/60"
    >
      <div className="mx-auto max-w-[1320px] px-5 py-20 md:py-28">
        <motion.header {...reveal()} className="max-w-2xl">
          <SectionTag no="§2">The flow</SectionTag>
          <h2 className="font-display mt-4 text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[1] tracking-[-0.01em] text-text-heading">
            Scribble. Shape. Ship.
          </h2>
        </motion.header>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start md:gap-4">
          {steps.map((step, i) => (
            <div key={step.no} className="contents">
              {i > 0 && <HandArrow delay={0.25 + i * 0.25} reduce={!!reduce} />}
              <motion.div {...reveal(i * 0.12)}>
                <WobblyBox delay={0.1 + i * 0.25} reduce={!!reduce}>
                  <span className="font-mono text-[11px] text-accent">
                    {step.no}
                  </span>
                  <span className="font-display text-[26px] font-semibold tracking-[-0.005em] text-text-heading">
                    {step.title}
                  </span>
                </WobblyBox>
                <p className="mt-5 max-w-[40ch] text-[14px] leading-7 text-text-secondary md:px-2">
                  {step.body}
                </p>
                <TapedCard rotate={step.rotate}>
                  {i === 0 && <DoodleScribble />}
                  {i === 1 && <DoodleShape />}
                  {i === 2 && <DoodleShip />}
                </TapedCard>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TapedCard({
  children,
  rotate = "-1.5deg",
}: {
  children: ReactNode;
  rotate?: string;
}) {
  return (
    <div
      aria-hidden
      className="relative mt-8 w-full max-w-[300px] transition-transform duration-300 hover:rotate-0 md:ml-2"
      style={{ rotate }}
    >
      <span className="absolute -top-2.5 left-1/2 z-10 h-5 w-16 -translate-x-1/2 rotate-[-4deg] rounded-[2px] border border-border-faint bg-surface-overlay/85" />
      <div className="relative overflow-hidden rounded-[3px] border border-border-default bg-surface-raised p-2 shadow-elev-2">
        <div className="relative overflow-hidden rounded-[2px] border border-border-faint">
          <div className="absolute inset-0 bg-paper-grid opacity-50" />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}

function DoodleScribble() {
  return (
    <svg viewBox="0 0 280 170" className="block h-auto w-full" fill="none">
      <Ink d="M28,118 C40,72 72,58 88,82 C102,104 82,128 62,120 C44,112 56,84 86,76 C118,68 142,76 154,96" />
      <Ink d="M168,44 C198,40 226,41 250,44 C253,58 252,74 249,86 C224,90 198,89 170,86 C166,72 166,56 168,44 Z" />
      <HandText x={186} y={72} size={15}>idea??</HandText>
      <Ink d="M156,100 C170,96 182,90 196,88 M188,82 L198,87 L190,95" color={INK_RED} />
      <Ink d="M40,140 C52,136 66,142 80,138" color={INK_PENCIL} />
      <Ink d="M222,118 L228,134 L244,136 L232,146 L236,162 L222,152 L208,162 L212,146 L200,136 L216,134 Z" color={INK_RED} width={1.8} />
    </svg>
  );
}

function DoodleShape() {
  return (
    <svg viewBox="0 0 280 170" className="block h-auto w-full" fill="none">
      <Ink d="M22,40 C44,36 62,38 78,42 C80,54 79,68 76,80 C58,84 40,82 24,78 C20,66 20,52 22,40 Z" />
      <Ink d="M34,98 C54,92 70,96 84,102 C85,114 83,126 80,134 C62,138 46,134 32,128 C30,118 31,106 34,98 Z" />
      <Ink d="M100,124 L128,108" dash="4 5" />
      <Ink d="M104,56 L132,64" dash="4 5" />
      <Ink d="M124,86 L156,86 M147,79 L158,86 L148,94" color={INK_RED} width={2.4} />
      <path d="M172,38 H252 V78 H172 Z" stroke={INK_BLUE} strokeWidth={2} />
      <path d="M172,98 H252 V138 H172 Z" stroke={INK_BLUE} strokeWidth={2} />
      <path d="M212,78 V98" stroke={INK_BLUE} strokeWidth={2} />
      <HandText x={138} y={76} color={INK_RED} size={13}>tap</HandText>
    </svg>
  );
}

function DoodleShip() {
  return (
    <svg viewBox="0 0 280 170" className="block h-auto w-full" fill="none">
      <Ink d="M26,58 C52,54 76,55 98,58 C101,76 100,98 97,116 C74,120 50,119 28,116 C24,98 24,74 26,58 Z" />
      <Ink d="M40,80 L84,80 M40,96 L72,96" />
      <Ink d="M104,86 L148,86 M138,79 L150,86 L139,94" color={INK_RED} width={2.4} />
      <path d="M162,34 H254 V140 H162 Z" stroke={INK_PENCIL} strokeWidth={2} />
      <path d="M176,52 H240 M176,68 H226 M176,118 H232" stroke={INK_PENCIL} strokeWidth={1.6} />
      <Ink d="M176,84 C196,80 216,81 236,84 C238,90 237,98 235,104 C216,107 196,106 178,104 C175,98 175,90 176,84 Z" />
      <HandText x={168} y={28} color={INK_PENCIL} size={13}>README.md</HandText>
      <Ink d="M196,152 C204,158 212,158 220,152 M208,146 L208,158" color={INK_RED} />
    </svg>
  );
}

function WobblyBox({
  children,
  delay,
  reduce,
}: {
  children: ReactNode;
  delay: number;
  reduce: boolean;
}) {
  return (
    <div className="relative inline-flex w-full items-baseline gap-3 px-6 py-5">
      <svg
        aria-hidden
        viewBox="0 0 260 88"
        fill="none"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full text-text-heading"
      >
        <motion.path
          d="M10,14 C62,7 198,6 250,12 C257,32 255,62 248,78 C188,86 68,84 13,80 C5,58 5,34 10,14 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay, ease: "easeInOut" }}
        />
      </svg>
      {children}
    </div>
  );
}

function HandArrow({ delay, reduce }: { delay: number; reduce: boolean }) {
  const draw = (d: string, extraDelay = 0) => (
    <motion.path
      d={d}
      stroke="var(--color-accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
      initial={reduce ? false : { pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: delay + extraDelay, ease: "easeInOut" }}
    />
  );

  return (
    <svg
      aria-hidden
      viewBox="0 0 120 48"
      fill="none"
      className="hidden h-12 w-24 shrink-0 self-start md:mt-7 md:block"
    >
      {draw("M8,34 C36,42 72,36 106,18")}
      {draw("M94,12 L107,17 L99,29", 0.4)}
    </svg>
  );
}

/* ---------------------------- §3 · tool sheet ----------------------------- */

function ToolGlyph({ index }: { index: number }) {
  const glyphs = [
    "M12 4 C12.6 8 13.5 10.5 19.5 12 C13.5 13.5 12.6 16 12 20 C11.4 16 10.5 13.5 4.5 12 C10.5 10.5 11.4 8 12 4 Z",
    "M3.5 16 C5.5 11 7.5 18 9.5 13 C10.5 10.5 11.5 12 12 13 M15.5 10.5 L20.5 10.5 M15.5 14.8 L20.5 14.8",
    "M4 12 C4 7.5 9.5 7.5 12 12 C14.5 16.5 20 16.5 20 12 C20 7.5 14.5 7.5 12 12 C9.5 16.5 4 16.5 4 12",
    "M5.5 8 C8.5 7.6 11.5 7.7 14.5 8.1 L14.3 18 C11 18.4 8.2 18.3 5.7 17.9 Z M9 5 C12 4.7 15.5 4.8 18.5 5.2 L18.3 14.5",
    "M6 14 L6 18.5 C10 19 14 19 18 18.5 L18 14 M12 14 L12 4.5 M8.5 8 L12 4 L15.5 8",
    "M6 13.5 L6 18.5 C10 19 14 19 18 18.5 L18 13.5 M12 4 L12 12.5 M8.5 9.5 L12 13 L15.5 9.5",
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className="h-[22px] w-[22px] shrink-0"
    >
      <path
        d={glyphs[index]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToolsSection() {
  const reveal = useReveal();

  return (
    <section id="tools" className="border-b border-border-subtle">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-12 px-5 py-20 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-28">
        <motion.header {...reveal()} className="md:sticky md:top-24 md:self-start">
          <SectionTag no="§3">Tool sheet</SectionTag>
          <h2 className="font-display mt-4 text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[1.02] tracking-[-0.01em] text-text-heading">
            Six tools.
            <br />
            No ribbon menus.
          </h2>
          <p className="mt-5 max-w-[42ch] text-[14px] leading-7 text-text-secondary">
            Everything earns its keyboard shortcut. The canvas stays quiet
            until you reach for something.
          </p>
          <Link
            href="/dashboard"
            className="group mt-7 inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent"
          >
            Browse your pages in the dashboard
            <ArrowUpRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            spec sheet — rev 0.9
          </p>
        </motion.header>

        <ol className="border-t border-border-default">
          {tools.map((tool, i) => (
            <motion.li
              key={tool.title}
              {...reveal(i * 0.05)}
              className="group grid grid-cols-[44px_1fr] gap-x-4 gap-y-1.5 border-b border-border-default py-6 transition-colors duration-200 hover:bg-surface-raised/70 md:grid-cols-[56px_230px_1fr] md:gap-x-6 md:px-2"
            >
              <span className="font-mono text-[12px] text-text-muted transition-colors duration-200 group-hover:text-accent">
                0{i + 1}
              </span>
              <h3 className="flex items-start gap-2.5 font-display text-[20px] font-semibold leading-snug tracking-[-0.005em] text-text-heading">
                <span className="mt-0.5 text-text-muted transition-colors duration-200 group-hover:text-accent">
                  <ToolGlyph index={i} />
                </span>
                {tool.title}
              </h3>
              <p className="col-start-2 text-[14px] leading-6 text-text-secondary md:col-start-3">
                {tool.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------- §4 · before/after ---------------------------- */

function ShowcaseSection() {
  const reveal = useReveal();
  const { resolvedTheme, mounted } = useAppTheme();

  const isDark = mounted && resolvedTheme === "dark";
  const imageSrc = isDark
    ? "/features/01-beautify-dark.png"
    : "/features/01-beautify-light.png";

  return (
    <section className="border-b border-border-subtle bg-surface-paper/60">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-12 px-5 py-20 md:grid-cols-[1.15fr_0.85fr] md:gap-16 md:py-28">
        <motion.figure {...reveal()} className="relative order-2 md:order-1">
          <div className="overflow-hidden rounded-sm border border-border-strong bg-surface-raised shadow-elev-3">
            <Image
              src={imageSrc}
              alt="The same hand-drawn diagram before and after AI beautify: aligned boxes, straightened arrows"
              width={1280}
              height={920}
              className="h-auto w-full"
              unoptimized
            />
          </div>
          <figcaption className="mt-3.5 font-mono text-[11px] text-text-muted">
            <span className="text-accent">fig. 02</span> — beautify: same
            diagram, eight seconds later.
          </figcaption>
        </motion.figure>

        <motion.div {...reveal(0.08)} className="order-1 max-w-lg md:order-2">
          <SectionTag no="§4">Before / after</SectionTag>
          <h2 className="font-display mt-4 text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[1] tracking-[-0.01em] text-text-heading">
            Rough is a feature.
          </h2>
          <p className="mt-5 text-[15px] leading-8 text-text-body">
            Early thinking should look early — polish too soon and you stop
            questioning it. Sketch Forge never cleans up behind you. When a
            diagram graduates into a doc, beautify it on your own Gemini key,
            straight from the browser.
          </p>
          <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            your key · your canvas · your call
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------- §5 · faq --------------------------------- */

function FAQSection() {
  const reveal = useReveal();

  return (
    <section id="faq" className="border-b border-border-subtle">
      <div className="mx-auto max-w-[1320px] px-5 py-20 md:py-28">
        <motion.header {...reveal()}>
          <SectionTag no="§5">Margin notes</SectionTag>
          <h2 className="font-display mt-4 text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[1] tracking-[-0.01em] text-text-heading">
            Asked in the margins.
          </h2>
        </motion.header>

        <div className="mt-14 grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
          {faqs.map((faq, i) => (
            <motion.div key={faq.q} {...reveal((i % 2) * 0.06)}>
              <p className="font-mono text-[11px] text-accent">Q.0{i + 1}</p>
              <h3 className="mt-2.5 text-[16.5px] font-semibold tracking-[-0.01em] text-text-heading">
                {faq.q}
              </h3>
              <p className="mt-2 max-w-[56ch] text-[14px] leading-7 text-text-secondary">
                {faq.a}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- §6 · cta --------------------------------- */

function CTASection() {
  const reveal = useReveal();

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-paper-grid"
        style={{
          maskImage:
            "radial-gradient(110% 100% at 25% 100%, black 25%, transparent 75%)",
        }}
      />
      <CTADoodles />
      <div className="relative mx-auto max-w-[1320px] px-5 py-24 md:py-36">
        <motion.div {...reveal()}>
          <SectionTag no="§6">Last page</SectionTag>
          <h2 className="font-display mt-5 max-w-[14ch] text-[clamp(3rem,8vw,6.5rem)] font-semibold leading-[0.96] tracking-[-0.01em] text-text-heading">
            Start a page.
          </h2>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-8 text-text-body">
            The canvas opens in about a second. No account, no template picker,
            no onboarding tour — just paper that doesn&apos;t end.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-4">
            <Link
              href="/canvas"
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-6 text-[15px] font-semibold text-accent-text transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0 active:scale-[0.98]"
            >
              Open the canvas
              <ArrowRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
            <span
              aria-hidden
              className="font-handwriting rotate-[-2deg] text-[16px] text-accent"
            >
              ← no signup, just draw
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTADoodles() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 420 300"
      fill="none"
      className="pointer-events-none absolute right-[3%] top-1/2 hidden w-[380px] -translate-y-1/2 text-border-strong lg:block"
    >
      <Ink d="M60,60 C100,54 140,56 174,60 C177,80 176,104 173,122 C140,126 104,125 64,122 C58,102 58,78 60,60 Z" color="currentColor" />
      <Ink d="M250,150 C290,144 330,146 364,150 C367,170 366,194 363,212 C330,216 294,215 254,212 C248,192 248,168 250,150 Z" color="currentColor" />
      <Ink d="M180,96 C212,108 232,126 248,148 M240,136 L250,150 L234,152" color="currentColor" />
      <Ink d="M330,52 L336,72 L356,74 L342,87 L346,107 L330,95 L314,107 L318,87 L304,74 L324,72 Z" color={INK_RED} width={1.8} />
      <Ink d="M84,206 C84,188 112,184 116,202 C120,222 88,228 84,210 C81,196 92,188 104,190" color="currentColor" />
    </svg>
  );
}
