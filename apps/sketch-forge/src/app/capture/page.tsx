"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  useEditorSelector,
  useSketchEngine,
  type ReadonlyElement,
} from "@repo/canvas-engine";
import { SketchCanvas } from "@/features/canvas";
import { CaptureToolbar, FolderPicker } from "@/features/capture";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PUBLIC_API_URL } from "@/api/config";

export default function QuickCapturePage() {
  const router = useRouter();
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const { editor } = useSketchEngine(sceneCanvasRef, interactiveCanvasRef);
  const tool = useEditorSelector(editor, (s) => s.activeTool);
  const canUndo = useEditorSelector(editor, (s) => s.canUndo);
  const { strokeColor, strokeWidth } = useEditorSelector(
    editor,
    (s) => s.currentItemStyle,
  );

  // Initialize Worker for thumbnail generation
  useEffect(() => {
    workerRef.current = new Worker(
      new URL(
        "../../features/canvas/workers/thumbnail.worker.ts",
        import.meta.url,
      ),
    );
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const generateThumbnail = useCallback(
    (elements: readonly ReadonlyElement[]): Promise<string | null> => {
      return new Promise((resolve) => {
        if (!workerRef.current) return resolve(null);

        const handleMessage = (e: MessageEvent) => {
          workerRef.current?.removeEventListener("message", handleMessage);
          if (e.data.error) {
            console.error("Thumbnail worker error:", e.data.error);
            resolve(null);
          } else {
            resolve(e.data.thumbnail);
          }
        };

        workerRef.current.addEventListener("message", handleMessage);
        workerRef.current.postMessage({
          elements,
          options: {
            width: 400,
            height: 300,
            padding: 20,
            backgroundColor: "#f9f9f7",
          },
        });
      });
    },
    [],
  );

  const handleSave = async (folderId: string | null) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const thumbnail = await generateThumbnail(editor.getElements());

      const response = await fetch(`${PUBLIC_API_URL}/pages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Quick Capture ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          elements: editor.getElements(),
          folderId,
          thumbnail,
        }),
        credentials: "include",
      });

      if (response.ok) {
        router.push(folderId ? `/dashboard/folder/${folderId}` : "/dashboard");
      } else {
        console.error("Failed to save capture");
        setIsSaving(false);
      }
    } catch (error) {
      console.error("Error during save:", error);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f9f9f7] touch-none">
      {/* Minimal Header */}
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h1 className="text-sm font-bold tracking-tight text-[oklch(0.25_0.01_260)] uppercase">
          Quick Capture
        </h1>
      </div>

      <SketchCanvas
        editor={editor}
        sceneCanvasRef={sceneCanvasRef}
        interactionCanvasRef={interactiveCanvasRef}
      />

      <CaptureToolbar
        tool={tool}
        setTool={editor.setTool}
        strokeColor={strokeColor}
        setStrokeColor={(color) => editor.setStyle({ strokeColor: color })}
        strokeWidth={strokeWidth}
        setStrokeWidth={(width) => editor.setStyle({ strokeWidth: width })}
        onUndo={editor.undo}
        canUndo={canUndo}
        onDone={() => setIsFolderPickerOpen(true)}
      />

      <FolderPicker
        isOpen={isFolderPickerOpen}
        onClose={() => setIsFolderPickerOpen(false)}
        onSelect={handleSave}
      />

      {isSaving && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-[oklch(0.12_0.01_260)] border border-[oklch(0.18_0.01_260)] shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-[oklch(0.82_0.14_88)]" />
            <p className="text-sm font-bold text-[oklch(0.95_0.005_260)]">
              Saving your sketch...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
