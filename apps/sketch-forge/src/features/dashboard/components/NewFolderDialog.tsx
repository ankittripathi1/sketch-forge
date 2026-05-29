"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useCreateFolder } from "@/api/hooks";

interface NewFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folders: { id: string; name: string }[];
  defaultParentId?: string | null;
}

const COMMON_EMOJIS = [
  "📁",
  "📓",
  "📓",
  "🎨",
  "🚀",
  "💡",
  "🛠️",
  "📚",
  "🌟",
  "🔥",
];
const COMMON_COLORS = [
  "#5a8ae8",
  "#e85a5a",
  "#5ae88a",
  "#e8e85a",
  "#e85ae8",
  "#5ae8e8",
];

export function NewFolderDialog({
  isOpen,
  onClose,
  onSuccess,
  folders,
  defaultParentId = null,
}: NewFolderDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#5a8ae8");
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createFolderMutation = useCreateFolder();

  useEffect(() => {
    if (isOpen) {
      setParentId(defaultParentId);
    }
  }, [isOpen, defaultParentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createFolderMutation.mutateAsync({ name, icon, color, parentId });
      onSuccess();
      onClose();
      setName("");
      setIcon("📁");
      setColor("#5a8ae8");
      setParentId(null);
    } catch (error) {
      console.error("Failed to create folder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-base p-6 shadow-2xl transition-all duration-300 transform scale-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-heading">New Folder</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Folder Name
            </label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal Sketches"
              className="w-full rounded-xl border border-border-default bg-surface-overlay px-4 py-3 text-sm text-text-heading placeholder:text-text-dim outline-none focus:border-border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Parent Folder (Optional)
            </label>
            <div className="relative">
              <select
                value={parentId || ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="w-full rounded-xl border border-border-default bg-surface-overlay px-4 py-3 text-sm text-text-heading outline-none focus:border-border-accent appearance-none cursor-pointer transition-colors"
              >
                <option value="">None (Top Level)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                Icon
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all ${
                      icon === emoji
                        ? "bg-accent scale-110"
                        : "bg-surface-hover hover:bg-surface-hover"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                Color
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COMMON_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-full rounded-lg transition-all ${
                      color === c
                        ? "ring-2 ring-text-heading ring-offset-2 ring-offset-surface-base scale-105"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-text-muted hover:bg-surface-hover hover:text-text-body transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting || !name.trim()}
              type="submit"
              className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-text transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
