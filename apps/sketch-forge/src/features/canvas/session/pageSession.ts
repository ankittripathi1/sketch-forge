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
  /** A page is loading. Edits are dropped, so the editor should block input. */
  opening: boolean;
  /** The scene the editor should show. Its version goes up on every load. */
  scene: LoadedScene;
};

export type LoadedScene = {
  version: number;
  elements: readonly ReadonlyElement[];
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

export type OpenResult =
  | { status: "loaded" | "created"; page: PageDetail }
  /** The current page's save failed, so it stays open. */
  | { status: "kept" };

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
    opening: false,
    scene: { version: 0, elements: [] },
  };
  let elements: readonly ReadonlyElement[] = [];
  // `rev` counts edits; `savedRev` is the last one the store has, and
  // `thumbnailRev` the last one the stored thumbnails show.
  let rev = 0;
  let savedRev = 0;
  let thumbnailRev = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let saving: Promise<void> | null = null;
  let lastOpen: { key: string; promise: Promise<OpenResult | null> } | null =
    null;
  let openQueue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  function set(patch: Partial<PageSessionState>) {
    const changed = (Object.keys(patch) as (keyof PageSessionState)[]).some(
      (key) => state[key] !== patch[key],
    );
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
    // While a page loads, edits belong to no page.
    if (state.opening) return;
    const { elements: nextElements, ...fields } = patch;
    if (nextElements) elements = nextElements;
    rev++;
    set({ ...fields, dirty: true });
    schedule();
  }

  async function save(pageId: string, skipThumbnails: boolean) {
    set({ saving: true });
    // Thumbnails are drawn from the snapshot they're sent with, and retries
    // resend that same body. Edits made meanwhile go out in a later save.
    const sentRev = rev;
    const fields = snapshot();
    const thumbnails = skipThumbnails
      ? null
      : await renderThumbnails(fields.elements).catch(() => null);
    const body: PageSave = {
      ...fields,
      ...(thumbnails?.light ? { thumbnailLight: thumbnails.light } : {}),
      ...(thumbnails?.dark ? { thumbnailDark: thumbnails.dark } : {}),
    };
    for (let attempt = 0; ; attempt++) {
      try {
        const page = await store.update(pageId, body);
        savedRev = sentRev;
        if (!skipThumbnails) thumbnailRev = sentRev;
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
   * the tab may close any moment; the next flush without it adds thumbnails
   * back, even when there are no new edits.
   */
  async function flush(
    options: { skipThumbnails?: boolean } = {},
  ): Promise<boolean> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    while (saving) await saving;
    const staleThumbnails =
      !options.skipThumbnails && thumbnailRev !== savedRev;
    if (rev === savedRev && !staleThumbnails) return true;
    if (!state.pageId) return false;
    saving = save(state.pageId, options.skipThumbnails ?? false).finally(() => {
      saving = null;
    });
    await saving;
    return rev === savedRev;
  }

  /** Swaps in another page's fields and scene, with nothing left to save. */
  function replace(
    fields: Pick<
      PageSessionState,
      "pageId" | "folderId" | "title" | "note" | "viewMode"
    >,
    nextElements: readonly ReadonlyElement[],
  ) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    elements = nextElements;
    rev = savedRev = thumbnailRev = 0;
    set({
      ...fields,
      dirty: false,
      saving: false,
      failed: false,
      lastSavedAt: null,
      scene: { version: state.scene.version + 1, elements: nextElements },
    });
  }

  async function runOpen({
    pageId,
    folderId,
    viewMode,
  }: OpenRequest): Promise<OpenResult | null> {
    if (pageId && pageId === state.pageId) return null;

    // Save the current page first. Edits made meanwhile still belong to it,
    // so keep going until the store has them all. If the save fails, stay.
    // A page that was never created has nowhere to save, so it's dropped.
    if (state.pageId) {
      while (!(await flush())) {
        if (state.failed) return { status: "kept" };
      }
    }

    if (pageId) {
      set({ opening: true });
      try {
        const page = await store.get(pageId);
        replace(
          {
            pageId: page.id,
            folderId: page.folderId,
            title: page.title || "Untitled",
            note: page.note ?? "",
            viewMode: page.viewMode === "doc" ? "doc" : "canvas",
          },
          page.elements ?? [],
        );
        return { status: "loaded", page };
      } catch (error) {
        console.error("Page load failed, starting a new page:", error);
      } finally {
        set({ opening: false });
      }
    }
    replace(
      { pageId: null, folderId, title: "Untitled", note: "", viewMode },
      [],
    );

    // Strokes drawn while the create request runs are kept: they bump `rev`,
    // and the debounced save sends them once the page id is known.
    const sentRev = rev;
    try {
      const page = await store.create({ ...snapshot(), folderId });
      savedRev = thumbnailRev = sentRev;
      set({
        pageId: page.id,
        folderId: page.folderId ?? folderId,
        dirty: rev !== savedRev,
      });
      // A debounced save may have fired before there was an id to save to.
      if (rev !== savedRev) schedule();
      return { status: "created", page };
    } catch (error) {
      console.error("Page create failed:", error);
      set({ failed: true });
      return null;
    }
  }

  /**
   * Opens a page, saving the current one first. Calls run in order. Repeating
   * the request still in flight returns its promise, so a double effect
   * creates one page. Resolves `kept` when the current page couldn't be saved,
   * and null when the page is already open or couldn't be created.
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
