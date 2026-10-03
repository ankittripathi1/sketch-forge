import type { PageStatus, PageViewMode, UpdatePage } from "@repo/schema";
import type { SketchElement } from "@repo/element/types";

export interface Page {
  id: string;
  title: string;
  status: PageStatus;
  updatedAt: string;
  thumbnail: string | null;
  thumbnailLight: string | null;
  thumbnailDark: string | null;
  folderId: string | null;
  pageOrder: number;
}

/** One page as `GET /pages/:id`, `POST /pages` and `PATCH /pages/:id` return it. */
export interface PageDetail extends Page {
  elements: SketchElement[] | null;
  note: string | null;
  viewMode: PageViewMode;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

export interface FolderDetail extends Folder {
  pages: Page[];
  children: Folder[];
}

export interface SearchResult {
  id: string;
  title: string;
  thumbnail: string | null;
  thumbnailLight: string | null;
  thumbnailDark: string | null;
  folderId: string | null;
  snippet: string;
  /** True when the match came from the page note (opens the notes drawer). */
  noteMatch: boolean;
}

export interface DashboardData {
  pages: Page[];
  folders: Folder[];
}

export interface CreatePageInput {
  title?: string;
  folderId?: string | null;
  elements?: SketchElement[];
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export type UpdatePageInput = UpdatePage;
