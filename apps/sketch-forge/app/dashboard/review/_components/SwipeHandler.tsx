"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export type SwipeDirection = "LEFT" | "RIGHT" | "UP" | "NONE";

interface SwipeHandlerProps {
  children: React.ReactNode;
  onSwipe: (direction: SwipeDirection) => void;
  threshold?: number;
  velocityThreshold?: number;
  disabled?: boolean;
}

export function SwipeHandler({
  children,
  onSwipe,
  threshold = 80,
  velocityThreshold = 0.3,
  disabled = false,
}: SwipeHandlerProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<SwipeDirection>("NONE");
  const startPos = useRef({ x: 0, y: 0 });
  const startTime = useRef(0);

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled || exitDirection !== "NONE") return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
    startTime.current = Date.now();
  };

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - startPos.current.x;
      const dy = clientY - startPos.current.y;
      setOffset({ x: dx, y: dy });
    },
    [isDragging],
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const dx = offset.x;
    const dy = offset.y;
    const dt = Date.now() - startTime.current;
    const velocityX = Math.abs(dx) / dt;
    const velocityY = Math.abs(dy) / dt;

    let direction: SwipeDirection = "NONE";

    if (Math.abs(dx) > threshold || velocityX > velocityThreshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? "RIGHT" : "LEFT";
      }
    }

    if (
      direction === "NONE" &&
      (dy < -threshold || velocityY > velocityThreshold)
    ) {
      if (dy < 0 && Math.abs(dy) > Math.abs(dx)) {
        direction = "UP";
      }
    }

    if (direction !== "NONE") {
      setExitDirection(direction);
      onSwipe(direction);
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, [isDragging, offset, onSwipe, threshold, velocityThreshold]);

  useEffect(() => {
    // Reset exit direction when child changes (new card)
    setExitDirection("NONE");
    setOffset({ x: 0, y: 0 });
  }, [children]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleMove(e.touches[0]!.clientX, e.touches[0]!.clientY);
        if (e.cancelable) e.preventDefault();
      }
    };
    const onTouchEnd = () => handleEnd();
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    if (isDragging) {
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  const rotation = offset.x * 0.1;
  const opacity = Math.max(
    0.3,
    1 - (Math.abs(offset.x) + Math.abs(offset.y)) / 800,
  );

  const getExitTransform = () => {
    switch (exitDirection) {
      case "RIGHT":
        return "translate3d(150%, 0, 0) rotate(20deg)";
      case "LEFT":
        return "translate3d(-150%, 0, 0) rotate(-20deg)";
      case "UP":
        return "translate3d(0, -150%, 0) rotate(0deg)";
      default:
        return `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${rotation}deg)`;
    }
  };

  return (
    <div
      className="relative touch-none cursor-grab active:cursor-grabbing"
      style={{
        transform: getExitTransform(),
        opacity: isDragging || exitDirection !== "NONE" ? opacity : 1,
        transition: isDragging
          ? "none"
          : "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.6s",
        zIndex: exitDirection !== "NONE" ? 50 : 10,
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) =>
        handleStart(e.touches[0]!.clientX, e.touches[0]!.clientY)
      }
    >
      {children}
    </div>
  );
}
