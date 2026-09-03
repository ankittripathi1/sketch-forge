"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Search, FileText, Frame, CornerDownLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchPages } from "@/api/hooks";
import { SearchSnippet } from "./SearchSnippet";

gsap.registerPlugin(useGSAP);

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaletteItem =
  | {
      kind: "action";
      id: string;
      label: string;
      sub: string;
      keywords: string;
      icon: typeof FileText;
      run: () => void;
    }
  | {
      kind: "page";
      id: string;
      label: string;
      snippet?: string;
      noteMatch?: boolean;
      run: () => void;
    };

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: results = [], isFetching } = useSearchPages(debouncedQuery);

  useGSAP(
    () => {
      if (!isOpen || !modalRef.current) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".command-overlay", { autoAlpha: 0, duration: 0.22 })
          .from(
            ".command-panel",
            { autoAlpha: 0, y: -18, scale: 0.97, duration: 0.38 },
            "<0.04",
          );
      });
      return () => media.revert();
    },
    { scope: modalRef, dependencies: [isOpen], revertOnUpdate: true },
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  // Static actions — always available; filtered by the query when one is typed.
  const actions = useMemo<PaletteItem[]>(
    () => [
      {
        kind: "action",
        id: "new-note",
        label: "New note",
        sub: "Open a blank document",
        keywords: "new note document doc write create",
        icon: FileText,
        run: () => go("/canvas?mode=doc"),
      },
      {
        kind: "action",
        id: "new-canvas",
        label: "New canvas",
        sub: "Open a blank drawing canvas",
        keywords: "new canvas draw sketch diagram create",
        icon: Frame,
        run: () => go("/canvas?mode=canvas"),
      },
    ],
    // router/onClose are stable enough for this session; go closes over them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const q = query.trim().toLowerCase();
  const filteredActions = q
    ? actions.filter(
        (a) =>
          a.kind === "action" &&
          (a.label.toLowerCase().includes(q) || a.keywords.includes(q)),
      )
    : actions;

  const pageItems = useMemo<PaletteItem[]>(
    () =>
      results.map((r) => ({
        kind: "page" as const,
        id: r.id,
        label: r.title,
        snippet: r.snippet,
        noteMatch: r.noteMatch,
        run: () =>
          go(
            `/canvas?pageId=${r.id}&type=page${r.noteMatch ? "&notes=1" : ""}`,
          ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results],
  );

  const items = useMemo<PaletteItem[]>(
    () => [...filteredActions, ...pageItems],
    [filteredActions, pageItems],
  );

  // Keep the selection in range as the item list changes under the query.
  useEffect(() => {
    setSelectedIndex((i) =>
      Math.min(Math.max(i, 0), Math.max(items.length - 1, 0)),
    );
  }, [items.length]);

  // Scroll the active row into view during keyboard navigation.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[selectedIndex]?.run();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  const actionCount = filteredActions.length;
  const showPagesSection = q.length >= 2;

  return (
    <div ref={modalRef} className="dashboard-command-root">
      <div className="command-overlay" onClick={onClose} />

      <div className="command-panel" role="dialog" aria-label="Command palette">
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <Search
            size={15}
            strokeWidth={1.7}
            className={`shrink-0 ${isFetching ? "animate-pulse text-accent" : "text-text-muted"}`}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, or start something new…"
            className="flex-1 bg-transparent text-sm text-text-heading outline-none placeholder:text-text-muted"
            aria-label="Command palette search"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
              }}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-body"
              aria-label="Clear"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {actionCount > 0 && (
            <div className="mb-1">
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">
                Create
              </p>
              {filteredActions.map((item, index) => (
                <PaletteRow
                  key={item.id}
                  index={index}
                  active={index === selectedIndex}
                  onSelect={() => setSelectedIndex(index)}
                  onRun={item.run}
                >
                  <RowIcon
                    icon={
                      (item as Extract<PaletteItem, { kind: "action" }>).icon
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-text-heading">
                      {item.label}
                    </p>
                    <p className="truncate text-[10px] text-text-muted">
                      {(item as Extract<PaletteItem, { kind: "action" }>).sub}
                    </p>
                  </div>
                  {index === selectedIndex && <EnterHint />}
                </PaletteRow>
              ))}
            </div>
          )}

          {showPagesSection && (
            <div>
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">
                Jump to
              </p>
              {pageItems.length > 0 ? (
                pageItems.map((item, i) => {
                  const index = actionCount + i;
                  const page = item as Extract<PaletteItem, { kind: "page" }>;
                  return (
                    <PaletteRow
                      key={item.id}
                      index={index}
                      active={index === selectedIndex}
                      onSelect={() => setSelectedIndex(index)}
                      onRun={item.run}
                    >
                      <RowIcon icon={FileText} tone="page" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-text-heading">
                          <span className="truncate">{page.label}</span>
                          {page.noteMatch && (
                            <span className="shrink-0 rounded bg-surface-raised px-1 py-px text-[9px] font-medium text-text-muted">
                              in notes
                            </span>
                          )}
                        </p>
                        {page.snippet && (
                          <SearchSnippet snippet={page.snippet} />
                        )}
                      </div>
                      {index === selectedIndex && <EnterHint />}
                    </PaletteRow>
                  );
                })
              ) : !isFetching ? (
                <p className="px-2 py-6 text-center text-xs text-text-muted">
                  No pages match &ldquo;{query}&rdquo;
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border-subtle px-5 py-2.5 text-[10px] text-text-dim">
          <span className="flex items-center gap-1.5">
            <kbd className="dashboard-key">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="dashboard-key">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="dashboard-key">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}

function PaletteRow({
  index,
  active,
  onSelect,
  onRun,
  children,
}: {
  index: number;
  active: boolean;
  onSelect: () => void;
  onRun: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-index={index}
      onClick={onRun}
      onMouseEnter={onSelect}
      className={`dashboard-command-result ${
        active ? "bg-accent-subtle" : "hover:bg-surface-hover"
      }`}
    >
      {children}
    </button>
  );
}

function RowIcon({
  icon: Icon,
  tone = "action",
}: {
  icon: typeof FileText;
  tone?: "action" | "page";
}) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
        tone === "action"
          ? "bg-accent-subtle text-accent"
          : "bg-surface-raised text-accent"
      }`}
    >
      <Icon size={13} strokeWidth={1.9} />
    </div>
  );
}

function EnterHint() {
  return (
    <kbd className="flex items-center gap-1 rounded bg-surface-base px-1.5 py-0.5 text-[9px] text-text-dim ring-1 ring-border-default">
      <CornerDownLeft size={9} />
    </kbd>
  );
}
