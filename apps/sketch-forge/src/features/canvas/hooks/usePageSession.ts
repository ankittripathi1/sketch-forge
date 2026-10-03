"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateLibrary } from "@/api/hooks";
import type { PageDetail } from "@/api/types";
import { createPageSession, type PageSession } from "../session/pageSession";
import { httpPageStore } from "../session/pageStore";
import { createWorkerThumbnails } from "../session/thumbnails";

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
 * Block editor input while `opening`. `onError` shows messages to the user.
 */
export function usePageSession(onError: (message: string) => void) {
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
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const pageId = searchParams.get("pageId");
    // "New note" / "New canvas" entry points pass ?mode=doc|canvas so a new
    // page opens in the view its entry point implied.
    const viewMode = searchParams.get("mode") === "doc" ? "doc" : "canvas";
    const folderId = searchParams.get("folderId");
    // Points the URL at the page the session has open.
    const replaceUrl = (nextPageId: string, nextFolderId: string | null) => {
      const params = new URLSearchParams(searchParams);
      params.set("pageId", nextPageId);
      if (nextFolderId) params.set("folderId", nextFolderId);
      else params.delete("folderId");
      router.replace(`${pathname}?${params.toString()}`);
    };
    void session.open({ pageId, folderId, viewMode }).then((result) => {
      if (!result) return;
      if (result.status === "kept") {
        const current = session.getState();
        if (current.pageId) replaceUrl(current.pageId, current.folderId);
        onErrorRef.current(
          "Couldn't save this page, so it stayed open. Check your connection and try again.",
        );
        return;
      }
      // A later open already replaced this page.
      if (session.getState().pageId !== result.page.id) return;
      if (result.status === "created") {
        void invalidateLibrary(queryClient);
        replaceUrl(result.page.id, result.page.folderId ?? folderId);
        return;
      }
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

  return { session, ...state };
}
