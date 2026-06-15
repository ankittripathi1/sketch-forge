"use client";

import React, { useState } from "react";
import { FolderPlus, X, Check } from "lucide-react";
import { useFolders } from "@/api/hooks";

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
}

export function FolderPicker({ isOpen, onClose, onSelect }: FolderPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: folders = [], isLoading } = useFolders({ enabled: isOpen });

  const buildTree = (
    parentId: string | null = null,
    depth = 0,
  ): React.ReactElement[] => {
    return folders
      .filter((f) => f.parentId === parentId)
      .flatMap((folder) => [
        <button
          key={folder.id}
          onClick={() => setSelectedId(folder.id)}
          className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
            selectedId === folder.id
              ? "bg-accent-subtle text-accent"
              : "text-text-body active:bg-surface-hover"
          }`}
          style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
        >
          <span className="text-lg">{folder.icon || "📁"}</span>
          <span className="flex-1 text-left font-medium">{folder.name}</span>
          {selectedId === folder.id && <Check size={16} />}
        </button>,
        ...buildTree(folder.id, depth + 1),
      ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      <div
        className={`w-full max-w-md rounded-t-[2.5rem] bg-surface-base border-t border-border-default shadow-2xl transition-transform duration-300 ease-out transform translate-y-0`}
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex flex-col h-full">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 rounded-full bg-border-default" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4">
            <h2 className="text-xl font-bold text-text-heading">Save to...</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-surface-hover text-text-muted"
            >
              <X size={20} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-6">
            <button
              onClick={() => setSelectedId(null)}
              className={`flex w-full items-center gap-3 px-4 py-4 text-sm transition-colors ${
                selectedId === null
                  ? "bg-accent-subtle text-accent"
                  : "text-text-body active:bg-surface-hover"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-lg">
                📥
              </div>
              <span className="flex-1 text-left font-medium">
                Unfiled Pages
              </span>
              {selectedId === null && <Check size={16} />}
            </button>

            {isLoading ? (
              <div className="py-10 text-center text-text-muted text-sm">
                Loading folders...
              </div>
            ) : (
              buildTree(null)
            )}

            <button className="mt-2 flex w-full items-center gap-3 px-4 py-4 text-sm text-text-muted hover:text-accent transition-colors">
              <FolderPlus size={18} />
              <span className="font-medium">Create New Folder</span>
            </button>
          </div>

          {/* Action */}
          <div className="p-6 border-t border-border-default">
            <button
              onClick={() => onSelect(selectedId)}
              className="w-full rounded-2xl bg-accent py-4 text-sm font-bold text-accent-text transition-all active:scale-[0.98]"
            >
              Confirm Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
