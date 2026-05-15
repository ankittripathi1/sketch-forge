"use client";

import { useEffect, useState, useCallback, use } from "react";
import {
  Plus,
  FileText,
  LayoutGrid,
  List,
  PlusCircle,
  FolderPlus,
} from "lucide-react";

import { Breadcrumbs } from "../../_components/Breadcrumbs";
import { PageCard } from "../../_components/PageCard";
import { NewFolderDialog } from "../../_components/NewFolderDialog";
import { TemplatePicker } from "../../_components/TemplatePicker";
import { useRouter } from "next/navigation";

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  color: string | null;
}

interface Page {
  id: string;
  title: string;
  status: "new" | "learning" | "mastered";
  updatedAt: string;
  thumbnail: string | null;
  folderId: string | null;
  pageOrder: number;
}

interface FolderDetail extends Folder {
  pages: Page[];
  children: Folder[];
}

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [folder, setFolder] = useState<FolderDetail | null>(null);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchFolderData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [detailRes, allRes] = await Promise.all([
        fetch(`http://localhost:4001/folders/${id}`, {
          credentials: "include",
        }),
        fetch(`http://localhost:4001/folders`, { credentials: "include" }),
      ]);

      if (detailRes.ok) {
        const data = await detailRes.json();
        setFolder(data);
      }
      if (allRes.ok) {
        const data = await allRes.json();
        setAllFolders(data);
      }
    } catch (error) {
      console.error("Failed to fetch folder data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFolderData();
  }, [fetchFolderData]);

  const handleCreatePage = async (templateId?: string) => {
    try {
      const endpoint = templateId
        ? `http://localhost:4001/templates/${templateId}/apply`
        : "http://localhost:4001/pages";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Page",
          folderId: id,
        }),
        credentials: "include",
      });
      if (response.ok) {
        const newPage = await response.json();
        router.push(`/canvas?pageId=${newPage.id}&folderId=${id}`);
      }
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("pageId", id);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("pageId");
      if (!draggedId || draggedId === targetId || !folder) return;

      const pages = [...folder.pages].sort((a, b) => a.pageOrder - b.pageOrder);
      const draggedIndex = pages.findIndex((p) => p.id === draggedId);
      const targetIndex = pages.findIndex((p) => p.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const [movedPage] = pages.splice(draggedIndex, 1);
      if (!movedPage) return;
      pages.splice(targetIndex, 0, movedPage);

      // Update all page orders locally first for snappy UI
      const updatedPages = pages.map((p, index) => ({
        ...p,
        pageOrder: index,
      }));
      setFolder((prev) => (prev ? { ...prev, pages: updatedPages } : null));

      // Persist to API
      try {
        await Promise.all(
          updatedPages.map((p) =>
            fetch(`http://localhost:4001/pages/${p.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pageOrder: p.pageOrder }),
              credentials: "include",
            }),
          ),
        );
      } catch (error) {
        console.error("Failed to persist reordering:", error);
        fetchFolderData(); // Rollback on error
      }
    },
    [folder, fetchFolderData],
  );

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-4 w-48 bg-surface-raised rounded mb-8" />
        <div className="h-10 w-64 bg-surface-raised rounded mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-surface-raised rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!folder) return <div className="p-6">Folder not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header & Breadcrumbs */}
      <div className="mb-8">
        <Breadcrumbs currentFolderId={id} allFolders={allFolders} />
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{folder.icon || "📁"}</span>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              {folder.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-raised transition-all"
            >
              <FolderPlus size={16} />
              <span>Sub-folder</span>
            </button>
            <button
              onClick={() => setIsTemplatePickerOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-text active:scale-[0.98] transition-transform"
            >
              <PlusCircle size={16} />
              <span>New Page</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-folders Section */}
      {folder.children.length > 0 && (
        <section className="mb-12">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-4">
            Sub-folders
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {folder.children.map((child) => (
              <button
                key={child.id}
                onClick={() => router.push(`/dashboard/folder/${child.id}`)}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-raised/50 p-3 text-left transition-all hover:border-border-accent hover:bg-surface-raised"
              >
                <span className="text-xl">{child.icon || "📁"}</span>
                <span className="truncate text-sm font-medium text-text-primary">
                  {child.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Pages Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Pages ({folder.pages.length})
          </h2>
          <div className="flex items-center bg-surface-raised rounded-xl p-1 border border-border-subtle">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-surface-overlay text-text-primary shadow-sm" : "text-text-secondary"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-surface-overlay text-text-primary shadow-sm" : "text-text-secondary"}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {folder.pages.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
                : "space-y-2"
            }
          >
            {folder.pages
              .sort((a, b) => a.pageOrder - b.pageOrder)
              .map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  onRefresh={fetchFolderData}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  allFolders={allFolders}
                />
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-surface-raised/30 rounded-3xl border border-border-faint">
            <FileText size={48} className="text-text-dim mb-4" />
            <h3 className="font-bold text-text-primary mb-1">
              No pages in this folder
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              Start by creating your first sketch or note.
            </p>
            <button
              onClick={() => setIsTemplatePickerOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-text active:scale-[0.98] transition-transform"
            >
              <Plus size={18} strokeWidth={3} />
              <span>Create Page</span>
            </button>
          </div>
        )}
      </section>

      <NewFolderDialog
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onSuccess={fetchFolderData}
        folders={allFolders}
        defaultParentId={id}
      />
      <TemplatePicker
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelect={(templateId) => {
          setIsTemplatePickerOpen(false);
          handleCreatePage(templateId);
        }}
      />
    </div>
  );
}
