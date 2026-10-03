import { describe, expect, test } from "bun:test";
import type { ReadonlyElement } from "@repo/canvas-engine";
import type { PageDetail } from "@/api/types";
import { createPageSession } from "./pageSession";
import type { PageSave, PageStore } from "./pageStore";

function element(id: string): ReadonlyElement {
  return {
    id,
    tool: "rectangle",
    x1: 0,
    y1: 0,
    x2: 10,
    y2: 10,
    seed: 1,
    strokeColor: "#000000",
    fillColor: "transparent",
    fillStyle: "none",
    strokeWidth: 1,
  };
}

/**
 * Pages in a Map. `failNext` makes the next updates throw; `hold` keeps the
 * next update waiting until `release` is called.
 */
function memoryStore() {
  const pages = new Map<string, PageDetail>();
  const updates: PageSave[] = [];
  let failures = 0;
  let held: (() => void) | null = null;
  let holdNext = false;

  function write(id: string, save: PageSave, folderId: string | null) {
    const page: PageDetail = {
      id,
      title: save.title,
      note: save.note,
      viewMode: save.viewMode,
      elements: [...save.elements] as PageDetail["elements"],
      folderId,
      status: "new",
      updatedAt: new Date().toISOString(),
      thumbnail: save.thumbnailLight ?? null,
      thumbnailLight: save.thumbnailLight ?? null,
      thumbnailDark: save.thumbnailDark ?? null,
      pageOrder: 0,
    };
    pages.set(id, page);
    return page;
  }

  const store: PageStore = {
    async get(id) {
      const page = pages.get(id);
      if (!page) throw new Error("not found");
      return page;
    },
    async create({ folderId, ...save }) {
      return write(`page-${pages.size + 1}`, save, folderId);
    },
    async update(id, save) {
      if (holdNext) {
        holdNext = false;
        await new Promise<void>((resolve) => (held = resolve));
      }
      if (failures > 0) {
        failures--;
        throw new Error("network down");
      }
      updates.push(save);
      return write(id, save, pages.get(id)?.folderId ?? null);
    },
  };

  return {
    store,
    pages,
    updates,
    failNext(count: number) {
      failures = count;
    },
    hold() {
      holdNext = true;
    },
    /** True once an update is waiting on `release`. */
    holding: () => held !== null,
    release() {
      held?.();
      held = null;
    },
  };
}

const noThumbnails = async () => ({ light: null, dark: null });

async function waitFor(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  throw new Error("timed out");
}

function setup(memory = memoryStore()) {
  const session = createPageSession({
    store: memory.store,
    renderThumbnails: noThumbnails,
    debounceMs: 5,
    retries: 2,
    retryDelayMs: () => 0,
  });
  return { memory, session };
}

describe("createPageSession", () => {
  test("an edit reaches the store after the debounce", async () => {
    const { memory, session } = setup();
    await session.open({ pageId: null, folderId: null, viewMode: "canvas" });

    session.edit({ title: "Plan", elements: [element("a")] });
    expect(session.getState().dirty).toBe(true);

    await waitFor(() => !session.getState().dirty);
    const page = memory.pages.get(session.getState().pageId!);
    expect(page?.title).toBe("Plan");
    expect(page?.elements?.map((e) => e.id)).toEqual(["a"]);
  });

  test("edits made during a save stay dirty and go out in the next save", async () => {
    const { memory, session } = setup();
    await session.open({ pageId: null, folderId: null, viewMode: "canvas" });

    memory.hold();
    session.edit({ elements: [element("a")] });
    const first = session.flush();
    await waitFor(memory.holding);

    session.edit({ elements: [element("a"), element("b")] });
    memory.release();
    expect(await first).toBe(false);
    expect(session.getState().dirty).toBe(true);

    await waitFor(() => !session.getState().dirty);
    expect(memory.updates.at(-1)?.elements.map((e) => e.id)).toEqual([
      "a",
      "b",
    ]);
  });

  test("two flushes never send two saves at once", async () => {
    const { memory, session } = setup();
    await session.open({ pageId: null, folderId: null, viewMode: "canvas" });

    memory.hold();
    session.edit({ title: "one" });
    const first = session.flush();
    await waitFor(memory.holding);
    session.edit({ title: "two" });
    const second = session.flush();
    memory.release();

    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(memory.updates.map((save) => save.title)).toEqual(["one", "two"]);
  });

  test("flush with skipThumbnails saves without rendering thumbnails", async () => {
    const memory = memoryStore();
    let renders = 0;
    const session = createPageSession({
      store: memory.store,
      renderThumbnails: async () => {
        renders++;
        return { light: "light.png", dark: "dark.png" };
      },
    });
    await session.open({ pageId: null, folderId: null, viewMode: "canvas" });

    session.edit({ note: "hidden tab" });
    expect(await session.flush({ skipThumbnails: true })).toBe(true);
    expect(renders).toBe(0);
    expect(memory.updates.at(-1)?.thumbnailLight).toBeUndefined();
  });

  test("a save retries, then gives up and stays dirty", async () => {
    const { memory, session } = setup();
    await session.open({ pageId: null, folderId: null, viewMode: "canvas" });

    memory.failNext(2);
    session.edit({ title: "flaky" });
    expect(await session.flush()).toBe(true);

    memory.failNext(3);
    session.edit({ title: "offline" });
    expect(await session.flush()).toBe(false);
    expect(session.getState()).toMatchObject({ dirty: true, failed: true });
  });

  test("opening another page saves the current one first", async () => {
    const { memory, session } = setup();
    const created = await session.open({
      pageId: null,
      folderId: null,
      viewMode: "canvas",
    });
    const firstId = created!.page.id;
    const other = await memory.store.create({
      title: "Other",
      note: "",
      viewMode: "doc",
      elements: [],
      folderId: null,
    });

    session.edit({ title: "Unsaved" });
    const opened = await session.open({
      pageId: other.id,
      folderId: null,
      viewMode: "canvas",
    });

    expect(memory.pages.get(firstId)?.title).toBe("Unsaved");
    expect(opened?.page.id).toBe(other.id);
    expect(session.getState()).toMatchObject({
      pageId: other.id,
      title: "Other",
      viewMode: "doc",
      dirty: false,
    });
  });

  test("a repeated open while creating makes one page", async () => {
    const { memory, session } = setup();
    const request = { pageId: null, folderId: null, viewMode: "doc" as const };
    const [a, b] = await Promise.all([
      session.open(request),
      session.open(request),
    ]);

    expect(a).toBe(b);
    expect(memory.pages.size).toBe(1);
    expect(session.getState().viewMode).toBe("doc");
  });
});
