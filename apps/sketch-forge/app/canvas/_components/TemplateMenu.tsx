"use client";

import { useState, useRef, useEffect } from "react";
import { LayoutTemplate, Save, Check, Loader2 } from "lucide-react";
import { SketchElement } from "@repo/canvas-core/types";

interface TemplateMenuProps {
  elements: SketchElement[];
  onSaveSuccess?: () => void;
}

export function TemplateMenu({ elements, onSaveSuccess }: TemplateMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSaveAsTemplate = async () => {
    const name = prompt("Enter template name:");
    if (!name) return;

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001"}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          elements,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
        onSaveSuccess?.();
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Template Actions"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none transition-all duration-150 sm:h-9 sm:w-9 ${
          isOpen
            ? "bg-surface-hover text-text-heading"
            : "text-text-secondary hover:bg-surface-hover hover:text-text-body"
        }`}
      >
        <LayoutTemplate size={16} strokeWidth={1.6} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border-default bg-surface-overlay p-1.5 shadow-2xl backdrop-blur-xl sm:bottom-auto sm:top-full sm:mt-2">
          <button
            onClick={handleSaveAsTemplate}
            disabled={isSaving || elements.length === 0}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-body hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saveStatus === "success" ? (
              <Check size={14} className="text-status-success" />
            ) : (
              <Save size={14} />
            )}
            <span>Save as Template</span>
          </button>
        </div>
      )}
    </div>
  );
}
