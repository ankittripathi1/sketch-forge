"use client";

import { useCreateFolder, useCreatePage, useDashboardData } from "@/api/hooks";

export function useNotebookData() {
  const notebookQuery = useDashboardData();
  const createFolderMutation = useCreateFolder();
  const createPageMutation = useCreatePage();

  return {
    folders: notebookQuery.data?.folders ?? [],
    pages: notebookQuery.data?.pages ?? [],
    isLoading: notebookQuery.isLoading,
    refreshFolders: notebookQuery.refetch,
    refreshPages: notebookQuery.refetch,
    createFolder: (name: string, parentId?: string) =>
      createFolderMutation.mutateAsync({ name, parentId: parentId ?? null }),
    createPage: (title: string, folderId?: string) =>
      createPageMutation.mutateAsync({
        title,
        folderId: folderId ?? null,
      }),
  };
}
