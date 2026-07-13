"use client";

import {
  Brain,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Moon,
  Palette,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  KeyboardShortcutSettings,
  useCanvasShortcutRegistry,
} from "@/features/canvas";
import { useAppTheme } from "@/theme/ThemeProvider";
import type { AppTheme } from "@/theme/themeConfig";

gsap.registerPlugin(useGSAP);

const STORAGE_BACKEND = "sketch-forge:recognition-backend";
const STORAGE_KEY = "sketch-forge:recognition-api-key";

const themes: Array<{
  id: AppTheme;
  title: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    id: "light",
    title: "Light",
    description: "Cool paper surfaces for bright rooms and daytime work.",
    icon: Sun,
  },
  {
    id: "dark",
    title: "Dark",
    description: "Layered graphite surfaces for focused, low-light sessions.",
    icon: Moon,
  },
];

export default function SettingsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, mounted } = useAppTheme();
  const shortcuts = useCanvasShortcutRegistry();
  const [recognitionBackend, setRecognitionBackend] = useState<
    "tesseract" | "gemini"
  >("tesseract");
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".dashboard-enter",
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.62,
            stagger: 0.075,
            ease: "power3.out",
          },
        );
      });
      return () => media.revert();
    },
    { scope: pageRef },
  );

  useEffect(() => {
    const savedBackend = localStorage.getItem(STORAGE_BACKEND);
    if (savedBackend === "gemini" || savedBackend === "tesseract") {
      setRecognitionBackend(savedBackend);
    }
    setKeyDraft(localStorage.getItem(STORAGE_KEY) ?? "");
  }, []);

  function handleBackend(nextBackend: "tesseract" | "gemini") {
    setRecognitionBackend(nextBackend);
    localStorage.setItem(STORAGE_BACKEND, nextBackend);
  }

  function handleKeySave() {
    localStorage.setItem(STORAGE_KEY, keyDraft.trim());
    setKeyDraft(keyDraft.trim());
  }

  return (
    <div ref={pageRef} className="dashboard-workspace dashboard-settings">
      <header className="dashboard-library-header dashboard-enter block">
        <p className="text-xs font-medium text-text-secondary">Workspace</p>
        <h1 className="dashboard-title mt-2">Settings</h1>
        <p className="mt-3 max-w-[58ch] text-sm leading-7 text-text-secondary">
          Manage how Sketch Forge looks and review the profile connected to this
          workspace.
        </p>
      </header>

      <div className="grid gap-12">
        <section
          aria-labelledby="appearance-heading"
          className="settings-section dashboard-enter"
        >
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-subtle text-accent">
              <Palette size={18} />
            </span>
            <h2
              id="appearance-heading"
              className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-text-heading"
            >
              Appearance
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Choose the theme used across the dashboard and canvas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {themes.map((option) => {
              const Icon = option.icon;
              const isSelected = mounted && theme === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={isSelected}
                  className={`dashboard-setting-option ${
                    isSelected
                      ? "border-border-accent-strong bg-accent-subtle shadow-elev-2"
                      : "border-border-subtle bg-surface-raised hover:border-border-default"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${
                      isSelected
                        ? "bg-accent text-accent-text"
                        : "bg-surface-hover text-text-secondary"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="mt-5 block font-display text-lg font-semibold tracking-[-0.025em] text-text-heading">
                    {option.title}
                  </span>
                  <span className="mt-1.5 block text-xs leading-5 text-text-secondary">
                    {option.description}
                  </span>
                  {isSelected ? (
                    <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-text">
                      <Check size={13} strokeWidth={2.6} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="recognition-heading"
          className="settings-section dashboard-enter"
        >
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-subtle text-accent">
              <Brain size={18} />
            </span>
            <h2
              id="recognition-heading"
              className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-text-heading"
            >
              Recognition
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Choose how handwriting and AI-assisted canvas features are
              configured.
            </p>
          </div>

          <div className="dashboard-settings-panel">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["tesseract", "gemini"] as const).map((backend) => {
                const selected = recognitionBackend === backend;

                return (
                  <button
                    key={backend}
                    type="button"
                    onClick={() => handleBackend(backend)}
                    aria-pressed={selected}
                    className={`dashboard-setting-option min-h-0 p-4 ${
                      selected
                        ? "border-border-accent-strong bg-accent-subtle shadow-elev-2"
                        : "border-border-subtle bg-surface-sunken hover:border-border-default"
                    }`}
                  >
                    <span className="font-display text-base font-semibold tracking-[-0.02em] text-text-heading">
                      {backend === "gemini" ? "Gemini AI" : "Local OCR"}
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-text-secondary">
                      {backend === "gemini"
                        ? "More accurate for messy handwriting. Requires an API key."
                        : "Runs in-browser with no key. Best for clean printed letters."}
                    </span>
                    {selected ? (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-text">
                        <Check size={13} strokeWidth={2.6} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-border-subtle pt-5">
              <div className="mb-2 flex items-center gap-2">
                <KeyRound size={14} className="text-text-muted" />
                <label
                  htmlFor="gemini-api-key"
                  className="text-xs font-semibold text-text-body"
                >
                  Gemini API key
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  id="gemini-api-key"
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
                  className="dashboard-field min-w-0 flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-border-subtle bg-surface-sunken text-text-muted transition-colors hover:text-text-body"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff size={15} strokeWidth={1.8} />
                  ) : (
                    <Eye size={15} strokeWidth={1.8} />
                  )}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                {keyDraft.trim() ? (
                  <span className="text-status-success">✓ Key saved</span>
                ) : (
                  <span>Required only when Gemini AI is selected.</span>
                )}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-text-body"
                >
                  Get a free API key
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="shortcuts-heading"
          className="settings-section dashboard-enter"
        >
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-subtle text-accent">
              <KeyRound size={18} />
            </span>
            <h2
              id="shortcuts-heading"
              className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-text-heading"
            >
              Shortcuts
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              Review and reassign canvas keyboard shortcuts.
            </p>
          </div>

          <KeyboardShortcutSettings shortcuts={shortcuts} />
        </section>

        <section
          aria-labelledby="profile-heading"
          className="settings-section dashboard-enter"
        >
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent-subtle text-accent">
              <UserRound size={18} />
            </span>
            <h2
              id="profile-heading"
              className="font-display mt-3 text-xl font-semibold tracking-[-0.03em] text-text-heading"
            >
              Profile
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              The identity attached to your saved pages and folders.
            </p>
          </div>

          <div className="dashboard-settings-panel">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent text-sm font-bold text-accent-text">
                A
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold tracking-[-0.025em] text-text-heading">
                  Ankit Tripathi
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">Pro plan</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-border-subtle pt-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Display name
                </p>
                <p className="mt-1.5 text-sm font-medium text-text-heading">
                  Ankit Tripathi
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Workspace plan
                </p>
                <p className="mt-1.5 text-sm font-medium text-text-heading">
                  Pro
                </p>
              </div>
            </div>

            <p className="mt-5 rounded-[12px] bg-surface-paper px-3.5 py-3 text-[11px] leading-5 text-text-secondary">
              Profile editing will appear here when account details are exposed
              by the authentication service.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
