import type { ReadonlyElement } from "@repo/canvas-engine";
import { DEFAULT_DARK_STROKE, DEFAULT_LIGHT_STROKE } from "@repo/common";

export type ThemeThumbnails = { light: string | null; dark: string | null };

const THUMBNAIL_BACKGROUND = { light: "#f9f9f7", dark: "#111012" } as const;

function elementsForThumbnailMode(
  elements: readonly ReadonlyElement[],
  mode: "light" | "dark",
) {
  const fromColor =
    mode === "dark" ? DEFAULT_LIGHT_STROKE : DEFAULT_DARK_STROKE;
  const toColor = mode === "dark" ? DEFAULT_DARK_STROKE : DEFAULT_LIGHT_STROKE;

  return elements.map((element) =>
    element.strokeColor?.toLowerCase() === fromColor.toLowerCase()
      ? { ...element, strokeColor: toColor }
      : element,
  );
}

/**
 * Renders light and dark page thumbnails in a web worker. The worker starts on
 * the first `render` and `dispose` stops it; a later `render` starts a new one.
 * Calls must not overlap: a page session saves one at a time, so they don't.
 */
export function createWorkerThumbnails() {
  let worker: Worker | null = null;
  // Settles the render in flight, so `dispose` never leaves a save waiting.
  let settle: ((thumbnail: string | null) => void) | null = null;

  function renderOne(
    elements: readonly ReadonlyElement[],
    backgroundColor: string,
  ): Promise<string | null> {
    worker ??= new Worker(
      new URL("../workers/thumbnail.worker.ts", import.meta.url),
    );
    const current = worker;
    return new Promise((resolve) => {
      const handleMessage = (e: MessageEvent) => {
        if (e.data.error) {
          console.error("Thumbnail worker error:", e.data.error);
          done(null);
        } else {
          done(e.data.thumbnail);
        }
      };
      const handleError = () => done(null);
      const done = (thumbnail: string | null) => {
        current.removeEventListener("message", handleMessage);
        current.removeEventListener("error", handleError);
        settle = null;
        resolve(thumbnail);
      };
      settle = done;
      current.addEventListener("message", handleMessage);
      current.addEventListener("error", handleError);
      current.postMessage({
        elements,
        options: { width: 400, height: 300, padding: 20, backgroundColor },
      });
    });
  }

  return {
    async render(
      elements: readonly ReadonlyElement[],
    ): Promise<ThemeThumbnails> {
      const light = await renderOne(
        elementsForThumbnailMode(elements, "light"),
        THUMBNAIL_BACKGROUND.light,
      );
      const dark = await renderOne(
        elementsForThumbnailMode(elements, "dark"),
        THUMBNAIL_BACKGROUND.dark,
      );
      return { light, dark };
    },
    dispose() {
      settle?.(null);
      worker?.terminate();
      worker = null;
    },
  };
}
