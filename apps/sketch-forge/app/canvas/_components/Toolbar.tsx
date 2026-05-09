"use client";

import { Tool } from "../_types";

const tools: { label: string; value: Tool }[] = [
  { label: "Reactangle", value: "rectangle" },
  { label: "Ellipse", value: "ellipse" },
  { label: "Line", value: "line" },
  { label: "Freehand", value: "freehand" },
];
export function Toolbar({
  tool,
  onToolChange,
}: {
  tool: Tool;
  onToolChange: (t: Tool) => void;
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-white border border-gray-200 rounded-xl shadow-md p-2">
      {tools.map((t) => (
        <button
          key={t.value}
          onClick={() => onToolChange(t.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${
              tool === t.value
                ? "bg-blue-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
