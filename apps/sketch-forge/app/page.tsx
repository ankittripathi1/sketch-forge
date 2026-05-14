import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, PenLine, Smartphone, Sparkles, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Sketch Forge — Draw, Write, Organize",
  description:
    "An infinite canvas for sketching diagrams and taking notes. Works on any device.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[oklch(0.09_0.01_260)] text-[oklch(0.92_0.005_260)]">
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <ComingSoon />
      <Footer />
    </div>
  );
}

/* ─── Nav ─────────────────────────────────────────────────────────────────── */

function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-[oklch(0.18_0.01_260/0.8)] bg-[oklch(0.09_0.01_260/0.75)] px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[oklch(0.82_0.14_88)] shadow-[0_2px_8px_oklch(0.82_0.14_88/0.4)]">
          <PenLine size={13} strokeWidth={2.5} className="text-[oklch(0.15_0.01_88)]" />
        </div>
        <span
          className="text-[18px] font-bold tracking-tight text-[oklch(0.94_0.005_260)]"
          style={{ fontFamily: "Kalam, cursive" }}
        >
          sketch forge
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/canvas"
          className="hidden text-[13px] text-[oklch(0.55_0.01_260)] transition-colors hover:text-[oklch(0.82_0.14_88)] sm:block"
        >
          Try the canvas
        </Link>
        <Link
          href="/canvas"
          className="flex items-center gap-1.5 rounded-xl bg-[oklch(0.82_0.14_88)] px-4 py-2 text-[13px] font-semibold text-[oklch(0.12_0.01_88)] shadow-[0_4px_16px_oklch(0.82_0.14_88/0.25)] transition-all hover:bg-[oklch(0.88_0.15_88)] active:scale-95"
        >
          Open Canvas
          <ArrowRight size={12} strokeWidth={2.5} />
        </Link>
      </div>
    </nav>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden pt-16"
      style={{
        backgroundImage: `
          linear-gradient(oklch(0.22 0.01 260 / 0.45) 1px, transparent 1px),
          linear-gradient(90deg, oklch(0.22 0.01 260 / 0.45) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    >
      {/* ambient glows */}
      <div className="pointer-events-none absolute left-[10%] top-1/3 h-[600px] w-[600px] rounded-full bg-[oklch(0.82_0.14_88/0.05)] blur-[130px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-[5%] h-[500px] w-[500px] rounded-full bg-[oklch(0.55_0.18_280/0.06)] blur-[100px]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-8">
        {/* Left: copy */}
        <div className="flex flex-col">
          <div className="mb-7 inline-flex items-center gap-2 self-start rounded-full border border-[oklch(0.82_0.14_88/0.25)] bg-[oklch(0.82_0.14_88/0.07)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[oklch(0.82_0.14_88)]">
            <Sparkles size={10} strokeWidth={2.5} />
            Free · Open source · No signup
          </div>

          <h1
            className="mb-5 text-[clamp(48px,6vw,72px)] font-bold leading-[1.05] text-[oklch(0.96_0.005_260)]"
            style={{ fontFamily: "Kalam, cursive" }}
          >
            Sketch freely.
            <br />
            <span className="text-[oklch(0.82_0.14_88)]">Think clearly.</span>
          </h1>

          <p className="mb-8 max-w-[420px] text-[17px] leading-[1.7] text-[oklch(0.55_0.01_260)]">
            Draw diagrams and write notes in one infinite canvas. Works
            beautifully on your phone, tablet, and desktop.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/canvas"
              className="flex items-center gap-2 rounded-2xl bg-[oklch(0.82_0.14_88)] px-6 py-3.5 text-[15px] font-bold text-[oklch(0.12_0.01_88)] shadow-[0_8px_32px_oklch(0.82_0.14_88/0.3)] transition-all hover:bg-[oklch(0.88_0.15_88)] active:scale-95"
            >
              Start sketching free
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
            <a
              href="#how-it-works"
              className="rounded-2xl border border-[oklch(0.25_0.012_260)] px-6 py-3.5 text-[15px] font-medium text-[oklch(0.58_0.01_260)] transition-all hover:border-[oklch(0.38_0.012_260)] hover:text-[oklch(0.82_0.005_260)]"
            >
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="mt-10 flex items-center gap-8 border-t border-[oklch(0.18_0.01_260)] pt-8">
            {[
              { num: "∞", label: "Canvas size" },
              { num: "0s", label: "Setup needed" },
              { num: "All", label: "Devices" },
            ].map(({ num, label }) => (
              <div key={label} className="flex flex-col">
                <span
                  className="text-[28px] font-bold text-[oklch(0.92_0.005_260)]"
                  style={{ fontFamily: "Kalam, cursive" }}
                >
                  {num}
                </span>
                <span className="mt-0.5 text-[12px] text-[oklch(0.42_0.008_260)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mockup */}
        <div className="flex justify-center lg:justify-end">
          <CanvasMockup />
        </div>
      </div>
    </section>
  );
}

/* ─── Canvas Mockup ───────────────────────────────────────────────────────── */

function CanvasMockup() {
  return (
    <div
      className="relative w-full max-w-[520px] overflow-hidden rounded-3xl border border-[oklch(0.28_0.012_260)] shadow-[0_40px_100px_oklch(0_0_0/0.65),0_0_0_1px_oklch(1_0_0/0.04)]"
      style={{
        transform: "perspective(1200px) rotateY(-8deg) rotateX(3deg)",
        aspectRatio: "4/3",
      }}
    >
      {/* grid bg */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#f8f8f6",
          backgroundImage: `
            linear-gradient(#d8dae2 1px, transparent 1px),
            linear-gradient(90deg, #d8dae2 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* mini toolbar */}
      <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl bg-[oklch(0.18_0.012_260)] px-3 py-2 shadow-[0_4px_16px_oklch(0_0_0/0.4)]">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[oklch(0.82_0.14_88)]">
          <div className="h-3 w-3 rounded-sm border-[2px] border-[oklch(0.15_0.01_88)]" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-7 w-7 rounded-lg bg-[oklch(0.25_0.012_260)]"
          />
        ))}
        <div className="mx-1 h-4 w-px bg-[oklch(0.3_0.01_260)]" />
        <div className="h-7 w-7 rounded-lg bg-[oklch(0.25_0.012_260)]" />
        <div className="h-7 w-7 rounded-lg bg-[oklch(0.25_0.012_260)]" />
      </div>

      {/* drawing */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 520 390"
      >
        {/* rough rect — selected */}
        <path
          d="M 50 88 C 55 85,185 84,190 88 C 193 93,194 175,190 179 C 185 183,52 184,48 180 C 45 175,47 93,50 88 Z"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <text
          x="120"
          y="128"
          textAnchor="middle"
          style={{ fontFamily: "Kalam, cursive", fontSize: "14px", fill: "#2a2a4a" }}
        >
          User Auth
        </text>
        <text
          x="120"
          y="148"
          textAnchor="middle"
          style={{ fontFamily: "Kalam, cursive", fontSize: "11px", fill: "#8888a8" }}
        >
          login / signup
        </text>
        {/* selection box */}
        <rect
          x="43"
          y="82"
          width="152"
          height="102"
          rx="2"
          fill="none"
          stroke="#6366f1"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        {([
          [43, 82], [119, 82], [195, 82],
          [43, 133], [195, 133],
          [43, 184], [119, 184], [195, 184],
        ] satisfies [number, number][]).map(([x, y], i) => (
          <rect
            key={i}
            x={x - 4}
            y={y - 4}
            width="8"
            height="8"
            rx="2"
            fill="white"
            stroke="#6366f1"
            strokeWidth="1.5"
          />
        ))}

        {/* arrow rect → circle */}
        <path
          d="M 194 132 C 218 132,232 128,253 125"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 246 119 L 256 125 L 247 131"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* rough ellipse */}
        <path
          d="M 262 98 C 264 80,366 78,369 98 C 372 118,369 155,356 160 C 335 166,262 163,260 145 C 257 127,260 116,262 98 Z"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <text
          x="315"
          y="127"
          textAnchor="middle"
          style={{ fontFamily: "Kalam, cursive", fontSize: "14px", fill: "#2a2a4a" }}
        >
          Dashboard
        </text>

        {/* arrow circle → bottom rect */}
        <path
          d="M 315 163 C 315 176,315 190,315 204"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 309 199 L 315 208 L 321 199"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* bottom rect */}
        <path
          d="M 260 211 C 265 208,364 207,369 211 C 372 216,372 256,369 260 C 363 264,263 265,259 261 C 256 256,258 216,260 211 Z"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <text
          x="315"
          y="238"
          textAnchor="middle"
          style={{ fontFamily: "Kalam, cursive", fontSize: "14px", fill: "#2a2a4a" }}
        >
          Analytics
        </text>

        {/* yellow highlighter */}
        <path
          d="M 60 215 C 70 210,80 220,90 213 C 100 206,110 218,120 212 C 130 206,140 216,150 211"
          fill="none"
          stroke="#e8d95a"
          strokeWidth="13"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* note card */}
        <rect
          x="40"
          y="224"
          width="166"
          height="72"
          rx="6"
          fill="oklch(0.18 0.012 260)"
          opacity="0.92"
        />
        <rect
          x="40"
          y="224"
          width="166"
          height="72"
          rx="6"
          fill="none"
          stroke="oklch(0.3 0.01 260)"
          strokeWidth="1"
        />
        <text
          x="52"
          y="244"
          style={{ fontFamily: "Kalam, cursive", fontSize: "11px", fill: "oklch(0.72 0.01 260)" }}
        >
          📝 Notes
        </text>
        <text
          x="52"
          y="260"
          style={{ fontFamily: "Kalam, cursive", fontSize: "11px", fill: "oklch(0.52 0.01 260)" }}
        >
          Add JWT refresh logic
        </text>
        <text
          x="52"
          y="276"
          style={{ fontFamily: "Kalam, cursive", fontSize: "11px", fill: "oklch(0.52 0.01 260)" }}
        >
          Rate limit auth endpoint
        </text>
        <line
          x1="120"
          y1="224"
          x2="120"
          y2="184"
          stroke="oklch(0.38 0.01 260)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* right-side text list */}
        <path
          d="M 393 88 C 400 85,484 84,488 88"
          fill="none"
          stroke="#e8d95a"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.5"
        />
        <text
          x="440"
          y="94"
          textAnchor="middle"
          style={{ fontFamily: "Kalam, cursive", fontSize: "13px", fill: "#2a2a4a" }}
        >
          Key decisions
        </text>
        {["Use OAuth 2.0", "Postgres + Redis", "REST → GraphQL?"].map(
          (txt, i) => (
            <g key={txt}>
              <circle
                cx="398"
                cy={114 + i * 22}
                r="3"
                fill="#1a1a2e"
                opacity="0.4"
              />
              <text
                x="408"
                y={119 + i * 22}
                style={{
                  fontFamily: "Kalam, cursive",
                  fontSize: "12px",
                  fill: "#4a4a7a",
                }}
              >
                {txt}
              </text>
            </g>
          )
        )}
      </svg>

      {/* style panel peek */}
      <div className="absolute bottom-0 right-0 top-12 flex w-[58px] flex-col items-center gap-2 border-l border-[oklch(0.25_0.012_260)] bg-[oklch(0.18_0.012_260/0.95)] pt-3">
        <span className="text-[7px] font-semibold uppercase tracking-widest text-[oklch(0.42_0.008_260)]">
          Style
        </span>
        {[
          ["#1a1a2e", true],
          ["#e05c7a", false],
          ["#5a8ae8", false],
          ["#5ab98a", false],
        ].map(([color, active], i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded-full ${active ? "ring-2 ring-[oklch(0.82_0.14_88)] ring-offset-1 ring-offset-[oklch(0.18_0.012_260)]" : "ring-1 ring-[oklch(0_0_0/0.15)]"}`}
            style={{ backgroundColor: color as string }}
          />
        ))}
        <div className="mx-auto mt-2 h-px w-7 bg-[oklch(0.3_0.01_260)]" />
        <div className="h-1 w-8 rounded-full bg-[oklch(0.4_0.01_260)]" />
        <div className="h-2 w-8 rounded-full bg-[oklch(0.4_0.01_260)]" />
        <div className="h-3 w-8 rounded-full bg-[oklch(0.4_0.01_260)]" />
      </div>

      {/* bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[oklch(0.09_0.01_260/0.3)] to-transparent" />
    </div>
  );
}

/* ─── Features ────────────────────────────────────────────────────────────── */

function Features() {
  return (
    <section className="px-6 py-28" id="features">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2
            className="mb-4 text-[clamp(36px,4vw,52px)] font-bold text-[oklch(0.94_0.005_260)]"
            style={{ fontFamily: "Kalam, cursive" }}
          >
            Everything you need.
            <br />
            <span className="text-[oklch(0.62_0.01_260)]">
              Nothing you don&apos;t.
            </span>
          </h2>
          <p className="mx-auto max-w-sm text-[15px] text-[oklch(0.5_0.01_260)]">
            Built for the way you actually think — messy, nonlinear, full of
            connections.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Card 1 */}
          <FeatureCard
            icon={<PenLine size={20} strokeWidth={1.8} />}
            iconBg="bg-[oklch(0.82_0.14_88/0.1)]"
            iconColor="text-[oklch(0.82_0.14_88)]"
            title="Draw + Write"
            description="Mix hand-drawn diagrams with written notes in one infinite canvas. No more switching between apps."
          />
          {/* Card 2 */}
          <FeatureCard
            icon={<Smartphone size={20} strokeWidth={1.8} />}
            iconBg="bg-[oklch(0.6_0.2_280/0.1)]"
            iconColor="text-[oklch(0.7_0.15_280)]"
            title="Any Device"
            description="Phone, tablet, desktop — the canvas adapts to every screen size. Touch-first and keyboard-friendly."
          />
          {/* Card 3 */}
          <FeatureCard
            icon={<Sparkles size={20} strokeWidth={1.8} />}
            iconBg="bg-[oklch(0.75_0.18_160/0.1)]"
            iconColor="text-[oklch(0.75_0.18_160)]"
            title="AI Organize"
            description="Hit organize and watch your messy brainstorm turn into a beautiful, structured summary."
            badge="Coming soon"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-[oklch(0.2_0.01_260)] bg-[oklch(0.13_0.01_260)] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[oklch(0.3_0.012_260)]">
      <div
        className={`mb-5 flex h-10 w-10 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}
      >
        {icon}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <h3
          className="text-[22px] font-bold text-[oklch(0.92_0.005_260)]"
          style={{ fontFamily: "Kalam, cursive" }}
        >
          {title}
        </h3>
        {badge && (
          <span className="rounded-full border border-[oklch(0.75_0.18_160/0.25)] bg-[oklch(0.75_0.18_160/0.1)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.75_0.18_160)]">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[14px] leading-relaxed text-[oklch(0.5_0.01_260)]">
        {description}
      </p>
    </div>
  );
}

/* ─── How it works ────────────────────────────────────────────────────────── */

function HowItWorks() {
  return (
    <section
      className="px-6 py-28 bg-[oklch(0.11_0.01_260)]"
      id="how-it-works"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2
            className="mb-4 text-[clamp(36px,4vw,52px)] font-bold text-[oklch(0.94_0.005_260)]"
            style={{ fontFamily: "Kalam, cursive" }}
          >
            How it works
          </h2>
          <p className="text-[15px] text-[oklch(0.5_0.01_260)]">
            Three steps from chaos to clarity.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
          {/* connector line */}
          <div className="absolute left-[33%] right-[33%] top-8 hidden h-px bg-gradient-to-r from-transparent via-[oklch(0.82_0.14_88/0.4)] to-transparent md:block" />

          {[
            {
              num: "01",
              title: "Sketch it out",
              desc: "Open the canvas and start drawing. Rectangles, circles, freehand — whatever flows from your mind.",
            },
            {
              num: "02",
              title: "Add your notes",
              desc: "Type notes directly on the canvas, label diagrams, write your thinking as you go.",
            },
            {
              num: "03",
              title: "Hit Organize",
              desc: "One tap turns your messy session into a clean, structured, beautiful summary ready for sharing.",
            },
          ].map((step) => (
            <div
              key={step.num}
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[oklch(0.28_0.012_260)] bg-[oklch(0.18_0.012_260)] shadow-[0_8px_32px_oklch(0_0_0/0.35)]">
                  <span
                    className="text-[32px] font-bold text-[oklch(0.82_0.14_88)]"
                    style={{ fontFamily: "Kalam, cursive" }}
                  >
                    {step.num}
                  </span>
                </div>
              </div>
              <h3
                className="mb-3 text-[22px] font-bold text-[oklch(0.92_0.005_260)]"
                style={{ fontFamily: "Kalam, cursive" }}
              >
                {step.title}
              </h3>
              <p className="max-w-[220px] text-[14px] leading-relaxed text-[oklch(0.5_0.01_260)]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Coming Soon ─────────────────────────────────────────────────────────── */

function ComingSoon() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[oklch(0.6_0.18_280/0.3)] bg-[oklch(0.6_0.18_280/0.07)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[oklch(0.72_0.14_280)]">
          <Users size={11} strokeWidth={2.5} />
          Coming soon
        </div>

        <h2
          className="mb-4 text-[clamp(36px,4vw,52px)] font-bold leading-tight text-[oklch(0.94_0.005_260)]"
          style={{ fontFamily: "Kalam, cursive" }}
        >
          Real-time collaboration
          <br />
          <span className="text-[oklch(0.62_0.01_260)]">is coming.</span>
        </h2>

        <p className="mb-10 text-[16px] leading-relaxed text-[oklch(0.52_0.01_260)]">
          Sketch with your team in real time. Share a canvas, draw together,
          leave comments. Get notified when it ships.
        </p>

        <form
          className="mx-auto flex max-w-sm gap-2"
          action="#"
          method="post"
        >
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 rounded-2xl border border-[oklch(0.25_0.012_260)] bg-[oklch(0.15_0.01_260)] px-4 py-3 text-[14px] text-[oklch(0.88_0.005_260)] placeholder-[oklch(0.38_0.01_260)] transition-colors focus:border-[oklch(0.82_0.14_88/0.5)] focus:outline-none"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-2xl bg-[oklch(0.82_0.14_88)] px-5 py-3 text-[14px] font-semibold text-[oklch(0.12_0.01_88)] transition-all hover:bg-[oklch(0.88_0.15_88)] active:scale-95"
          >
            Notify me
          </button>
        </form>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-[oklch(0.18_0.01_260)] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[oklch(0.82_0.14_88)]">
            <PenLine
              size={11}
              strokeWidth={2.5}
              className="text-[oklch(0.15_0.01_88)]"
            />
          </div>
          <span
            className="text-[16px] text-[oklch(0.55_0.01_260)]"
            style={{ fontFamily: "Kalam, cursive" }}
          >
            sketch forge
          </span>
        </div>

        <span className="text-[13px] text-[oklch(0.35_0.01_260)]">
          Built for thinkers who draw.
        </span>

        <Link
          href="/canvas"
          className="text-[13px] text-[oklch(0.82_0.14_88)] transition-colors hover:text-[oklch(0.9_0.15_88)]"
        >
          Open Canvas →
        </Link>
      </div>
    </footer>
  );
}
