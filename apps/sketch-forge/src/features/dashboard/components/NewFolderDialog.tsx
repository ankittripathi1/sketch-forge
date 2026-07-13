"use client";

import { useState, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronDown, X } from "lucide-react";
import { useCreateFolder } from "@/api/hooks";

gsap.registerPlugin(useGSAP);

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const createFolderMutation = useCreateFolder();

  useGSAP(
    () => {
      if (!isOpen || !dialogRef.current) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".dialog-overlay", { autoAlpha: 0, duration: 0.2 })
          .from(
            ".dialog-panel",
            { autoAlpha: 0, y: 20, scale: 0.97, duration: 0.38 },
            "<0.04",
          );
      });
      return () => media.revert();
    },
    { scope: dialogRef, dependencies: [isOpen], revertOnUpdate: true },
  );

  useEffect(() => {
    if (isOpen) {
      setParentId(defaultParentId);
      setErrorMessage(null);
    }
  }, [isOpen, defaultParentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
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
      setErrorMessage("We could not create the folder. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={dialogRef} className="dashboard-dialog-root">
      <button
        type="button"
        className="dialog-overlay"
        onClick={onClose}
        aria-label="Close folder dialog"
      />
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-folder-title"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-accent">
              Organize your library
            </p>
            <h2
              id="new-folder-title"
              className="font-display mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-text-heading"
            >
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
            <label className="dashboard-field-label">Folder name</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Personal Sketches"
              className="dashboard-field"
            />
          </div>

          <div>
            <label className="dashboard-field-label">
              Parent folder (optional)
            </label>
            <div className="relative">
              <select
                value={parentId || ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="dashboard-field cursor-pointer appearance-none"
              >
                <option value="">None (Top Level)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                <ChevronDown size={15} strokeWidth={1.7} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="dashboard-field-label">Icon</label>
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
              <label className="dashboard-field-label">Color</label>
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

          {errorMessage ? (
            <p role="alert" className="dashboard-form-error">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="dashboard-action dashboard-action-secondary flex-1"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting || !name.trim()}
              type="submit"
              className="dashboard-action dashboard-action-primary flex-1 disabled:translate-y-0 disabled:opacity-50"
            >
              {isSubmitting ? "Creating…" : "Create folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
