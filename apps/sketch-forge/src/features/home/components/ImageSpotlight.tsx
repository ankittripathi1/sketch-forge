"use client";

import Image from "next/image";
import type { PointerEvent } from "react";

export function ImageSpotlight({ src, alt }: { src: string; alt: string }) {
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--image-spot-x",
      `${((event.clientX - bounds.left) / bounds.width) * 100}%`,
    );
    event.currentTarget.style.setProperty(
      "--image-spot-y",
      `${((event.clientY - bounds.top) / bounds.height) * 100}%`,
    );
  }

  return (
    <div className="image-spotlight" onPointerMove={handlePointerMove}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 58vw"
        className="image-spotlight-base object-cover"
      />
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 768px) 100vw, 58vw"
        className="image-spotlight-focus object-cover"
      />
    </div>
  );
}
