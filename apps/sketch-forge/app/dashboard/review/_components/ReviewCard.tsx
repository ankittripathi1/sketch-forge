"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { FileText, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Page {
  id: string;
  title: string;
  thumbnail: string | null;
  status: "new" | "learning" | "mastered";
  folderName?: string;
}

interface ReviewCardProps {
  page: Page;
  isFlipped: boolean;
  onFlip: () => void;
}

const STATUS_COLORS = {
  mastered: "bg-status-success",
  learning: "bg-status-warning",
  new: "bg-text-dim",
};

export function ReviewCard({ page, isFlipped, onFlip }: ReviewCardProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState(0);
  const [touchStartCenter, setTouchStartCenter] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0]!.clientX - e.touches[1]!.clientX,
        e.touches[0]!.clientY - e.touches[1]!.clientY,
      );
      setTouchStartDist(dist);
      setTouchStartCenter({
        x: (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2,
        y: (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2,
      });
    } else if (e.touches.length === 1 && zoom > 1) {
      setTouchStartCenter({
        x: e.touches[0]!.clientX - offset.x,
        y: e.touches[0]!.clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist > 0) {
      const dist = Math.hypot(
        e.touches[0]!.clientX - e.touches[1]!.clientX,
        e.touches[0]!.clientY - e.touches[1]!.clientY,
      );
      const delta = dist / touchStartDist;
      const newZoom = Math.min(Math.max(1, zoom * delta), 4);
      setZoom(newZoom);
      setTouchStartDist(dist);

      if (newZoom === 1) setOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && zoom > 1) {
      setOffset({
        x: e.touches[0]!.clientX - touchStartCenter.x,
        y: e.touches[0]!.clientY - touchStartCenter.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDist(0);
  };

  useEffect(() => {
    if (!isFlipped) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isFlipped]);

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-2xl h-[70vh] md:h-[600px] perspective-2000 group select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front Side: Title */}
        <div
          className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 bg-surface-hover rounded-3xl border-2 border-surface-hover shadow-2xl cursor-pointer"
          onClick={onFlip}
        >
          <div className="absolute top-8 left-8 flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${STATUS_COLORS[page.status]}`}
            />
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
              {page.status}
            </span>
          </div>

          <div className="w-24 h-24 rounded-3xl bg-surface-base flex items-center justify-center mb-8 border border-border-faint">
            <FileText size={48} className="text-accent" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-text-primary text-center leading-tight px-4">
            {page.title}
          </h2>

          <div className="mt-12 flex flex-col items-center gap-2">
            <span className="text-sm text-text-muted font-medium">
              Tap to flip
            </span>
            <div className="w-8 h-1 bg-surface-hover rounded-full" />
          </div>

          {page.folderName && (
            <div className="absolute bottom-8 text-xs font-bold text-text-dim uppercase tracking-widest">
              {page.folderName}
            </div>
          )}
        </div>

        {/* Back Side: Content (Thumbnail) */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-surface-base rounded-3xl border-2 border-surface-hover shadow-2xl overflow-hidden flex flex-col">
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
            <div
              className="relative w-full h-full transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) translate3d(${offset.x / zoom}px, ${offset.y / zoom}px, 0)`,
                cursor: zoom > 1 ? "grab" : "default",
              }}
            >
              {page.thumbnail ? (
                <Image
                  src={page.thumbnail}
                  alt={page.title}
                  fill
                  className="object-contain"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <FileText size={48} className="text-text-dim" />
                  <span className="text-sm text-text-dim">
                    No content available
                  </span>
                </div>
              )}
            </div>

            {/* Overlay Controls */}
            <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
              <div className="px-3 py-1.5 rounded-full bg-surface-base/40 backdrop-blur-md border border-border-faint text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                Back side
              </div>
            </div>

            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom((z) => Math.min(z + 0.5, 4));
                }}
                className="p-3 rounded-2xl bg-surface-base/40 backdrop-blur-md text-text-primary border border-border-faint hover:bg-surface-base/60 transition-colors"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoom((z) => Math.max(z - 0.5, 1));
                  if (zoom <= 1.5) setOffset({ x: 0, y: 0 });
                }}
                className="p-3 rounded-2xl bg-surface-base/40 backdrop-blur-md text-text-primary border border-border-faint hover:bg-surface-base/60 transition-colors"
              >
                <ZoomOut size={20} />
              </button>
              {zoom > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  className="p-3 rounded-2xl bg-surface-base/40 backdrop-blur-md text-accent border border-accent-subtle hover:bg-surface-base/60 transition-colors"
                >
                  <Maximize2 size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="h-16 px-8 border-t border-border-faint bg-surface-overlay flex items-center justify-between">
            <span className="text-sm font-bold text-text-primary truncate max-w-[60%]">
              {page.title}
            </span>
            <button
              onClick={onFlip}
              className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-white transition-colors"
            >
              Flip Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
