"use client";

import { Flame, Brain, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StatsOverviewProps {
  stats: {
    byStatus: {
      new: number;
      learning: number;
      mastered: number;
    };
    dueCount: number;
    streak: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Mastery Stats */}
      <div className="lg:col-span-2 grid grid-cols-3 gap-2 bg-surface-overlay/50 p-3 rounded-xl border border-border-default">
        <div className="flex flex-col items-center justify-center py-3 rounded-lg bg-surface-raised border border-border-subtle">
          <div className="text-3xl font-semibold tabular-nums text-text-heading mb-0.5">
            {stats.byStatus.new}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">
            New
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-3 rounded-lg bg-accent-subtle border border-border-accent">
          <div className="text-3xl font-semibold tabular-nums text-accent mb-0.5">
            {stats.byStatus.learning}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-accent/70">
            Learning
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-3 rounded-lg bg-status-success-subtle border border-border-faint">
          <div className="text-3xl font-semibold tabular-nums text-status-success mb-0.5">
            {stats.byStatus.mastered}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-status-success/70">
            Mastered
          </div>
        </div>
      </div>

      {/* Due for Review */}
      <div className="bg-surface-overlay/50 p-3 rounded-xl border border-border-default flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center text-accent">
            <Brain size={18} />
          </div>
          <div>
            <div className="text-3xl font-semibold tabular-nums text-text-heading leading-none mb-0.5">
              {stats.dueCount}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">
              Due Now
            </div>
          </div>
        </div>
        {stats.dueCount > 0 && (
          <Link
            href="/dashboard/review"
            className="p-1.5 rounded-lg bg-accent text-accent-text hover:scale-105 transition-transform"
          >
            <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {/* Streak */}
      <div className="bg-surface-overlay/50 p-3 rounded-xl border border-border-default flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-status-warning-subtle flex items-center justify-center text-status-warning">
          <Flame size={18} />
        </div>
        <div>
          <div className="text-3xl font-semibold tabular-nums text-text-heading leading-none mb-0.5">
            {stats.streak} Days
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">
            Streak
          </div>
        </div>
      </div>
    </div>
  );
}
