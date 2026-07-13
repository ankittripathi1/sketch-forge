"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export function HomeHero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          defaults: { duration: 0.85, ease: "power3.out" },
        });

        timeline
          .from(".hero-copy > *", {
            autoAlpha: 0,
            y: 34,
            stagger: 0.08,
          })
          .from(
            ".hero-product",
            { autoAlpha: 0, y: 48, rotation: 1.5, scale: 0.95 },
            "<0.18",
          );

        const stage = root.current?.querySelector<HTMLElement>(
          ".hero-product-stage",
        );
        const product =
          root.current?.querySelector<HTMLElement>(".hero-product");

        if (
          !stage ||
          !product ||
          window.matchMedia("(pointer: coarse)").matches
        ) {
          return;
        }

        const rotateX = gsap.quickTo(product, "rotationX", {
          duration: 0.7,
          ease: "power3.out",
        });
        const rotateY = gsap.quickTo(product, "rotationY", {
          duration: 0.7,
          ease: "power3.out",
        });
        const x = gsap.quickTo(product, "x", {
          duration: 0.7,
          ease: "power3.out",
        });
        const y = gsap.quickTo(product, "y", {
          duration: 0.7,
          ease: "power3.out",
        });

        const onPointerMove = (event: PointerEvent) => {
          const bounds = stage.getBoundingClientRect();
          const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
          const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;

          rotateX(vertical * -4.5);
          rotateY(horizontal * 5.5);
          x(horizontal * 10);
          y(vertical * 8);
        };

        const onPointerLeave = () => {
          rotateX(0);
          rotateY(0);
          x(0);
          y(0);
        };

        stage.addEventListener("pointermove", onPointerMove);
        stage.addEventListener("pointerleave", onPointerLeave);

        return () => {
          stage.removeEventListener("pointermove", onPointerMove);
          stage.removeEventListener("pointerleave", onPointerLeave);
        };
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="home-hero relative px-5 md:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-72px)] w-full max-w-[1440px] items-center gap-10 py-10 md:py-14 lg:grid-cols-[0.74fr_1.26fr] lg:gap-8">
        <div className="hero-copy relative max-w-[630px] lg:pb-8">
          <p className="home-kicker">Visual notebook for technical minds</p>
          <h1 className="home-hero-heading mt-6">
            Think in systems.
            <span>Draw in space.</span>
          </h1>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-7 text-text-body md:text-[17px]">
            Capture diagrams, code, and rough notes on one infinite canvas built
            for technical work.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href="/canvas" className="home-button group">
              Start drawing
              <ArrowRight
                size={16}
                strokeWidth={1.8}
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link href="#flow" className="home-text-link group">
              <Play
                size={15}
                fill="currentColor"
                strokeWidth={1.5}
                aria-hidden
              />
              See the canvas
            </Link>
          </div>
        </div>

        <div className="hero-product-stage relative min-w-0 py-5 lg:py-10">
          <div aria-hidden className="hero-orbit hero-orbit-one" />
          <div aria-hidden className="hero-orbit hero-orbit-two" />
          <figure className="hero-product">
            <div className="hero-product-frame">
              <Image
                src="/canvas-light.png"
                alt="Sketch Forge canvas showing a technical diagram and drawing tools"
                fill
                priority
                sizes="(max-width: 1024px) 94vw, 62vw"
                className="img-light object-cover object-left-top"
              />
              <Image
                src="/canvas-dark.png"
                alt=""
                aria-hidden
                fill
                priority
                sizes="(max-width: 1024px) 94vw, 62vw"
                className="img-dark object-cover object-left-top"
              />
            </div>
            <figcaption>
              Real canvas, shown as it works. No staged dashboard mockup.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
