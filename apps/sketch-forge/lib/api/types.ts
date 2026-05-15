import type { PageStatus, UpdatePage } from "@repo/schema";

export interface Page {
  id: string;
  title: string;
  status: PageStatus;
  updatedAt: string;
  thumbnail: string | null;
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

export interface DashboardStats {
  byStatus: { new: number; learning: number; mastered: number };
  reviewed: { today: number; week: number; month: number };
  streak: number;
  folderBreakdown: {
    folderId: string | null;
    name: string;
    total: number;
    new: number;
    learning: number;
    mastered: number;
  }[];
  heatmapData: { date: string; count: number }[];
  dueCount: number;
}

export interface DashboardData {
  stats: DashboardStats | null;
  pages: Page[];
  folders: Folder[];
}

export type UpdatePageInput = UpdatePage;
