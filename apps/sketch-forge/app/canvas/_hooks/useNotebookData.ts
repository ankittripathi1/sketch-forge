import { useState, useEffect, useCallback } from "react";

interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
}

interface Page {
  id: string;
  title: string;
  folderId?: string | null;
}

interface Canvas {
  id: string;
  title: string;
}

export function useNotebookData() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:4001/folders", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }, []);

  const fetchCanvases = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:4001/canvases", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setCanvases(data);
      }
    } catch (error) {
      console.error("Failed to fetch canvases:", error);
    }
  }, []);

  const fetchPages = useCallback(async (folderId?: string) => {
    try {
      const url = folderId
        ? `http://localhost:4001/pages?folderId=${folderId}`
        : "http://localhost:4001/pages";
      const response = await fetch(url, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    }
  }, []);

  const createFolder = async (name: string, parentId?: string) => {
    try {
      const response = await fetch("http://localhost:4001/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
        credentials: "include",
      });
      if (response.ok) {
        await fetchFolders();
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const createPage = async (title: string, folderId?: string) => {
    try {
      const response = await fetch("http://localhost:4001/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, folderId }),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        await fetchPages(folderId);
        return data;
      }
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchFolders(), fetchPages(), fetchCanvases()]);
      setIsLoading(false);
    };
    init();
  }, [fetchFolders, fetchPages, fetchCanvases]);

  return {
    folders,
    pages,
    canvases,
    isLoading,
    refreshFolders: fetchFolders,
    refreshPages: fetchPages,
    refreshCanvases: fetchCanvases,
    createFolder,
    createPage,
  };
}
