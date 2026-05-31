"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SketchElement } from "@repo/element/types";
import { DEFAULT_DARK_STROKE, DEFAULT_LIGHT_STROKE } from "@repo/common";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntity, fetchEntity, updateEntity } from "@/api/canvas";

interface UseCanvasSyncProps {
  elementsRef: React.MutableRefObject<SketchElement[]>;
  setElements: (elements: SketchElement[]) => void;
}

type ThemeThumbnails = {
  light: string | null;
  dark: string | null;
};

function elementsForThumbnailMode(
  elements: SketchElement[],
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
  const pageIdFromUrl = routePageId || (typeParam === "page" ? routeId : null);
  const canvasIdFromUrl = typeParam === "canvas" ? routeId : pageIdFromUrl;
  const entityType = typeParam === "canvas" ? "canvases" : "pages";
  const requestedFolderId = searchParams.get("folderId");

  const [title, setTitle] = useState("Untitled");
  const [folderId, setFolderId] = useState<string | null>(requestedFolderId);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const currentTitleRef = useRef(title);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);

  const queryClient = useQueryClient();

  const queryKey = [entityType, canvasIdFromUrl] as const;
  const loadQuery = useQuery({
    queryKey,
    queryFn: () => fetchEntity(entityType, canvasIdFromUrl!),
    enabled: !!canvasIdFromUrl,
  });

  const setElementsRef = useRef(setElements);
  useEffect(() => {
    setElementsRef.current = setElements;
  }, [setElements]);

  const appliedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loadQuery.data) return;
    if (appliedIdRef.current === loadQuery.data.id) return;
    appliedIdRef.current = loadQuery.data.id;
    setElementsRef.current(loadQuery.data.elements || []);
    setTitle(loadQuery.data.title || "Untitled");
    currentTitleRef.current = loadQuery.data.title || "Untitled";
    setIsDirty(false);
    setLoadVersion((version) => version + 1);
    if (entityType === "pages") {
      setFolderId(loadQuery.data.folderId ?? null);
    }
  }, [loadQuery.data, entityType]);

  const createMutation = useMutation({
    mutationFn: () =>
      createEntity(entityType, {
        title: "Untitled",
        elements: [],
        ...(entityType === "pages" && requestedFolderId
          ? { folderId: requestedFolderId }
          : {}),
      }),
    onSuccess: (data) => {
      const params = new URLSearchParams(searchParams);
      if (entityType === "pages") {
        params.set("pageId", data.id);
        params.delete("id");
        params.delete("type");
        const nextFolderId = data.folderId ?? requestedFolderId;
        if (nextFolderId) params.set("folderId", nextFolderId);
        else params.delete("folderId");
      } else {
        params.set("id", data.id);
        params.set("type", "canvas");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
  });

  const hasTriggeredCreateRef = useRef(false);
  useEffect(() => {
    if (hasTriggeredCreateRef.current) return;
    const shouldCreate = !canvasIdFromUrl || loadQuery.isError;
    if (shouldCreate && !createMutation.isPending) {
      hasTriggeredCreateRef.current = true;
      createMutation.mutate();
    }
  }, [canvasIdFromUrl, loadQuery.isError, createMutation]);

  const canvasId = loadQuery.data?.id ?? createMutation.data?.id ?? null;

  const saveMutation = useMutation({
    mutationFn: async (vars: {
      elements: SketchElement[];
      title: string;
      thumbnail?: string | null;
      thumbnailLight?: string | null;
      thumbnailDark?: string | null;
    }) => {
      if (!canvasId) throw new Error("No canvas id yet");
      return updateEntity(entityType, canvasId, {
        elements: vars.elements,
        title: vars.title,
        ...(vars.thumbnail ? { thumbnail: vars.thumbnail } : {}),
        ...(vars.thumbnailLight ? { thumbnailLight: vars.thumbnailLight } : {}),
        ...(vars.thumbnailDark ? { thumbnailDark: vars.thumbnailDark } : {}),
      });
    },
    onSuccess: (data) => {
      setIsDirty(false);
      setLastSavedAt(new Date());
      queryClient.setQueryData(queryKey, data);
    },
  });

  const moveMutation = useMutation({
    mutationFn: (nextFolderId: string | null) => {
      if (!canvasId || entityType !== "pages")
        throw new Error("Not a movable page");
      return updateEntity("pages", canvasId, { folderId: nextFolderId });
    },
    onSuccess: (_data, nextFolderId) => {
      setFolderId(nextFolderId);
      const params = new URLSearchParams(searchParams);
      params.set("pageId", canvasId!);
      params.delete("id");
      params.delete("type");
      if (nextFolderId) params.set("folderId", nextFolderId);
      else params.delete("folderId");
      router.replace(`${pathname}?${params.toString()}`);
    },
  });

  const workerRef = useRef<Worker | null>(null);
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/thumbnail.worker.ts", import.meta.url),
    );
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const generateThumbnail = useCallback(
    (
      elements: SketchElement[],
      options?: { backgroundColor?: string },
    ): Promise<string | null> => {
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
            backgroundColor: options?.backgroundColor ?? "#f9f9f7",
          },
        });
      });
    },
    [],
  );

  const generateThemeThumbnails = useCallback(
    async (elements: SketchElement[]): Promise<ThemeThumbnails> => {
      const light = await generateThumbnail(
        elementsForThumbnailMode(elements, "light"),
        {
          backgroundColor: "#f9f9f7",
        },
      );
      const dark = await generateThumbnail(
        elementsForThumbnailMode(elements, "dark"),
        {
          backgroundColor: "#111012",
        },
      );

      return { light, dark };
    },
    [generateThumbnail],
  );

  const triggerSave = useCallback(
    (titleOverride?: string) => {
      setIsDirty(true);
      if (titleOverride !== undefined) {
        currentTitleRef.current = titleOverride;
      }
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        const thumbnails =
          entityType === "pages"
            ? await generateThemeThumbnails(elementsRef.current)
            : { light: null, dark: null };
        saveMutation.mutate({
          elements: elementsRef.current,
          title: currentTitleRef.current,
          thumbnail: thumbnails.light,
          thumbnailLight: thumbnails.light,
          thumbnailDark: thumbnails.dark,
        });
      }, 2000);
    },
    [entityType, elementsRef, generateThemeThumbnails, saveMutation],
  );

  const updateTitle = useCallback(
    (nextTitle: string) => {
      setTitle(nextTitle);
      currentTitleRef.current = nextTitle;
      triggerSave(nextTitle);
    },
    [triggerSave],
  );

  const saveNow = useCallback(
    async (newTitle?: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (newTitle) {
        setTitle(newTitle);
        currentTitleRef.current = newTitle;
      }
      const thumbnails =
        entityType === "pages"
          ? await generateThemeThumbnails(elementsRef.current)
          : { light: null, dark: null };

      await saveMutation.mutateAsync({
        elements: elementsRef.current,
        title: newTitle ?? currentTitleRef.current,
        thumbnail: thumbnails.light,
        thumbnailLight: thumbnails.light,
        thumbnailDark: thumbnails.dark,
      });
    },
    [entityType, elementsRef, generateThemeThumbnails, saveMutation],
  );

  return {
    canvasId,
    entityType,
    folderId,
    isSaving: saveMutation.isPending,
    isDirty,
    lastSavedAt,
    loadVersion,
    title,
    setTitle: updateTitle,
    triggerSave,
    markDirty: triggerSave,
    movePageToFolder: (next: string | null) => moveMutation.mutateAsync(next),
    saveNow,
  };
}
