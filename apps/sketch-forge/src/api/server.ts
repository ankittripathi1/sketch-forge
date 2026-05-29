import "server-only";

import { cookies } from "next/headers";
import type { DashboardData, Folder, Page } from "./types";

const INTERNAL_API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4001";

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
  const cookieStore = await cookies();
  const response = await fetch(`${INTERNAL_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString(),
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
    request<Page[]>("/pages").catch((error) => {
      console.error("[server] GET /pages failed:", error);
      return [] as Page[];
    }),
    request<Folder[]>("/folders").catch((error) => {
      console.error("[server] GET /folders failed:", error);
      return [] as Folder[];
    }),
  ]);

  return { pages, folders };
}
