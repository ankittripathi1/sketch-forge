"use client";

import { Brain, Pencil, X } from "lucide-react";
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
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col rounded-l-2xl bg-[oklch(0.18_0.012_260)] shadow-[0_8px_32px_oklch(0_0_0/0.45),inset_0_1px_0_oklch(1_0_0/0.07)] transition-transform duration-200 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[oklch(1_0_0/0.06)] px-4 py-3.5">
          <span className="text-[13px] font-semibold tracking-tight text-[oklch(0.85_0.005_260)]">
            Settings
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[oklch(0.55_0.01_260)] hover:bg-[oklch(0.25_0.012_260)] hover:text-[oklch(0.85_0.005_260)]"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          {/* ── Scribble toggle ── */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[oklch(0.38_0.008_260)]">
                Handwriting
              </span>
              <span className="rounded-md bg-[oklch(0.82_0.14_88/0.15)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[oklch(0.82_0.14_88)]">
                Beta
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[oklch(1_0_0/0.06)] bg-[oklch(0.22_0.012_260)] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[oklch(0.3_0.014_260)]">
                  <Pencil size={15} className="text-[oklch(0.6_0.01_260)]" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[oklch(0.85_0.005_260)]">
                    Scribble to text
                  </p>
                  <p className="text-[10px] text-[oklch(0.5_0.01_260)]">
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
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[oklch(0.38_0.008_260)]">
                Recognition engine
              </span>

              {/* Backend selector */}
              <div className="flex gap-1.5 rounded-xl bg-[oklch(0.13_0.01_260)] p-1">
                {(["tesseract", "gemini"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBackend(b)}
                    className={[
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-medium transition-all",
                      recognitionBackend === b
                        ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)] shadow-sm"
                        : "text-[oklch(0.56_0.01_260)] hover:bg-[oklch(0.22_0.012_260)] hover:text-[oklch(0.82_0.005_260)]",
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
              <p className="rounded-lg bg-[oklch(1_0_0/0.03)] px-3 py-2 text-[10px] leading-relaxed text-[oklch(0.52_0.01_260)]">
                {usingAI
                  ? "Gemini 2.0 Flash accurately recognises cursive and messy handwriting. Requires a free Google AI Studio API key."
                  : "Local OCR runs entirely in-browser with no API key, but works best with clear, printed letters."}
              </p>

              {/* Gemini API key input */}
              {usingAI && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-medium text-[oklch(0.55_0.01_260)]">
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
                      className="min-w-0 flex-1 rounded-lg border border-[oklch(1_0_0/0.08)] bg-[oklch(0.13_0.01_260)] px-2.5 py-2 text-[11px] font-mono text-[oklch(0.78_0.005_260)] placeholder-[oklch(0.38_0.008_260)] outline-none transition-colors focus:border-[oklch(0.82_0.14_88/0.6)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[oklch(1_0_0/0.08)] bg-[oklch(0.13_0.01_260)] text-[oklch(0.5_0.01_260)] hover:text-[oklch(0.8_0.005_260)]"
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {recognitionApiKey && recognitionApiKey === keyDraft && (
                    <p className="text-[10px] text-[oklch(0.62_0.14_145)]">
                      ✓ Key saved
                    </p>
                  )}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[oklch(0.62_0.12_260)] underline underline-offset-2 hover:text-[oklch(0.78_0.12_260)]"
                  >
                    Get a free API key at Google AI Studio →
                  </a>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-[oklch(1_0_0/0.05)] px-4 py-3">
          <p className="text-[10px] text-[oklch(0.38_0.01_260)]">
            More settings coming soon…
          </p>
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
      className={`relative h-5 w-9 rounded-full transition-colors duration-150 ${value ? "bg-[oklch(0.82_0.14_88)]" : "bg-[oklch(0.35_0.01_260)]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${value ? "translate-x-4.5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
