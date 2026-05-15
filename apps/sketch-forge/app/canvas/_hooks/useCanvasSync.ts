"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SketchElement } from "@repo/canvas-core/types";

interface UseCanvasSyncProps {
  elementsRef: React.MutableRefObject<SketchElement[]>;
  setElements: (elements: SketchElement[]) => void;
}

export function useCanvasSync({
  elementsRef,
  setElements,
}: UseCanvasSyncProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const routePageId = searchParams.get("pageId");
  const routeId = searchParams.get("id");
  const pageIdFromUrl =
    routePageId || (typeParam === "page" ? routeId : null);
  const canvasIdFromUrl = typeParam === "canvas" ? routeId : pageIdFromUrl;
  const entityType = typeParam === "canvas" ? "canvases" : "pages";
  const requestedFolderId = searchParams.get("folderId");

  const [canvasId, setCanvasId] = useState<string | null>(canvasIdFromUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [title, setTitle] = useState("Untitled");
  const [folderId, setFolderId] = useState<string | null>(requestedFolderId);
  const [saveRevision, setSaveRevision] = useState(0);
  const [isDirtyState, setIsDirtyState] = useState(false);

  const isDirtyRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTitleRef = useRef(title);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../_workers/thumbnail.worker.ts", import.meta.url),
    );
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const generateThumbnail = useCallback(
    (elements: SketchElement[]): Promise<string | null> => {
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

  // Sync title ref
  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);

  const saveCanvas = useCallback(
    async (
      id: string,
      elements: SketchElement[],
      canvasTitle: string,
      type: string,
      thumbnail: string | null = null,
    ) => {
      setIsSaving(true);
      try {
        const response = await fetch(`http://localhost:4001/${type}/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            elements,
            title: canvasTitle,
            ...(thumbnail ? { thumbnail } : {}),
          }),
          credentials: "include",
        });

        if (response.ok) {
          setLastSavedAt(new Date());
          setIsDirtyState(false);
          isDirtyRef.current = false;
        }
      } catch (error) {
        console.error(`Failed to save ${type}:`, error);
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  // Debounced save effect
  useEffect(() => {
    if (!canvasId || !isDirtyRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const elements = elementsRef.current;
      const canvasTitle = currentTitleRef.current;

      // Generate thumbnail only for pages (or as needed)
      let thumbnail = null;
      if (entityType === "pages") {
        thumbnail = await generateThumbnail(elements);
      }

      saveCanvas(canvasId, elements, canvasTitle, entityType, thumbnail);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    canvasId,
    entityType,
    elementsRef,
    saveCanvas,
    generateThumbnail,
    saveRevision,
  ]);

  // Initial load or create
  useEffect(() => {
    async function initCanvas() {
      if (canvasIdFromUrl) {
        try {
          const response = await fetch(
            `http://localhost:4001/${entityType}/${canvasIdFromUrl}`,
            {
              credentials: "include",
            },
          );
          if (response.ok) {
            const data = await response.json();
            setElements(data.elements || []);
            setTitle(data.title || "Untitled");
            setCanvasId(data.id);
            if (entityType === "pages") {
              setFolderId(data.folderId ?? null);
              const needsRouteNormalization =
                routePageId !== data.id ||
                typeParam === "page" ||
                routeId === data.id ||
                (data.folderId ?? null) !== requestedFolderId;

              if (needsRouteNormalization) {
                const params = new URLSearchParams(searchParams);
                params.set("pageId", data.id);
                params.delete("id");
                params.delete("type");
                if (data.folderId) params.set("folderId", data.folderId);
                else params.delete("folderId");
                router.replace(`${pathname}?${params.toString()}`);
              }
            }
          } else {
            // If not found or error, create new one
            createAndRedirect();
          }
        } catch (error) {
          console.error(`Failed to fetch ${entityType}:`, error);
        }
      } else {
        createAndRedirect();
      }
    }

    async function createAndRedirect() {
      try {
        const response = await fetch(`http://localhost:4001/${entityType}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: "Untitled",
            elements: [],
            ...(entityType === "pages" && requestedFolderId
              ? { folderId: requestedFolderId }
              : {}),
          }),
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setCanvasId(data.id);
          if (entityType === "pages") {
            setFolderId(data.folderId ?? requestedFolderId ?? null);
          }
          // Shallow redirect using Next.js router
          const params = new URLSearchParams(searchParams);
          if (entityType === "pages") {
            params.set("pageId", data.id);
            params.delete("id");
            params.delete("type");
            if (data.folderId ?? requestedFolderId) {
              params.set("folderId", data.folderId ?? requestedFolderId);
            } else {
              params.delete("folderId");
            }
          } else {
            params.set("id", data.id);
            params.set("type", "canvas");
          }
          router.replace(`${pathname}?${params.toString()}`);
        }
      } catch (error) {
        console.error(`Failed to create ${entityType}:`, error);
      }
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      initCanvas();
    }
  }, [
    canvasIdFromUrl,
    entityType,
    pathname,
    requestedFolderId,
    routeId,
    routePageId,
    router,
    searchParams,
    setElements,
    typeParam,
  ]);
  // Run when URL or setter changes

  const movePageToFolder = useCallback(
    async (nextFolderId: string | null) => {
      if (!canvasId || entityType !== "pages") return false;

      setIsSaving(true);
      try {
        const response = await fetch(`http://localhost:4001/pages/${canvasId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: nextFolderId }),
          credentials: "include",
        });

        if (!response.ok) return false;

        setFolderId(nextFolderId);
        setLastSavedAt(new Date());

        const params = new URLSearchParams(searchParams);
        params.set("pageId", canvasId);
        params.delete("id");
        params.delete("type");
        if (nextFolderId) params.set("folderId", nextFolderId);
        else params.delete("folderId");
        router.replace(`${pathname}?${params.toString()}`);
        return true;
      } catch (error) {
        console.error("Failed to move page:", error);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [canvasId, entityType, pathname, router, searchParams],
  );

  // We need to trigger the effect when dirty changes.
  const triggerSave = useCallback(() => {
    isDirtyRef.current = true;
    setIsDirtyState(true);
    setSaveRevision((revision) => revision + 1);
  }, []);

  const saveNow = useCallback(
    async (newTitle?: string) => {
      if (!canvasId) return;
      const titleToSave = newTitle ?? currentTitleRef.current;
      if (newTitle) {
        setTitle(newTitle);
        currentTitleRef.current = newTitle;
      }
      let thumbnail: string | null = null;
      if (entityType === "pages") thumbnail = await generateThumbnail(elementsRef.current);
      await saveCanvas(canvasId, elementsRef.current, titleToSave, entityType, thumbnail);
      setIsDirtyState(false);
      isDirtyRef.current = false;
    },
    [canvasId, entityType, elementsRef, generateThumbnail, saveCanvas],
  );

  return {
    canvasId,
    entityType,
    folderId,
    isSaving,
    isDirty: isDirtyState,
    lastSavedAt,
    title,
    setTitle,
    triggerSave,
    markDirty: triggerSave,
    movePageToFolder,
    saveNow,
  };
}
