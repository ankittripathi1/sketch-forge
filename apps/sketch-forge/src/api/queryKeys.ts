export const queryKeys = {
  dashboard: ["dashboard"] as const,
  notebook: ["notebook"] as const,
  folder: (id: string) => ["folder", id] as const,
  search: (query: string) => ["search", query] as const,
};
