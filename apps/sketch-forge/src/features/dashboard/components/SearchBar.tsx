"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  onClick: () => void;
}

export function SearchBar({ onClick }: SearchBarProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 w-full min-w-0 items-center gap-2 rounded-[11px] border border-border-subtle bg-surface-base/70 px-3 text-xs text-text-muted transition-all hover:border-border-default hover:bg-surface-raised hover:text-text-body"
    >
      <Search size={13} className="shrink-0" />
      <span className="truncate">Search your library</span>
      <kbd className="ml-auto shrink-0 rounded-md border border-border-default bg-surface-raised px-1.5 py-0.5 text-[9px] text-text-dim">
        ⌘K
      </kbd>
    </button>
  );
}
