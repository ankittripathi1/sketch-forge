"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

interface BreadcrumbsProps {
  currentFolderId: string;
  allFolders: Folder[];
}

export function Breadcrumbs({ currentFolderId, allFolders }: BreadcrumbsProps) {
  const [crumbs, setCrumbs] = useState<Folder[]>([]);

  const buildCrumbs = useCallback(() => {
    const trail: Folder[] = [];
    let current = allFolders.find((f) => f.id === currentFolderId);

    while (current) {
      trail.unshift(current);
      const parentId = current.parentId;
      current = allFolders.find((f) => f.id === parentId);
    }

    setCrumbs(trail);
  }, [currentFolderId, allFolders]);

  useEffect(() => {
    buildCrumbs();
  }, [buildCrumbs]);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs font-medium"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-text-muted transition-colors hover:text-accent"
      >
        <Home size={14} />
        <span>Home</span>
      </Link>

      {crumbs.length > 0 && (
        <ChevronRight size={14} className="text-text-dim" />
      )}

      {crumbs.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-1">
          <Link
            href={`/dashboard/folder/${folder.id}`}
            className={`transition-colors ${
              index === crumbs.length - 1
                ? "text-text-heading pointer-events-none"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            {folder.name}
          </Link>
          {index < crumbs.length - 1 && (
            <ChevronRight size={14} className="text-text-dim" />
          )}
        </div>
      ))}
    </nav>
  );
}
