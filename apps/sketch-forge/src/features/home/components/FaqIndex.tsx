"use client";

import { ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const faqs = [
  {
    question: "Do I need an account?",
    answer:
      "No. Open the canvas and start drawing. An account only matters when you want to sync pages across devices.",
  },
  {
    question: "Does it work offline?",
    answer: "Yes. Pages save locally first and sync when you are back online.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your sketches stay on your device by default. AI features run only when you trigger them.",
  },
  {
    question: "What powers the AI features?",
    answer:
      "You bring your own Gemini API key. Requests go directly from your browser to Google.",
  },
  {
    question: "What can I export?",
    answer:
      "Export a page as PNG, SVG, or raw JSON, then use it wherever you work.",
  },
  {
    question: "Is it free?",
    answer: "The beta is free, and everything you make remains portable.",
  },
] as const;

gsap.registerPlugin(useGSAP);

export function FaqIndex() {
  const [active, setActive] = useState(0);
  const answer = useRef<HTMLDivElement>(null);
  const activeFaq = faqs[active] ?? faqs[0]!;

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          answer.current,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.42, ease: "power3.out" },
        );
      });
      return () => media.revert();
    },
    { dependencies: [active], revertOnUpdate: true },
  );

  return (
    <div className="faq-index">
      <div className="faq-index-list" role="group" aria-label="Questions">
        {faqs.map(({ question }, index) => (
          <button
            key={question}
            id={`faq-tab-${index}`}
            type="button"
            aria-pressed={active === index}
            className={active === index ? "is-active" : ""}
            onClick={() => setActive(index)}
          >
            <span>{question}</span>
            <ArrowUpRight size={17} strokeWidth={1.6} aria-hidden />
          </button>
        ))}
      </div>

      <div
        ref={answer}
        id="faq-answer"
        role="region"
        aria-live="polite"
        aria-labelledby={`faq-tab-${active}`}
        className="faq-index-answer"
      >
        <p className="faq-index-question">{activeFaq.question}</p>
        <p>{activeFaq.answer}</p>
      </div>
    </div>
  );
}
