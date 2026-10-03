import type { ReadonlyElement } from "@repo/canvas-engine";
import type { PageViewMode } from "@repo/schema";
import type { PageDetail } from "@/api/types";
import type { PageSave, PageStore } from "./pageStore";
import type { ThemeThumbnails } from "./thumbnails";

export type PageSessionState = {
  /** Null until the page is loaded or created. */
  pageId: string | null;
  folderId: string | null;
  title: string;
  note: string;
  viewMode: PageViewMode;
  /** Some edits are not in the store yet. Stays true while a save runs. */
  dirty: boolean;
  saving: boolean;
  /** The last save gave up after its retries. Its edits are still dirty. */
  failed: boolean;
  lastSavedAt: Date | null;
};

export type PageEdit = Partial<
  Pick<PageSave, "title" | "note" | "viewMode" | "elements">
>;

export type OpenRequest = {
  /** Null creates a new page. */
  pageId: string | null;
  folderId: string | null;
  viewMode: PageViewMode;
};

export type OpenResult = { page: PageDetail; created: boolean };

type PageSessionOptions = {
  store: PageStore;
  renderThumbnails: (
    elements: readonly ReadonlyElement[],
  ) => Promise<ThemeThumbnails>;
  /** Runs after each autosave reaches the store. */
  onSaved?: (page: PageDetail) => void;
  debounceMs?: number;
  /** Extra tries after a failed save. */
  retries?: number;
  retryDelayMs?: (attempt: number) => number;
};

export type PageSession = ReturnType<typeof createPageSession>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The open page and its save policy, with no React and no DOM.
 *
 * `open` loads (or creates) a page. `edit` changes its fields and schedules a
 * debounced save. `flush` saves now. Only one save runs at a time, and each
 * save sends the latest fields, so an older save can never land after a newer
 * one. A revision counter decides `dirty`: edits made while a save runs keep
 * the page dirty until a later save carries them.
 */
export function createPageSession({
  store,
  renderThumbnails,
  onSaved,
  debounceMs = 2000,
  retries = 3,
  retryDelayMs = (attempt) => Math.min(1000 * 2 ** attempt, 5000),
}: PageSessionOptions) {
  let state: PageSessionState = {
    pageId: null,
    folderId: null,
    title: "Untitled",
    note: "",
    viewMode: "canvas",
    dirty: false,
    saving: false,
    failed: false,
    lastSavedAt: null,
  };
  let elements: readonly ReadonlyElement[] = [];
  // `rev` counts edits; `savedRev` is the last one the store has.
  let rev = 0;
  let savedRev = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let saving: Promise<void> | null = null;
  // Edits are dropped while a page is being swapped in; they belong to no page.
  let opening = false;
  let lastOpen: { key: string; promise: Promise<OpenResult | null> } | null =
    null;
  let openQueue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  function set(patch: Partial<PageSessionState>) {
    const changed = (
      Object.keys(patch) as (keyof PageSessionState)[]
    ).some((key) => state[key] !== patch[key]);
    if (!changed) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }

  function snapshot(): PageSave {
    return {
      // The API needs a non-empty title.
      title: state.title.trim() || "Untitled",
      note: state.note,
      viewMode: state.viewMode,
      elements,
    };
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, debounceMs);
  }

  function edit(patch: PageEdit) {
    if (opening) return;
    const { elements: nextElements, ...fields } = patch;
    if (nextElements) elements = nextElements;
    rev++;
    set({ ...fields, dirty: true });
    schedule();
  }

  async function save(pageId: string, skipThumbnails: boolean) {
    set({ saving: true });
    const thumbnails = skipThumbnails
      ? null
      : await renderThumbnails(elements).catch(() => null);
    for (let attempt = 0; ; attempt++) {
      const sentRev = rev;
      try {
        const page = await store.update(pageId, {
          ...snapshot(),
          ...(thumbnails?.light ? { thumbnailLight: thumbnails.light } : {}),
          ...(thumbnails?.dark ? { thumbnailDark: thumbnails.dark } : {}),
        });
        savedRev = sentRev;
        set({
          saving: false,
          failed: false,
          dirty: rev !== savedRev,
          lastSavedAt: new Date(),
        });
        onSaved?.(page);
        return;
      } catch (error) {
        if (attempt >= retries) {
          console.error("Page save failed:", error);
          set({ saving: false, failed: true });
          return;
        }
      }
      await sleep(retryDelayMs(attempt));
    }
  }

  /**
   * Saves pending edits now and waits for the store. Resolves true when the
   * store has every edit. `skipThumbnails` sends the save right away, for when
   * the tab may close any moment; the next save adds thumbnails back.
   */
  async function flush(
    options: { skipThumbnails?: boolean } = {},
  ): Promise<boolean> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    while (saving) await saving;
    if (rev === savedRev) return true;
    if (!state.pageId) return false;
    saving = save(state.pageId, options.skipThumbnails ?? false).finally(
      () => {
        saving = null;
      },
    );
    await saving;
    return rev === savedRev;
  }

  function startFresh(folderId: string | null, viewMode: PageViewMode) {
    elements = [];
    rev = savedRev = 0;
    set({
      pageId: null,
      folderId,
      title: "Untitled",
      note: "",
      viewMode,
      dirty: false,
      saving: false,
      failed: false,
      lastSavedAt: null,
    });
  }

  async function runOpen({
    pageId,
    folderId,
    viewMode,
  }: OpenRequest): Promise<OpenResult | null> {
    if (pageId && pageId === state.pageId) return null;

    opening = true;
    try {
      // Finish the current page's save before its fields are replaced.
      await flush();
      if (pageId) {
        try {
          const page = await store.get(pageId);
          elements = page.elements ?? [];
          rev = savedRev = 0;
          set({
            pageId: page.id,
            folderId: page.folderId,
            title: page.title || "Untitled",
            note: page.note ?? "",
            viewMode: page.viewMode === "doc" ? "doc" : "canvas",
            dirty: false,
            saving: false,
            failed: false,
            lastSavedAt: null,
          });
          return { page, created: false };
        } catch (error) {
          console.error("Page load failed, starting a new page:", error);
        }
      }
      startFresh(folderId, viewMode);
    } finally {
      opening = false;
    }

    // Strokes drawn while the create request runs are kept: they bump `rev`,
    // and the debounced save sends them once the page id is known.
    const sentRev = rev;
    try {
      const page = await store.create({ ...snapshot(), folderId });
      savedRev = sentRev;
      set({
        pageId: page.id,
        folderId: page.folderId ?? folderId,
        dirty: rev !== savedRev,
      });
      return { page, created: true };
    } catch (error) {
      console.error("Page create failed:", error);
      set({ failed: true });
      return null;
    }
  }

  /**
   * Opens a page, saving the current one first. Calls run in order. Repeating
   * the request still in flight returns its promise, so a double effect
   * creates one page. Resolves null when the page is already open or couldn't
   * be created.
   */
  function open(request: OpenRequest): Promise<OpenResult | null> {
    const key = request.pageId ?? "new";
    if (lastOpen?.key === key) return lastOpen.promise;
    const promise = openQueue.then(() => runOpen(request));
    const entry = { key, promise };
    lastOpen = entry;
    openQueue = promise
      .catch(() => null)
      .finally(() => {
        if (lastOpen === entry) lastOpen = null;
      });
    return promise;
  }

  return {
    open,
    edit,
    flush,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
