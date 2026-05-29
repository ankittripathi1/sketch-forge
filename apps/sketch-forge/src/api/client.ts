import type {
  CanvasSummary,
  CreateFolderInput,
  CreatePageInput,
  DashboardData,
  Folder,
  FolderDetail,
  NotebookData,
  Page,
  SearchResult,
  UpdateFolderInput,
  UpdatePageInput,
} from "./types";
import { PUBLIC_API_URL } from "./config";

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(`API request failed: ${path}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [pages, folders] = await Promise.all([
    request<Page[]>("/pages"),
    request<Folder[]>("/folders"),
  ]);

  return { pages, folders };
}

export async function getNotebookData(): Promise<NotebookData> {
  const [dashboard, canvases] = await Promise.all([
    getDashboardData(),
    request<CanvasSummary[]>("/canvases"),
  ]);

  return { ...dashboard, canvases };
}

export function getFolderDetail(id: string) {
  return request<FolderDetail>(`/folders/${id}`);
}

export function updatePage(id: string, data: UpdatePageInput) {
  return request<Page>(`/pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function createPage(data: CreatePageInput = {}) {
  return request<Page>("/pages", {
    method: "POST",
    body: JSON.stringify({
      title: data.title ?? "Untitled page",
      elements: data.elements ?? [],
      folderId: data.folderId ?? null,
    }),
  });
}

export function deletePage(id: string) {
  return request<void>(`/pages/${id}`, { method: "DELETE" });
}

export function createFolder(data: CreateFolderInput) {
  return request<Folder>("/folders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFolder(id: string, data: UpdateFolderInput) {
  return request<Folder>(`/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteFolder(id: string) {
  return request<void>(`/folders/${id}`, { method: "DELETE" });
}

export function searchPages(query: string) {
  return request<SearchResult[]>(
    `/pages/search?q=${encodeURIComponent(query)}`,
  );
}
