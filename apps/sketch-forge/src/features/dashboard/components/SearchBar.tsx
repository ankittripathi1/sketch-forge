"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  onClick: () => void;
}

export function SearchBar({ onClick }: SearchBarProps) {
  return (
    <button onClick={onClick} className="dashboard-search-trigger">
      <Search size={14} strokeWidth={1.7} className="shrink-0" />
      <span className="truncate">Search your library</span>
      <kbd className="dashboard-key ml-auto shrink-0">⌘K</kbd>
    </button>
  );
}
