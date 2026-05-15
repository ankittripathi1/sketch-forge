"use client";

import { useState, useMemo } from "react";

interface HeatmapItem {
  date: string;
  count: number;
}

interface ReviewHeatmapProps {
  data: HeatmapItem[];
}

export function ReviewHeatmap({ data }: ReviewHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<HeatmapItem | null>(null);

  const days = useMemo(() => {
    const items: (HeatmapItem & { isFuture: boolean })[] = [];
    const now = new Date();
    // Start from 90 days ago, aligned to the start of the week (Sunday)
    const startDate = new Date();
    startDate.setDate(now.getDate() - 90);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 91 + startDate.getDay(); i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0]!;
      const match = data.find((d) => d.date === dateStr);

      items.push({
        date: dateStr,
        count: match ? Number(match.count) : 0,
        isFuture: date > now,
      });
    }
    return items;
  }, [data]);
  const getColorClass = (count: number) => {
    if (count === 0) return "bg-surface-hover";
    if (count < 3) return "bg-accent/30";
    if (count < 6) return "bg-accent/50";
    if (count < 10) return "bg-accent/70";
    return "bg-accent";
  };

  return (
    <div className="bg-surface-overlay/50 p-4 rounded-xl border border-border-default w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-heading tracking-tight">
          Review Activity
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-dim">
            Less
          </span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-surface-hover" />
            <div className="w-2.5 h-2.5 rounded-sm bg-accent/30" />
            <div className="w-2.5 h-2.5 rounded-sm bg-accent/50" />
            <div className="w-2.5 h-2.5 rounded-sm bg-accent/70" />
            <div className="w-2.5 h-2.5 rounded-sm bg-accent" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-dim">
            More
          </span>
        </div>
      </div>

      <div className="relative group">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {days.map((day) => (
            <div
              key={day.date}
              onMouseEnter={() => !day.isFuture && setHoveredDate(day)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${
                day.isFuture ? "opacity-0" : getColorClass(day.count)
              } ${!day.isFuture && "hover:scale-125 hover:z-10 shadow-lg shadow-black/20"}`}
            />
          ))}
        </div>

        {/* Tooltip */}
        {hoveredDate && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-surface-raised border border-[oklch(1_0_0/0.1)] px-3 py-2 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200 pointer-events-none">
            <div className="text-[10px] font-bold text-text-heading mb-0.5">
              {hoveredDate.count} reviews
            </div>
            <div className="text-[9px] font-medium text-text-muted">
              {new Date(hoveredDate.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4 text-[9px] font-bold uppercase tracking-widest text-text-dim">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
