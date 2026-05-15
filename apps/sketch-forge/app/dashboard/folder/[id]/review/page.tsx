"use client";

import { useState, useEffect, use } from "react";
import { ReviewStack } from "../../../review/_components/ReviewStack";
import { Loader2, BrainCircuit, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function FolderReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [pages, setPages] = useState([]);
  const [folder, setFolder] = useState<{ name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pagesRes, folderRes] = await Promise.all([
          fetch(`http://localhost:4001/pages/review?folderId=${id}`, {
            credentials: "include",
          }),
          fetch(`http://localhost:4001/folders/${id}`, {
            credentials: "include",
          }),
        ]);

        if (pagesRes.ok) setPages(await pagesRes.json());
        if (folderRes.ok) setFolder(await folderRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[oklch(0.08_0.01_260)]">
        <Loader2
          className="animate-spin text-[oklch(0.82_0.14_88)]"
          size={48}
        />
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-[oklch(0.08_0.01_260)] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8 inline-flex p-4 rounded-3xl bg-[oklch(0.82_0.14_88/0.1)] text-[oklch(0.82_0.14_88)]">
            <BrainCircuit size={64} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Revision Mode
          </h1>
          <h2 className="text-[oklch(0.82_0.14_88)] font-bold text-lg mb-6 uppercase tracking-wider">
            {folder?.name}
          </h2>
          <p className="text-[oklch(0.55_0.01_260)] text-lg mb-10 leading-relaxed">
            {pages.length > 0
              ? `You have ${pages.length} pages ready for review in this folder.`
              : "No pages due for review in this folder. Excellent work!"}
          </p>

          {pages.length > 0 ? (
            <button
              onClick={() => setIsStarted(true)}
              className="w-full bg-[oklch(0.82_0.14_88)] text-[oklch(0.12_0.01_88)] py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-[oklch(0.82_0.14_88/0.2)]"
            >
              Start Session
            </button>
          ) : (
            <Link
              href={`/dashboard/folder/${id}`}
              className="w-full inline-block bg-[oklch(0.18_0.01_260)] text-white py-5 rounded-2xl font-bold text-lg hover:bg-[oklch(0.22_0.01_260)] transition-all"
            >
              Back to Folder
            </Link>
          )}

          <Link
            href={`/dashboard/folder/${id}`}
            className="mt-8 inline-flex items-center gap-2 text-[oklch(0.45_0.01_260)] hover:text-white transition-colors text-sm font-medium"
          >
            <ChevronLeft size={16} />
            <span>Nevermind, go back</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.08_0.01_260)] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <Link
          href={`/dashboard/folder/${id}`}
          className="p-2 rounded-xl bg-[oklch(0.18_0.01_260)] text-[oklch(0.45_0.01_260)] hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.45_0.01_260)]">
            Session
          </span>
          <span className="text-xs font-bold text-white truncate max-w-[200px]">
            {folder?.name}
          </span>
        </div>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      <ReviewStack pages={pages} />
    </div>
  );
}
