"use client";

import { Brain, Eye, EyeOff, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_BACKEND = "sketch-forge:recognition-backend";
const STORAGE_KEY = "sketch-forge:recognition-api-key";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scribbleEnabled: boolean;
  onScribbleChange: (v: boolean) => void;
  recognitionBackend: "tesseract" | "gemini";
  onRecognitionBackend: (v: "tesseract" | "gemini") => void;
  recognitionApiKey: string;
  onRecognitionApiKey: (v: string) => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  scribbleEnabled,
  onScribbleChange,
  recognitionBackend,
  onRecognitionBackend,
  recognitionApiKey,
  onRecognitionApiKey,
}: SettingsPanelProps) {
  const [visible, setVisible] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState(recognitionApiKey);
  const keyRef = useRef<HTMLInputElement>(null);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Load persisted values on mount
  useEffect(() => {
    const b = localStorage.getItem(STORAGE_BACKEND);
    if (b === "gemini" || b === "tesseract") onRecognitionBackend(b);
    const k = localStorage.getItem(STORAGE_KEY) ?? "";
    onRecognitionApiKey(k);
    setKeyDraft(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync draft when the value changes externally
  useEffect(() => {
    setKeyDraft(recognitionApiKey);
  }, [recognitionApiKey]);

  function handleBackend(v: "tesseract" | "gemini") {
    onRecognitionBackend(v);
    localStorage.setItem(STORAGE_BACKEND, v);
  }

  function handleKeySave() {
    const trimmed = keyDraft.trim();
    onRecognitionApiKey(trimmed);
    localStorage.setItem(STORAGE_KEY, trimmed);
  }

  if (!visible) return null;

  const usingAI = recognitionBackend === "gemini";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col rounded-l-2xl bg-surface-overlay shadow-elev-3 transition-transform duration-200 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5">
          <span className="text-[13px] font-semibold tracking-tight text-text-body">
            Settings
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-hover hover:text-text-body"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          {/* ── Scribble toggle ── */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-text-dim">
                Handwriting
              </span>
              <span className="rounded-md bg-accent-subtle px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-accent">
                Beta
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-raised p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover">
                  <Pencil size={15} className="text-text-secondary" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-text-body">
                    Scribble to text
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Draw with freehand to convert
                  </p>
                </div>
              </div>
              <Toggle value={scribbleEnabled} onChange={onScribbleChange} />
            </div>
          </section>

          {/* ── Recognition engine ── */}
          {scribbleEnabled && (
            <section className="flex flex-col gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-text-dim">
                Recognition engine
              </span>

              {/* Backend selector */}
              <div className="flex gap-1.5 rounded-xl bg-surface-raised p-1">
                {(["tesseract", "gemini"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBackend(b)}
                    className={[
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all",
                      recognitionBackend === b
                        ? "bg-accent text-accent-text shadow-sm"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-body",
                    ].join(" ")}
                  >
                    {b === "gemini" ? (
                      <Brain size={12} strokeWidth={1.8} />
                    ) : (
                      <Pencil size={12} strokeWidth={1.8} />
                    )}
                    {b === "gemini" ? "Gemini AI" : "Local OCR"}
                  </button>
                ))}
              </div>

              {/* Description */}
              <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs leading-relaxed text-text-secondary">
                {usingAI
                  ? "Gemini 2.0 Flash accurately recognises cursive and messy handwriting. Requires a free Google AI Studio API key."
                  : "Local OCR runs entirely in-browser with no API key, but works best with clear, printed letters."}
              </p>

              {/* Gemini API key input */}
              {usingAI && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-medium text-text-secondary">
                    Gemini API Key
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      ref={keyRef}
                      type={showKey ? "text" : "password"}
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onBlur={handleKeySave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleKeySave();
                          keyRef.current?.blur();
                        }
                      }}
                      placeholder="AIza…"
                      className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface-raised px-2.5 py-2 text-xs font-mono text-text-body placeholder:text-text-dim outline-none transition-colors focus:border-border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-text-muted hover:text-text-body transition-colors"
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? <EyeOff size={13} strokeWidth={1.8} /> : <Eye size={13} strokeWidth={1.8} />}
                    </button>
                  </div>
                  {recognitionApiKey && recognitionApiKey === keyDraft && (
                    <p className="text-xs text-status-success">✓ Key saved</p>
                  )}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-text-secondary underline underline-offset-2 hover:text-text-body"
                  >
                    Get a free API key at Google AI Studio →
                  </a>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-border-subtle px-4 py-3">
          <p className="text-xs text-text-dim">More settings coming soon…</p>
        </div>
      </div>
    </>
  );
}

// ── Mini toggle ───────────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 rounded-full transition-colors duration-150 ${value ? "bg-accent" : "bg-surface-hover"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-text-primary shadow transition-transform duration-150 ${value ? "translate-x-4.5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
