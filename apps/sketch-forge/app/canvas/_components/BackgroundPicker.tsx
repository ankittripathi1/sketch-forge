"use client";

type Background = "plain" | "dots" | "grid";

interface BackgroundPickerProps {
  background: Background;
  onChange: (bg: Background) => void;
}

const OPTIONS: { value: Background; label: string; icon: string }[] = [
  { value: "plain", label: "Plain", icon: "□" },
  { value: "dots", label: "Dot grid", icon: "⁚" },
  { value: "grid", label: "Box grid", icon: "⊞" },
];

export function BackgroundPicker({
  background,
  onChange,
}: BackgroundPickerProps) {
  return (
    <div className="absolute bottom-5 left-5 z-10 flex items-center gap-1 rounded-xl p-1 bg-[oklch(0.18_0.012_260)] shadow-[0_4px_16px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.07)]">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={[
            "flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-all druation-150",
            background === opt.value
              ? "bg-[oklch(0.82_0.14_88)] text-[oklch(0.15_0.01_88)]"
              : "text-[oklch(0.65_0.01_260)] hover:bg-[oklch(0.26_0.01_260)] hover:text-[oklch(0.88_0.005_260)]",
          ].join(" ")}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
