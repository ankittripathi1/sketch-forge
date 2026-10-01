"use client";

import { RefObject, useEffect } from "react";
import type { SketchEditor } from "@repo/canvas-engine";
import { Point } from "@repo/element/types";

interface SketchCanvasProps {
  editor: SketchEditor;
  sceneCanvasRef: RefObject<HTMLCanvasElement | null>;
  interactionCanvasRef: RefObject<HTMLCanvasElement | null>;
}

/** The point of a pointer event relative to the canvas's top-left corner. */
function localPoint(e: React.MouseEvent<HTMLElement>): Point {
  const rect = e.currentTarget.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/**
 * The two stacked canvases the editor draws on, plus the input surface that
 * feeds pointer, wheel and drop events straight to the editor.
 */
export function SketchCanvas({
  editor,
  sceneCanvasRef,
  interactionCanvasRef,
}: SketchCanvasProps) {
  useEffect(() => {
    const resize = () => {
      [sceneCanvasRef, interactionCanvasRef].forEach((ref) => {
        if (ref.current) {
          const canvas = ref.current;
          const dpr = window.devicePixelRatio || 1;
          const { width, height } = canvas.getBoundingClientRect();
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }
      });
      editor.redraw();
    };

    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, [editor, sceneCanvasRef, interactionCanvasRef]);

  return (
    <div
      className="absolute inset-0 w-full h-full touch-none"
      onPointerDown={(e) =>
        editor.pointerDown(localPoint(e), {
          button: e.button,
          shiftKey: e.shiftKey,
        })
      }
      onPointerMove={(e) => {
        const p = localPoint(e);
        editor.pointerMove(p);
        e.currentTarget.style.cursor = editor.getCursorForPoint(p);
      }}
      onPointerUp={() => editor.pointerUp()}
      onPointerLeave={() => editor.pointerLeave()}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          editor.zoomAt(e.deltaY * -0.001, localPoint(e));
        } else if (e.shiftKey) {
          editor.panBy(e.deltaX, 0);
        } else {
          editor.panBy(0, e.deltaY);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => editor.dropFiles(e.dataTransfer, localPoint(e))}
      onDoubleClick={(e) => editor.doubleClick(localPoint(e))}
    >
      <canvas
        ref={sceneCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
      <canvas
        ref={interactionCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
