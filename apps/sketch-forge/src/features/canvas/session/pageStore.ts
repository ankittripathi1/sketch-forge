import type { ReadonlyElement } from "@repo/canvas-engine";
import type { SketchElement } from "@repo/element/types";
import type { PageViewMode } from "@repo/schema";
import { createPageRecord, fetchPage, updatePageRecord } from "@/api/canvas";
import type { PageDetail } from "@/api/types";

/** The editable fields a page session writes on every save. */
export type PageSave = {
  title: string;
  note: string;
  viewMode: PageViewMode;
  elements: readonly ReadonlyElement[];
  thumbnailLight?: string;
  thumbnailDark?: string;
};

/**
 * Where a page session loads and saves pages. `httpPageStore` talks to the
 * API; tests pass an in-memory store.
 */
export interface PageStore {
  get(id: string): Promise<PageDetail>;
  create(save: PageSave & { folderId: string | null }): Promise<PageDetail>;
  update(id: string, save: PageSave): Promise<PageDetail>;
}

// The body is only serialized, so handing the API read-only elements is safe.
function toBody({ elements, thumbnailLight, ...rest }: PageSave) {
  return {
    ...rest,
    elements: elements as SketchElement[],
    // The dashboard still reads `thumbnail`; it shows the light one.
    ...(thumbnailLight ? { thumbnail: thumbnailLight, thumbnailLight } : {}),
  };
}

export const httpPageStore: PageStore = {
  get: fetchPage,
  create: ({ folderId, ...save }) =>
    createPageRecord({
      ...toBody(save),
      ...(folderId ? { folderId } : {}),
    }),
  update: (id, save) => updatePageRecord(id, toBody(save)),
};
