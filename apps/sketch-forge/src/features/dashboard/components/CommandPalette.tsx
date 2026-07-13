"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Search, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchPages } from "@/api/hooks";

gsap.registerPlugin(useGSAP);

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
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
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const navigateToPage = (id: string) => {
    router.push(`/canvas?pageId=${id}&type=page`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      navigateToPage(results[selectedIndex]!.id);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="dashboard-command-root">
      <div className="command-overlay" onClick={onClose} />

      <div className="command-panel">
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
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search notebooks and pages"
            className="flex-1 bg-transparent text-sm text-text-heading outline-none placeholder:text-text-muted"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
              }}
              className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-body"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="max-h-72 overflow-y-auto">
            {results.length > 0 ? (
              <div className="space-y-1 p-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => navigateToPage(result.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`dashboard-command-result ${
                      index === selectedIndex
                        ? "bg-accent-subtle"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-raised">
                      <FileText size={13} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-semibold text-text-heading">
                        {result.title}
                      </p>
                      {result.snippet && (
                        <p
                          className="mt-0.5 truncate text-[10px] text-text-muted"
                          dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                      )}
                    </div>
                    {index === selectedIndex && (
                      <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-surface-base border border-border-default text-text-dim">
                        ↵
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            ) : !isFetching ? (
              <div className="py-10 text-center text-sm text-text-muted">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : null}
          </div>
        )}

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
