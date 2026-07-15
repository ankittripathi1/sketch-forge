"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Braces,
  GraduationCap,
  MessagesSquare,
  Presentation,
  ArrowUpRight,
} from "lucide-react";

const audiences = [
  {
    title: "Software engineers",
    body: "Architecture maps, incident flows, and RFC sketches.",
    statement: "Turn a dependency tangle into a system you can explain.",
    icon: Braces,
  },
  {
    title: "Engineering students",
    body: "Lecture notes, derivations, and algorithm traces.",
    statement: "Keep the derivation next to the intuition that unlocked it.",
    icon: GraduationCap,
  },
  {
    title: "Interview candidates",
    body: "System design rounds and whiteboard practice.",
    statement: "Practice the system, not the choreography of drawing it.",
    icon: MessagesSquare,
  },
  {
    title: "Technical educators",
    body: "Explanations that stay visual when they travel.",
    statement: "Build an explanation that still works after the room is gone.",
    icon: Presentation,
  },
] as const;

gsap.registerPlugin(useGSAP);

export function AudienceSpotlight() {
  const root = useRef<HTMLDivElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeAudience = audiences[activeIndex] ?? audiences[0];
  const ActiveIcon = activeAudience.icon;

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const tiles = gsap.utils.toArray<HTMLElement>(".audience-tile-persona");
        gsap.to(tiles, {
          y: (index) => (index === activeIndex ? -7 : 0),
          scale: (index) => (index === activeIndex ? 1.012 : 1),
          duration: 0.52,
          ease: "power3.out",
          overwrite: true,
        });
        gsap.fromTo(
          statement.current,
          { autoAlpha: 0, y: 13 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.46,
            ease: "power3.out",
          },
        );
      });
      return () => media.revert();
    },
    { dependencies: [activeIndex], scope: root, revertOnUpdate: true },
  );

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--spot-x",
      `${event.clientX - bounds.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--spot-y",
      `${event.clientY - bounds.top}px`,
    );
  }

  return (
    <div
      ref={root}
      className="audience-mosaic"
      onPointerMove={handlePointerMove}
    >
      <article className="audience-tile audience-tile-statement">
        <div className="audience-statement-context" aria-live="polite">
          <ActiveIcon size={19} strokeWidth={1.6} aria-hidden />
          <span>{activeAudience.title}</span>
        </div>
        <p ref={statement}>{activeAudience.statement}</p>
        <div className="audience-statement-track" aria-hidden>
          {audiences.map(({ title }, index) => (
            <span
              key={title}
              className={index === activeIndex ? "is-active" : ""}
            />
          ))}
        </div>
      </article>

      {audiences.map(({ title, body, icon: Icon }, index) => (
        <button
          type="button"
          className={`audience-tile audience-tile-persona ${
            index === activeIndex ? "is-active" : ""
          }`}
          key={title}
          aria-pressed={index === activeIndex}
          onPointerEnter={() => setActiveIndex(index)}
          onFocus={() => setActiveIndex(index)}
          onClick={() => setActiveIndex(index)}
        >
          <span className="audience-tile-icon" aria-hidden>
            <Icon size={19} strokeWidth={1.55} />
          </span>
          <span>
            <span className="audience-tile-title">{title}</span>
            <span className="audience-tile-body">{body}</span>
          </span>
          <span className="audience-tile-arrow" aria-hidden>
            <ArrowUpRight size={16} strokeWidth={1.6} />
          </span>
        </button>
      ))}
    </div>
  );
}
