"use client";

import { useState, useEffect } from "react";
import { ReviewStack } from "./_components/ReviewStack";
import { Loader2, BrainCircuit, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function GlobalReviewPage() {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    async function fetchDuePages() {
      try {
        const response = await fetch("http://localhost:4001/pages/review", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setPages(data);
        }
      } catch (error) {
        console.error("Failed to fetch due pages:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDuePages();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-base">
        <Loader2
          className="animate-spin text-accent"
          size={48}
        />
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-subtle/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-surface-overlay/50 blur-[120px] rounded-full" />

        <div className="max-w-md w-full text-center relative z-10">
          <div className="mb-10 inline-flex p-6 rounded-3xl bg-accent-subtle text-accent border border-border-accent shadow-elev-2">
            <BrainCircuit size={80} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-semibold text-text-primary mb-6 tracking-tight">
            Revision
          </h1>
          <p className="text-text-secondary text-xl mb-12 leading-relaxed px-4">
            {pages.length > 0
              ? `You have ${pages.length} pages ready for review. Daily practice is the key to mastery.`
              : "Your mind is sharp! No pages due for review right now."}
          </p>

          {pages.length > 0 ? (
            <button
              onClick={() => setIsStarted(true)}
              className="w-full bg-accent text-accent-text py-6 rounded-3xl font-black text-xl active:scale-[0.98] transition-transform shadow-elev-2"
            >
              Begin Session
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="w-full inline-block bg-surface-raised text-text-primary py-6 rounded-3xl font-bold text-xl hover:bg-surface-overlay transition-all"
            >
              Back to Dashboard
            </Link>
          )}

          <Link
            href="/dashboard"
            className="mt-10 inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm font-bold uppercase tracking-widest"
          >
            <ChevronLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl bg-surface-raised text-text-secondary hover:text-text-primary transition-all"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
            Session
          </span>
          <span className="text-xs font-bold text-text-primary">Daily Review</span>
        </div>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      <ReviewStack pages={pages} />
    </div>
  );
}
