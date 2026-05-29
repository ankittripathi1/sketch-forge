"use client";

import {
  useCreateFolder,
  useCreatePage,
  useNotebookDataQuery,
} from "@/api/hooks";

export function useNotebookData() {
  const notebookQuery = useNotebookDataQuery();
  const createFolderMutation = useCreateFolder();
  const createPageMutation = useCreatePage();

  return {
    folders: notebookQuery.data?.folders ?? [],
    pages: notebookQuery.data?.pages ?? [],
    canvases: notebookQuery.data?.canvases ?? [],
    isLoading: notebookQuery.isLoading,
    refreshFolders: notebookQuery.refetch,
    refreshPages: notebookQuery.refetch,
    refreshCanvases: notebookQuery.refetch,
    createFolder: (name: string, parentId?: string) =>
      createFolderMutation.mutateAsync({ name, parentId: parentId ?? null }),
    createPage: (title: string, folderId?: string) =>
      createPageMutation.mutateAsync({
        title,
        folderId: folderId ?? null,
      }),
  };
}
