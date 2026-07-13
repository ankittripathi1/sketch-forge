import Link from "next/link";
import {
  ArrowRight,
  Blocks,
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
      <Faq />
      <Closing />
    </main>
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
