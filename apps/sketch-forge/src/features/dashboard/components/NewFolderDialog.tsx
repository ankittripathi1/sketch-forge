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
  "🗂️",
  "🎨",
  "🚀",
  "💡",
  "🛠️",
  "📚",
  "🌟",
  "🔥",
];
const COMMON_COLORS = ["#b94a2b", "#d48832", "#899267", "#a65b55"];

export function NewFolderDialog({
  isOpen,
  onClose,
  onSuccess,
  folders,
  defaultParentId = null,
}: NewFolderDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState("#b94a2b");
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
      setColor("#b94a2b");
      setParentId(null);
    } catch (error) {
      console.error("Failed to create folder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md rounded-[24px] border border-border-default bg-surface-base p-6 shadow-elev-4 transition-all duration-300">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Organize your library
            </p>
            <h2 className="font-display mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-text-heading">
              New folder
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Folder name
            </label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal Sketches"
              className="w-full rounded-[13px] border border-border-default bg-surface-overlay px-4 py-3 text-sm text-text-heading outline-none transition-colors placeholder:text-text-dim focus:border-border-accent-strong"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              Parent folder · optional
            </label>
            <div className="relative">
              <select
                value={parentId || ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="w-full cursor-pointer appearance-none rounded-[13px] border border-border-default bg-surface-overlay px-4 py-3 text-sm text-text-heading outline-none transition-colors focus:border-border-accent-strong"
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
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
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
                        ? "scale-105 bg-accent-subtle ring-1 ring-border-accent-strong"
                        : "bg-surface-hover hover:bg-surface-hover"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
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
              className="flex-1 rounded-full px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-hover hover:text-text-body"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting || !name.trim()}
              type="submit"
              className="flex-1 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-text transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
