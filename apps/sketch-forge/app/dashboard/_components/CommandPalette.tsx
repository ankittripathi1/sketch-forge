"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string | null;
  folderId: string | null;
  snippet: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:4001/pages/search?q=${encodeURIComponent(searchQuery)}`,
        { credentials: "include" },
      );
      if (response.ok) setResults(await response.json());
    } catch {
      // Search is best-effort; keep the palette usable if the API is offline.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
      else setResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg mx-4 bg-surface-overlay border border-border-default rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          {isLoading ? (
            <Loader2 size={15} className="text-accent shrink-0 animate-spin" />
          ) : (
            <Search size={15} className="text-text-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search notebooks and pages..."
            className="flex-1 bg-transparent text-sm text-text-heading outline-none placeholder:text-text-muted"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="text-text-muted hover:text-text-body transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="max-h-72 overflow-y-auto">
            {results.length > 0 ? (
              <div className="p-2 space-y-0.5">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => navigateToPage(result.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      index === selectedIndex
                        ? "bg-surface-hover"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    <div className="w-8 h-8 shrink-0 bg-surface-raised rounded-lg flex items-center justify-center border border-border-subtle">
                      <FileText size={13} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-heading truncate">
                        {result.title}
                      </p>
                      {result.snippet && (
                        <p
                          className="text-[10px] text-text-muted truncate mt-0.5"
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
            ) : !isLoading ? (
              <div className="py-10 text-center text-text-muted text-sm">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : null}
          </div>
        )}

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-border-subtle flex items-center gap-4 text-[10px] text-text-dim">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-surface-raised border border-border-default">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-surface-raised border border-border-default">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-surface-raised border border-border-default">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
