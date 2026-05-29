"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createFolder,
  createPage,
  deleteFolder,
  deletePage,
  getDashboardData,
  getFolderDetail,
  getNotebookData,
  searchPages,
  updateFolder,
  updatePage,
} from "./client";
import { queryKeys } from "./queryKeys";
import type {
  CreateFolderInput,
  CreatePageInput,
  DashboardData,
  FolderDetail,
  NotebookData,
  UpdateFolderInput,
  UpdatePageInput,
} from "./types";

function invalidateLibrary(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notebook }),
    queryClient.invalidateQueries({ queryKey: ["folder"] }),
  ]);
}

export function useDashboardData(initialData?: DashboardData) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboardData,
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useNotebookDataQuery(initialData?: NotebookData) {
  return useQuery({
    queryKey: queryKeys.notebook,
    queryFn: getNotebookData,
    initialData,
  });
}

export function useFolderDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.folder(id),
    queryFn: () => getFolderDetail(id),
  });
}

export function useSearchPages(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => searchPages(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePageInput) => createPage(data),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePageInput }) =>
      updatePage(id, data),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePage,
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFolderInput) => createFolder(data),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFolderInput }) =>
      updateFolder(id, data),
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => invalidateLibrary(queryClient),
  });
}

export function useReorderPages(folderId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pages: FolderDetail["pages"]) => {
      await Promise.all(
        pages.map((page) => updatePage(page.id, { pageOrder: page.pageOrder })),
      );
    },
    onMutate: async (pages) => {
      if (!folderId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.folder(folderId) });
      const previous = queryClient.getQueryData<FolderDetail>(
        queryKeys.folder(folderId),
      );
      queryClient.setQueryData<FolderDetail>(
        queryKeys.folder(folderId),
        (old) => (old ? { ...old, pages } : old),
      );
      return { previous };
    },
    onError: (_error, _pages, context) => {
      if (folderId && context?.previous) {
        queryClient.setQueryData(queryKeys.folder(folderId), context.previous);
      }
    },
    onSettled: () => invalidateLibrary(queryClient),
  });
}
