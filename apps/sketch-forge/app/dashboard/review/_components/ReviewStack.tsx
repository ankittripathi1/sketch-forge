"use client";

import React, { useState, useCallback, useEffect } from "react";
import { SwipeHandler, SwipeDirection } from "./SwipeHandler";
import { ReviewCard } from "./ReviewCard";
import {
  CheckCircle,
  ArrowRight,
  RefreshCcw,
  Home,
  Trophy,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface Page {
  id: string;
  title: string;
  thumbnail: string | null;
  status: "new" | "learning" | "mastered";
  folderName?: string;
}

interface ReviewStackProps {
  pages: Page[];
  onComplete?: (results: {
    reviewed: number;
    mastered: number;
    learning: number;
  }) => void;
}

export function ReviewStack({ pages: initialPages }: ReviewStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({
    reviewed: 0,
    mastered: 0,
    learning: 0,
    forgotten: 0,
  });
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPage = initialPages[currentIndex];
  const nextPage = initialPages[currentIndex + 1];

  const handleReview = useCallback(
    async (quality: number) => {
      if (!currentPage || isProcessing) return;
      setIsProcessing(true);

      try {
        // Optimistic update for results could go here if we wanted it to be faster
        const response = await fetch(
          `http://localhost:4001/pages/${currentPage.id}/review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quality }),
            credentials: "include",
          },
        );

        if (!response.ok) throw new Error("Failed to submit review");

        // Update local results
        setResults((prev) => ({
          ...prev,
          reviewed: prev.reviewed + 1,
          mastered: prev.mastered + (quality >= 4 ? 1 : 0),
          learning: prev.learning + (quality === 3 ? 1 : 0),
          forgotten: prev.forgotten + (quality < 3 ? 1 : 0),
        }));

        // The SwipeHandler will handle the exit animation.
        // We just need to wait enough for it to finish before moving to the next card.
        setTimeout(() => {
          if (currentIndex < initialPages.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setIsFlipped(false);
          } else {
            setIsComplete(true);
          }
          setIsProcessing(false);
        }, 400); // Slightly longer to match SwipeHandler transition
      } catch (error) {
        console.error("Failed to submit review:", error);
        setIsProcessing(false);
        // Maybe show a toast here?
      }
    },
    [currentPage, currentIndex, initialPages.length, isProcessing],
  );

  const handleSwipe = (direction: SwipeDirection) => {
    if (!isFlipped) {
      setIsFlipped(true);
      return;
    }

    if (direction === "RIGHT") handleReview(4); // Good
    if (direction === "LEFT") handleReview(1); // Forgot
    if (direction === "UP") handleReview(5); // Easy
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete || isProcessing) return;

      if (e.key === " ") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        return;
      }

      // Only allow rating if flipped
      if (isFlipped) {
        if (e.key === "1") handleReview(1);
        if (e.key === "2") handleReview(3);
        if (e.key === "3") handleReview(4);
        if (e.key === "4") handleReview(5);
        if (e.key === "ArrowLeft") handleReview(1);
        if (e.key === "ArrowRight") handleReview(4);
        if (e.key === "ArrowUp") handleReview(5);
      } else {
        // On desktop, allow ArrowRight to flip
        if (e.key === "ArrowRight" || e.key === "Enter") {
          setIsFlipped(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isComplete, isFlipped, isProcessing, handleReview]);

  if (initialPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle
          size={64}
          className="text-accent mb-6 opacity-20"
        />
        <h2 className="text-2xl font-bold text-white mb-2">All caught up!</h2>
        <p className="text-text-muted mb-8">
          No pages due for review right now.
        </p>
        <Link
          href="/dashboard"
          className="px-8 py-4 bg-surface-hover rounded-2xl font-bold text-sm hover:bg-surface-hover transition-colors text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-md w-full mx-auto bg-surface-base rounded-3xl p-10 border border-border-faint shadow-elev-3 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-accent-subtle rounded-full flex items-center justify-center mb-8 border border-accent-subtle">
            <Trophy size={48} className="text-accent" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">Well Done!</h2>
          <p className="text-text-muted mb-10 text-lg">
            You&apos;ve completed your review session.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full mb-12">
            <div className="bg-surface-sunken p-5 rounded-3xl border border-[oklch(1_0_0/0.03)]">
              <div className="text-3xl font-bold text-white mb-1">
                {results.reviewed}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Total
              </div>
            </div>
            <div className="bg-status-success-subtle p-5 rounded-3xl border border-border-faint">
              <div className="text-3xl font-bold text-status-success mb-1">
                {results.mastered}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-status-success/60">
                Mastered
              </div>
            </div>
            <div className="bg-status-warning-subtle p-5 rounded-3xl border border-border-faint">
              <div className="text-3xl font-bold text-status-warning mb-1">
                {results.learning}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-status-warning/60">
                Learning
              </div>
            </div>
            <div className="bg-status-danger-subtle p-5 rounded-3xl border border-border-faint">
              <div className="text-3xl font-bold text-status-danger mb-1">
                {results.forgotten}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-status-danger/60">
                Forgot
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-3 bg-accent text-accent-text py-5 rounded-xl font-bold text-lg active:scale-[0.98] transition-transform shadow-elev-2"
            >
              <RefreshCcw size={20} /> Review Again
            </button>
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-3 bg-surface-hover text-text-primary py-5 rounded-xl font-bold text-lg hover:bg-surface-hover transition-all"
            >
              <Home size={20} /> Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progress = (currentIndex / initialPages.length) * 100;

  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl px-6 mb-12">
        <div className="flex justify-between items-end mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
              Progress
            </span>
            <span className="text-xs font-bold text-white">
              {currentIndex + 1} / {initialPages.length} pages
            </span>
          </div>
          <span className="text-xl font-black text-accent">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700 ease-out shadow-accent-glow"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative w-full flex justify-center items-center h-[75vh] md:h-[650px] mb-8">
        {nextPage && (
          <div className="absolute transform scale-90 translate-y-8 opacity-20 blur-[1px] pointer-events-none">
            <ReviewCard page={nextPage} isFlipped={false} onFlip={() => {}} />
          </div>
        )}

        {currentPage && (
          <SwipeHandler
            key={currentPage.id}
            onSwipe={handleSwipe}
            disabled={isProcessing}
          >
            <ReviewCard
              page={currentPage}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
            />
          </SwipeHandler>
        )}
      </div>

      {/* Controls Container */}
      <div className="w-full max-w-2xl px-6 flex flex-col items-center gap-8">
        {/* Mobile/Tablet Controls */}
        <div
          className={`w-full grid grid-cols-4 gap-3 md:gap-4 transition-all duration-500 ease-out ${isFlipped ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95 pointer-events-none"}`}
        >
          <button
            onClick={() => handleReview(1)}
            className="group flex flex-col items-center gap-3 p-5 rounded-3xl bg-status-danger-subtle border border-border-faint text-status-danger hover:bg-status-danger-subtle/70 transition-all active:scale-90"
          >
            <div className="p-3 rounded-2xl bg-status-danger-subtle group-hover:scale-110 transition-transform">
              <XCircle size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Forgot
            </span>
          </button>
          <button
            onClick={() => handleReview(3)}
            className="group flex flex-col items-center gap-3 p-5 rounded-3xl bg-status-warning-subtle border border-border-faint text-status-warning hover:bg-status-warning-subtle/70 transition-all active:scale-90"
          >
            <div className="p-3 rounded-2xl bg-status-warning-subtle group-hover:scale-110 transition-transform">
              <RefreshCcw size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Hard
            </span>
          </button>
          <button
            onClick={() => handleReview(4)}
            className="group flex flex-col items-center gap-3 p-5 rounded-3xl bg-status-success-subtle border border-border-faint text-status-success hover:bg-status-success-subtle/70 transition-all active:scale-90"
          >
            <div className="p-3 rounded-2xl bg-status-success-subtle group-hover:scale-110 transition-transform">
              <CheckCircle size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Good
            </span>
          </button>
          <button
            onClick={() => handleReview(5)}
            className="group flex flex-col items-center gap-3 p-5 rounded-3xl bg-status-info-subtle border border-border-faint text-status-info hover:bg-status-info-subtle/70 transition-all active:scale-90"
          >
            <div className="p-3 rounded-2xl bg-status-info-subtle group-hover:scale-110 transition-transform">
              <ArrowRight size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Easy
            </span>
          </button>
        </div>

        {!isFlipped && (
          <div className="flex flex-col items-center gap-3 animate-bounce mt-4">
            <span className="text-text-muted text-sm font-bold uppercase tracking-widest">
              Tap to reveal
            </span>
            <div className="w-1 h-8 bg-gradient-to-b from-accent to-transparent rounded-full" />
          </div>
        )}

        {/* Desktop Hints */}
        <div className="hidden lg:flex items-center gap-8 py-4 px-8 rounded-full bg-surface-overlay border border-border-faint text-text-dim text-[10px] font-bold uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2.5">
            <kbd className="bg-surface-hover text-white px-2 py-1 rounded-lg border-b-2 border-black/40 shadow-inner">
              SPACE
            </kbd>
            <span>Flip Card</span>
          </div>
          <div className="w-px h-4 bg-surface-hover" />
          <div className="flex items-center gap-2.5">
            <kbd className="bg-surface-hover text-white px-2 py-1 rounded-lg border-b-2 border-black/40 shadow-inner">
              1-4
            </kbd>
            <span>Rate Mastery</span>
          </div>
          <div className="w-px h-4 bg-surface-hover" />
          <div className="flex items-center gap-2.5">
            <kbd className="bg-surface-hover text-white px-2 py-1 rounded-lg border-b-2 border-black/40 shadow-inner">
              ← →
            </kbd>
            <span>Quick Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
