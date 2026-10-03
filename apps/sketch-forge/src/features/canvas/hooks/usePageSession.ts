"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ReadonlyElement } from "@repo/canvas-engine";
import { invalidateLibrary } from "@/api/hooks";
import type { PageDetail } from "@/api/types";
import { createPageSession, type PageSession } from "../session/pageSession";
import { httpPageStore } from "../session/pageStore";
import { createWorkerThumbnails } from "../session/thumbnails";

/** A scene for the editor to load. `version` goes up on every load. */
export type LoadedScene = {
  version: number;
  elements: readonly ReadonlyElement[];
};

// The MVP kept notes in localStorage; move a leftover local note into the
// page on first load, then clear the local key.
function migrateLegacyNote(session: PageSession, page: PageDetail) {
  if (page.note) return;
  const key = `sketch-forge:notes:${page.id}`;
  const legacyNote = localStorage.getItem(key);
  if (!legacyNote) return;
  session.edit({ note: legacyNote });
  localStorage.removeItem(key);
}

/**
 * React binding for the page session of the `/canvas` route. It opens the page
 * in `?pageId=` (or creates one), keeps the URL and the library lists in step,
 * and saves when the tab hides or the page unmounts. Feed edits in with
 * `session.edit` and load `scene` into the editor when its version changes.
 */
export function usePageSession() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [thumbnails] = useState(createWorkerThumbnails);
  const [session] = useState(() =>
    createPageSession({
      store: httpPageStore,
      renderThumbnails: thumbnails.render,
      // Autosave runs often, so lists refetch on their next mount, not now.
      onSaved: () => void invalidateLibrary(queryClient, "none"),
    }),
  );
  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState,
  );
  const [scene, setScene] = useState<LoadedScene>({
    version: 0,
    elements: [],
  });

  useEffect(() => {
    const pageId = searchParams.get("pageId");
    // "New note" / "New canvas" entry points pass ?mode=doc|canvas so a new
    // page opens in the view its entry point implied.
    const viewMode = searchParams.get("mode") === "doc" ? "doc" : "canvas";
    const folderId = searchParams.get("folderId");
    if (!pageId && session.getState().pageId) {
      // Leaving a page for a new one: clear the editor now, so strokes drawn
      // while the new page is created land on a blank scene.
      setScene((prev) => ({ version: prev.version + 1, elements: [] }));
    }
    void session
      .open({ pageId, folderId, viewMode })
      .then((result) => {
        // A later open already replaced this page.
        if (!result || session.getState().pageId !== result.page.id) return;
        if (result.created) {
          void invalidateLibrary(queryClient);
          const params = new URLSearchParams(searchParams);
          params.set("pageId", result.page.id);
          const nextFolderId = result.page.folderId ?? folderId;
          if (nextFolderId) params.set("folderId", nextFolderId);
          else params.delete("folderId");
          router.replace(`${pathname}?${params.toString()}`);
          return;
        }
        setScene((prev) => ({
          version: prev.version + 1,
          elements: result.page.elements ?? [],
        }));
        migrateLegacyNote(session, result.page);
      });
  }, [pathname, queryClient, router, searchParams, session]);

  useEffect(() => {
    // The tab may be killed soon after it hides, so send the save right away.
    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        void session.flush({ skipThumbnails: true });
      }
    };
    // Warn before closing with edits the store doesn't have yet.
    const warnOnLeave = (e: BeforeUnloadEvent) => {
      if (!session.getState().dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("beforeunload", warnOnLeave);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("beforeunload", warnOnLeave);
      void session.flush({ skipThumbnails: true });
      thumbnails.dispose();
    };
  }, [session, thumbnails]);

  return { session, ...state, scene };
}
