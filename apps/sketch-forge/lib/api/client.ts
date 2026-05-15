import type { DashboardData, Folder, Page, UpdatePageInput } from "./types";
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
  const [stats, pages, folders] = await Promise.all([
    request<DashboardData["stats"]>("/stats").catch(() => null),
    request<Page[]>("/pages").catch(() => []),
    request<Folder[]>("/folders").catch(() => []),
  ]);

  return { stats, pages, folders };
}

export function updatePage(id: string, data: UpdatePageInput) {
  return request<Page>(`/pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deletePage(id: string) {
  return request<void>(`/pages/${id}`, { method: "DELETE" });
}
