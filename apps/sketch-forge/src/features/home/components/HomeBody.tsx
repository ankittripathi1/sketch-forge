import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Check,
  FileOutput,
  Search,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { AudienceSpotlight } from "./AudienceSpotlight";
import { CanvasShowcase } from "./CanvasShowcase";
import { FaqIndex } from "./FaqIndex";
import { GsapReveal } from "./GsapReveal";
import { ImageSpotlight } from "./ImageSpotlight";

const capabilities = [
  {
    title: "AI beautify",
    body: "Straighten structure while the sketch keeps its hand-drawn voice.",
    icon: Sparkles,
  },
  {
    title: "Canvas-aware search",
    body: "Find the diagram, phrase, or code fragment you remember.",
    icon: Search,
  },
  {
    title: "Pages and folders",
    body: "Keep a semester, interview loop, or codebase easy to revisit.",
    icon: Blocks,
  },
  {
    title: "Open export",
    body: "Move work into docs and READMEs as PNG, SVG, or JSON.",
    icon: FileOutput,
  },
  {
    title: "Offline-first",
    body: "Keep drawing through bad Wi-Fi, then sync when it returns.",
    icon: WifiOff,
  },
] as const;

export function HomeBody() {
  return (
    <main id="main-content">
      <Audience />
      <ProductFlow />
      <ToolField />
      <Pricing />
      <Faq />
      <Closing />
    </main>
  );
}

function Pricing() {
  const freeFeatures = [
    "Device-first canvas",
    "Local handwriting recognition",
    "PNG, SVG, and JSON export",
    "Optional bring-your-own AI key",
  ];
  const proFeatures = [
    "Everything in Free",
    "Hosted Claude with no API key setup",
    "AI beautify and handwriting recognition",
    "400 hosted AI actions each month",
  ];

  return (
    <section id="pricing" className="home-section px-5 md:px-8">
      <div className="pricing-layout mx-auto max-w-[1240px]">
        <GsapReveal className="pricing-intro">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Pricing
          </p>
          <h2 className="mt-5 max-w-[12ch] text-[clamp(2.4rem,5vw,4.25rem)] leading-[0.98] tracking-[-0.055em] text-text-heading">
            Start free. Pay when AI saves real time.
          </h2>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-7 text-text-body">
            The beta stays free. A hosted AI plan is planned for after beta,
            with a clear monthly allowance and no API key setup.
          </p>
        </GsapReveal>

        <div className="pricing-plans">
          <GsapReveal className="pricing-free" delay={0.04}>
            <div>
              <p className="pricing-kicker">Free beta</p>
              <p className="mt-2 text-[1.8rem] font-semibold tracking-[-0.045em] text-text-heading">
                $0
              </p>
              <p className="mt-1 text-[12px] text-text-muted">
                No card required
              </p>
            </div>
            <ul className="pricing-feature-grid">
              {freeFeatures.map((feature) => (
                <li key={feature}>
                  <Check size={14} aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/canvas"
              className="home-button home-button-small group"
            >
              Start drawing
              <ArrowRight
                size={14}
                strokeWidth={1.8}
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </GsapReveal>

          <GsapReveal className="pricing-pro" delay={0.08}>
            <div className="pricing-pro-head">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="pricing-kicker text-white/65">Pro</p>
                  <span className="rounded-full border border-white/18 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/70">
                    Planned after beta
                  </span>
                </div>
                <p className="mt-5 flex items-end gap-2 text-white">
                  <span className="text-[clamp(3rem,7vw,5.5rem)] font-semibold leading-none tracking-[-0.07em]">
                    $9
                  </span>
                  <span className="pb-1 text-[12px] text-white/60">
                    per month
                  </span>
                </p>
              </div>
              <p className="max-w-[31ch] text-[14px] leading-7 text-white/68">
                For frequent visual thinkers who want hosted AI without managing
                provider keys.
              </p>
            </div>

            <ul className="pricing-pro-features">
              {proFeatures.map((feature) => (
                <li key={feature}>
                  <Check size={15} aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pricing-pro-foot">
              <p>
                Pricing is based on a conservative Claude Haiku usage model.
                Allowance and launch details may change before billing ships.
              </p>
              <span>Coming after beta</span>
            </div>
          </GsapReveal>
        </div>
      </div>
    </section>
  );
}

function Audience() {
  return (
    <section id="who" className="home-section px-5 md:px-8">
      <div className="mx-auto max-w-[1240px]">
        <GsapReveal>
          <h2 className="home-section-heading max-w-[14ch]">
            Built for minds that think sideways.
          </h2>
          <p className="mt-5 max-w-[55ch] text-[16px] leading-8 text-text-body">
            Documents make ideas march in a line. Sketch Forge lets technical
            thinking branch, loop, and reconnect.
          </p>
        </GsapReveal>

        <GsapReveal className="mt-12 md:mt-18">
          <AudienceSpotlight />
        </GsapReveal>
      </div>
    </section>
  );
}

function ProductFlow() {
  return (
    <section id="flow" className="home-section px-5 md:px-8">
      <div className="mx-auto max-w-[1380px]">
        <GsapReveal className="mx-auto max-w-[900px] text-center">
          <h2 className="home-section-heading mx-auto max-w-[13ch]">
            Rough when you need speed. Precise when you need proof.
          </h2>
          <p className="mx-auto mt-5 max-w-[53ch] text-[16px] leading-8 text-text-body">
            Start with a mark, shape the system, then share a result that still
            feels like yours.
          </p>
        </GsapReveal>

        <CanvasShowcase />
      </div>
    </section>
  );
}

function ToolField() {
  return (
    <section id="tools" className="home-section px-5 md:px-8">
      <div className="tool-story mx-auto max-w-[1320px]">
        <GsapReveal className="tool-story-media">
          <ImageSpotlight
            src="/brand/redline-ribbon.webp"
            alt="A red translucent ribbon looping across a graphite drafting surface"
          />
          <p className="tool-story-caption">
            The redline is the signal: the idea is ready to be shaped.
          </p>
        </GsapReveal>

        <div className="tool-story-copy">
          <GsapReveal>
            <h2 className="home-section-heading max-w-[10ch]">
              Power that waits its turn.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-8 text-text-body">
              The canvas stays quiet until you ask it to organize, find, or
              export something.
            </p>
          </GsapReveal>

          <div className="capability-list mt-10">
            {capabilities.map(({ title, body, icon: Icon }, index) => (
              <GsapReveal key={title} delay={index * 0.045}>
                <article className="capability-row">
                  <Icon size={20} strokeWidth={1.55} aria-hidden />
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </article>
              </GsapReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="home-section px-5 md:px-8">
      <div className="mx-auto max-w-[1160px]">
        <GsapReveal>
          <h2 className="home-section-heading max-w-[12ch]">
            The practical details.
          </h2>
          <p className="mt-5 max-w-[48ch] text-[15px] leading-7 text-text-body">
            Start without ceremony. Keep control of what you make.
          </p>
        </GsapReveal>
        <GsapReveal className="mt-12 md:mt-16">
          <FaqIndex />
        </GsapReveal>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="px-5 py-24 md:px-8 md:py-36">
      <GsapReveal className="home-closing mx-auto max-w-[1260px]">
        <div>
          <h2 className="home-closing-heading">
            Your next idea needs more room than a document.
          </h2>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-8 text-text-body">
            Open a blank canvas and make the first mark. No account required.
          </p>
        </div>
        <Link href="/canvas" className="home-button home-button-large group">
          Open Sketch Forge
          <ArrowRight
            size={18}
            strokeWidth={1.8}
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </GsapReveal>
    </section>
  );
}
