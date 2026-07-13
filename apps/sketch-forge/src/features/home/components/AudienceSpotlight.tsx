"use client";

import type { PointerEvent } from "react";

const audiences = [
  {
    title: "Software engineers",
    body: "Architecture maps, incident flows, and RFC sketches.",
  },
  {
    title: "Engineering students",
    body: "Lecture notes, derivations, and algorithm traces.",
  },
  {
    title: "Interview candidates",
    body: "System design rounds and whiteboard practice.",
  },
  {
    title: "Technical educators",
    body: "Explanations that stay visual when they travel.",
  },
] as const;

export function AudienceSpotlight() {
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
    <div className="audience-mosaic" onPointerMove={handlePointerMove}>
      <article className="audience-tile audience-tile-statement">
        <p>
          One surface for the moment an idea is messy and the moment it finally
          makes sense.
        </p>
      </article>

      {audiences.map(({ title, body }) => (
        <article className="audience-tile" key={title}>
          <h3>{title}</h3>
          <p>{body}</p>
        </article>
      ))}
    </div>
  );
}
