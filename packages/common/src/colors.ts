/**
 * Returns true if the given hex color is perceptually dark (ITU-R BT.601).
 *
 * @param hex - 6-digit hex string, with or without a leading '#'.
 */
export function isColorDark(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** Default stroke color applied when switching to a light-background theme. */
export const DEFAULT_LIGHT_STROKE = "#1a1a2e";

/** Default stroke color applied when switching to a dark-background theme. */
export const DEFAULT_DARK_STROKE = "#e8e6d8";
