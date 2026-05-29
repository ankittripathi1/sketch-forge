import type { PageStatus, UpdatePage } from "@repo/schema";
import type { SketchElement } from "@repo/canvas-core/types";

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

export interface CanvasSummary {
  id: string;
  title: string;
  thumbnail: string | null;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  thumbnail: string | null;
  thumbnailLight: string | null;
  thumbnailDark: string | null;
  folderId: string | null;
  snippet: string;
}

export interface DashboardData {
  pages: Page[];
  folders: Folder[];
}

export interface NotebookData extends DashboardData {
  canvases: CanvasSummary[];
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
