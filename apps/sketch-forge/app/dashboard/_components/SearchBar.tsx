"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  onClick: () => void;
}

export function SearchBar({ onClick }: SearchBarProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 min-w-0 items-center gap-2 rounded-lg bg-surface-base border border-border-subtle px-2.5 py-1.5 text-xs text-text-muted hover:text-text-body hover:border-border-default transition-all"
    >
      <Search size={12} className="shrink-0" />
      <span className="truncate">Search...</span>
      <kbd className="ml-auto shrink-0 text-[9px] px-1 py-0.5 rounded bg-surface-raised border border-border-default text-text-dim">
        ⌘K
      </kbd>
    </button>
  );
}
