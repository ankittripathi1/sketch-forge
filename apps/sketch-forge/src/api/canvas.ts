import type { CreatePage, UpdatePage } from "@repo/schema";
import { PUBLIC_API_URL } from "./config";
import type { PageDetail } from "./types";

export async function fetchPage(id: string): Promise<PageDetail> {
  const res = await fetch(`${PUBLIC_API_URL}/pages/${id}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Load failed: ${res.status}`);
  }
  return res.json();
}

export async function createPageRecord(body: CreatePage): Promise<PageDetail> {
  const res = await fetch(`${PUBLIC_API_URL}/pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

export async function updatePageRecord(
  id: string,
  body: UpdatePage,
): Promise<PageDetail> {
  const res = await fetch(`${PUBLIC_API_URL}/pages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Update failed: ${res.status} ${text}`);
  }
  return res.json();
}
