"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { ReadonlyElement, SketchEditor } from "@repo/canvas-engine";
import type { PageViewMode } from "@repo/schema";
import { DEFAULT_DARK_STROKE, DEFAULT_LIGHT_STROKE } from "@repo/common";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPageRecord, fetchPage, updatePageRecord } from "@/api/canvas";

interface UseCanvasSyncProps {
  /** Loaded pages go into it with `loadScene`; saves read `getElements`. */
  editor: SketchEditor;
}

type ThemeThumbnails = {
  light: string | null;
  dark: string | null;
};

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

export function useCanvasSync({ editor }: UseCanvasSyncProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageIdFromUrl = searchParams.get("pageId");
  const requestedFolderId = searchParams.get("folderId");
  // "New note" / "New canvas" creation flows pass ?mode=doc|canvas so a freshly
  // created page opens in the view its entry point implied.
  const requestedMode = searchParams.get("mode") === "doc" ? "doc" : "canvas";

  const [title, setTitle] = useState("Untitled");
  const [note, setNoteState] = useState("");
  const [viewMode, setViewModeState] = useState<PageViewMode>(requestedMode);
  const [folderId, setFolderId] = useState<string | null>(requestedFolderId);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const currentTitleRef = useRef(title);
  const currentNoteRef = useRef(note);
  const currentViewModeRef = useRef(viewMode);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);

  const queryClient = useQueryClient();

  const queryKey = ["pages", pageIdFromUrl] as const;
  const loadQuery = useQuery({
    queryKey,
    queryFn: () => fetchPage(pageIdFromUrl!),
    enabled: !!pageIdFromUrl,
  });

  const appliedIdRef = useRef<string | null>(null);
  const migratedNoteRef = useRef(false);
  useEffect(() => {
    if (!loadQuery.data) return;
    if (appliedIdRef.current === loadQuery.data.id) return;
    appliedIdRef.current = loadQuery.data.id;
    editor.loadScene(loadQuery.data.elements || []);
    setTitle(loadQuery.data.title || "Untitled");
    currentTitleRef.current = loadQuery.data.title || "Untitled";
    setIsDirty(false);
    setLoadVersion((version) => version + 1);
    setFolderId(loadQuery.data.folderId ?? null);
    const loadedMode: PageViewMode =
      loadQuery.data.viewMode === "doc" ? "doc" : "canvas";
    setViewModeState(loadedMode);
    currentViewModeRef.current = loadedMode;
    // The MVP kept notes in localStorage; migrate any leftover local note
    // into the page record on first load, then clear the local key.
    let nextNote = loadQuery.data.note ?? "";
    const legacyKey = `sketch-forge:notes:${loadQuery.data.id}`;
    const legacyNote = localStorage.getItem(legacyKey);
    if (legacyNote && !nextNote) {
      nextNote = legacyNote;
      localStorage.removeItem(legacyKey);
      migratedNoteRef.current = true;
    }
    setNoteState(nextNote);
    currentNoteRef.current = nextNote;
  }, [loadQuery.data, editor]);

  const createMutation = useMutation({
    mutationFn: () =>
      createPageRecord({
        title: "Untitled",
        elements: [],
        viewMode: requestedMode,
        ...(requestedFolderId ? { folderId: requestedFolderId } : {}),
      }),
    onSuccess: (data) => {
      const params = new URLSearchParams(searchParams);
      params.set("pageId", data.id);
      const nextFolderId = data.folderId ?? requestedFolderId;
      if (nextFolderId) params.set("folderId", nextFolderId);
      else params.delete("folderId");
      router.replace(`${pathname}?${params.toString()}`);
    },
  });

  const hasTriggeredCreateRef = useRef(false);
  useEffect(() => {
    if (hasTriggeredCreateRef.current) return;
    const shouldCreate = !pageIdFromUrl || loadQuery.isError;
    if (shouldCreate && !createMutation.isPending) {
      hasTriggeredCreateRef.current = true;
      createMutation.mutate();
    }
  }, [pageIdFromUrl, loadQuery.isError, createMutation]);

  const pageId = loadQuery.data?.id ?? createMutation.data?.id ?? null;

  const saveMutation = useMutation({
    mutationFn: async (vars: {
      elements: readonly ReadonlyElement[];
      title: string;
      thumbnail?: string | null;
      thumbnailLight?: string | null;
      thumbnailDark?: string | null;
    }) => {
      if (!pageId) throw new Error("No page id yet");
      return updatePageRecord(pageId, {
        elements: vars.elements,
        title: vars.title,
        note: currentNoteRef.current,
        viewMode: currentViewModeRef.current,
        ...(vars.thumbnail ? { thumbnail: vars.thumbnail } : {}),
        ...(vars.thumbnailLight ? { thumbnailLight: vars.thumbnailLight } : {}),
        ...(vars.thumbnailDark ? { thumbnailDark: vars.thumbnailDark } : {}),
      });
    },
    // A drawing save is the user's work; ride out a flaky network rather than
    // dropping it. Backoff caps at 5s so retries stay reasonably prompt.
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    onSuccess: (data) => {
      setIsDirty(false);
      setLastSavedAt(new Date());
      queryClient.setQueryData(queryKey, data);
    },
  });

  const moveMutation = useMutation({
    mutationFn: (nextFolderId: string | null) => {
      if (!pageId) throw new Error("No page id yet");
      return updatePageRecord(pageId, { folderId: nextFolderId });
    },
    onSuccess: (_data, nextFolderId) => {
      setFolderId(nextFolderId);
      const params = new URLSearchParams(searchParams);
      params.set("pageId", pageId!);
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
      elements: readonly ReadonlyElement[],
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
    async (elements: readonly ReadonlyElement[]): Promise<ThemeThumbnails> => {
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
        const thumbnails = await generateThemeThumbnails(editor.getElements());
        saveMutation.mutate({
          elements: editor.getElements(),
          title: currentTitleRef.current,
          thumbnail: thumbnails.light,
          thumbnailLight: thumbnails.light,
          thumbnailDark: thumbnails.dark,
        });
      }, 2000);
    },
    [editor, generateThemeThumbnails, saveMutation],
  );

  const updateTitle = useCallback(
    (nextTitle: string) => {
      setTitle(nextTitle);
      currentTitleRef.current = nextTitle;
      triggerSave(nextTitle);
    },
    [triggerSave],
  );

  const updateNote = useCallback(
    (nextNote: string) => {
      setNoteState(nextNote);
      currentNoteRef.current = nextNote;
      triggerSave();
    },
    [triggerSave],
  );

  const updateViewMode = useCallback(
    (nextMode: PageViewMode) => {
      setViewModeState(nextMode);
      currentViewModeRef.current = nextMode;
      triggerSave();
    },
    [triggerSave],
  );

  // Warn before leaving with edits still in the debounce window or mid-save, so
  // a tab close does not silently drop the last strokes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Persist a note migrated from localStorage once the page id is known.
  useEffect(() => {
    if (migratedNoteRef.current && pageId) {
      migratedNoteRef.current = false;
      triggerSave();
    }
  }, [pageId, loadVersion, triggerSave]);

  const saveNow = useCallback(
    async (newTitle?: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (newTitle) {
        setTitle(newTitle);
        currentTitleRef.current = newTitle;
      }
      const thumbnails = await generateThemeThumbnails(editor.getElements());

      await saveMutation.mutateAsync({
        elements: editor.getElements(),
        title: newTitle ?? currentTitleRef.current,
        thumbnail: thumbnails.light,
        thumbnailLight: thumbnails.light,
        thumbnailDark: thumbnails.dark,
      });
    },
    [editor, generateThemeThumbnails, saveMutation],
  );

  return {
    pageId,
    folderId,
    isSaving: saveMutation.isPending,
    isDirty,
    lastSavedAt,
    loadVersion,
    title,
    note,
    viewMode,
    setNote: updateNote,
    setViewMode: updateViewMode,
    setTitle: updateTitle,
    triggerSave,
    markDirty: triggerSave,
    movePageToFolder: (next: string | null) => moveMutation.mutateAsync(next),
    saveNow,
  };
}
