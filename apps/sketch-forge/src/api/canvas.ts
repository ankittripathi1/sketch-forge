export type EntityType = "pages" | "canvases";

export async function fetchEntity(type: EntityType, id: string) {
  const res = await fetch(`${PUBLIC_API_URL}/${type}/${id}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiError(`Load failed ${res.status}`);
  }
  return res.json();
}

export async function createEntity(
  type: EntityType,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${PUBLIC_API_URL}/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

export async function updateEntity(
  type: EntityType,
  id: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${PUBLIC_API_URL}/${type}/${id}`, {
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
