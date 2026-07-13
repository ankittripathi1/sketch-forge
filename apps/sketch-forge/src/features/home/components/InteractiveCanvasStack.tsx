"use client";

import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const SHEETS = [
  { x: 30, y: -18, rotation: 7, source: "texture" },
  { x: 14, y: -2, rotation: 3.5, source: "canvas" },
  { x: 0, y: 16, rotation: -1.5, source: "canvas" },
] as const;

export function InteractiveCanvasStack() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const container = root.current;
      if (!container) return;

      const sheets = gsap.utils.toArray<HTMLElement>(".canvas-sheet");
      gsap.set(sheets, {
        x: (index) => SHEETS[index]?.x ?? 0,
        y: (index) => SHEETS[index]?.y ?? 0,
        rotation: (index) => SHEETS[index]?.rotation ?? 0,
        transformPerspective: 900,
        transformOrigin: "50% 60%",
      });

      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia("(pointer: coarse)").matches
      ) {
        return;
      }

      const xSetters = sheets.map((sheet) =>
        gsap.quickTo(sheet, "x", { duration: 0.65, ease: "power3.out" }),
      );
      const ySetters = sheets.map((sheet) =>
        gsap.quickTo(sheet, "y", { duration: 0.65, ease: "power3.out" }),
      );
      const rotateXSetters = sheets.map((sheet) =>
        gsap.quickTo(sheet, "rotationX", {
          duration: 0.65,
          ease: "power3.out",
        }),
      );
      const rotateYSetters = sheets.map((sheet) =>
        gsap.quickTo(sheet, "rotationY", {
          duration: 0.65,
          ease: "power3.out",
        }),
      );

      const onPointerMove = (event: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const nx = (event.clientX - rect.left) / rect.width - 0.5;
        const ny = (event.clientY - rect.top) / rect.height - 0.5;

        sheets.forEach((_, index) => {
          const depth = (index + 1) / sheets.length;
          xSetters[index]?.((SHEETS[index]?.x ?? 0) + nx * 24 * depth);
          ySetters[index]?.((SHEETS[index]?.y ?? 0) + ny * 18 * depth);
          rotateXSetters[index]?.(-ny * 7 * depth);
          rotateYSetters[index]?.(nx * 9 * depth);
        });
      };

      const onPointerLeave = () => {
        sheets.forEach((_, index) => {
          xSetters[index]?.(SHEETS[index]?.x ?? 0);
          ySetters[index]?.(SHEETS[index]?.y ?? 0);
          rotateXSetters[index]?.(0);
          rotateYSetters[index]?.(0);
        });
      };

      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);

      return () => {
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
      };
    },
    { scope: root },
  );

  return (
    <figure className="canvas-stack-figure">
      <div
        ref={root}
        className="canvas-stack"
        aria-label="Layered preview of the Sketch Forge canvas"
      >
        {SHEETS.map((sheet, index) => (
          <div
            key={`${sheet.source}-${index}`}
            className={`canvas-sheet canvas-sheet-${index + 1}`}
          >
            {sheet.source === "texture" ? (
              <Image
                src="/hero_bg.png"
                alt=""
                aria-hidden
                fill
                loading="eager"
                sizes="(max-width: 1024px) 90vw, 52vw"
                className="object-cover"
              />
            ) : (
              <>
                <Image
                  src="/canvas-light.png"
                  alt={
                    index === SHEETS.length - 1
                      ? "Sketch Forge infinite canvas interface"
                      : ""
                  }
                  aria-hidden={index !== SHEETS.length - 1}
                  fill
                  loading="eager"
                  sizes="(max-width: 1024px) 90vw, 52vw"
                  className="img-light object-cover object-left-top"
                />
                <Image
                  src="/canvas-dark.png"
                  alt=""
                  aria-hidden
                  fill
                  loading="eager"
                  sizes="(max-width: 1024px) 90vw, 52vw"
                  className="img-dark object-cover object-left-top"
                />
              </>
            )}
          </div>
        ))}
      </div>
      <figcaption className="mt-7 max-w-[44ch] text-[13px] leading-6 text-text-secondary lg:ml-auto">
        One canvas for the rough sketch, the shaped system, and the version you
        share.
      </figcaption>
    </figure>
  );
}
