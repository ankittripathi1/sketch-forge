"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const story = [
  {
    title: "Capture",
    body: "Ink, text, code, arrows, and images share the same surface.",
    detail: "Start before the thought becomes a document.",
  },
  {
    title: "Shape",
    body: "Align what matters while the rest keeps its hand-drawn character.",
    detail: "Structure appears only when you ask for it.",
  },
  {
    title: "Carry forward",
    body: "Export the idea without rebuilding it in another tool.",
    detail: "PNG, SVG, and JSON keep the work portable.",
  },
] as const;

export function CanvasShowcase() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const steps = gsap.utils.toArray<HTMLElement>(".canvas-story-step");
        const image = root.current?.querySelector<HTMLElement>(
          ".canvas-showcase-media",
        );

        const activate = (activeIndex: number) => {
          steps.forEach((step, index) => {
            step.classList.toggle("is-active", index === activeIndex);
          });

          if (!image) return;
          const transforms = [
            { xPercent: 0, yPercent: 0, scale: 1.015 },
            { xPercent: -1.3, yPercent: 0.6, scale: 1.045 },
            { xPercent: 0.8, yPercent: -0.5, scale: 1.025 },
          ];
          gsap.to(image, {
            ...transforms[activeIndex],
            duration: 0.8,
            ease: "power3.out",
            overwrite: true,
          });
        };

        activate(0);
        steps.forEach((step, index) => {
          ScrollTrigger.create({
            trigger: step,
            start: "top 62%",
            onEnter: () => activate(index),
            onEnterBack: () => activate(index),
          });
        });
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="canvas-story" aria-label="Canvas workflow">
      <figure className="canvas-story-visual">
        <div className="canvas-showcase-frame">
          <div className="canvas-showcase-media absolute inset-0">
            <Image
              src="/canvas-light.png"
              alt="Sketch Forge infinite canvas with drawing, text, and diagram tools"
              fill
              sizes="(max-width: 768px) 96vw, 920px"
              className="img-light object-cover object-left-top"
            />
            <Image
              src="/canvas-dark.png"
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 768px) 96vw, 920px"
              className="img-dark object-cover object-left-top"
            />
          </div>
        </div>
        <figcaption>
          The same canvas carries the thought from first mark to export.
        </figcaption>
      </figure>

      <div className="canvas-story-steps">
        {story.map(({ title, body, detail }, index) => (
          <article
            key={title}
            className={`canvas-story-step ${index === 0 ? "is-active" : ""}`}
          >
            <span className="canvas-story-rule" aria-hidden />
            <h3>{title}</h3>
            <p>{body}</p>
            <p className="canvas-story-detail">{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
