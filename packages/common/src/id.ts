/**
 * Generate a UUID.
 *
 * `crypto.randomUUID` only exists in a "secure context" (HTTPS or localhost),
 * so it is undefined when the app is served over plain http:// on a raw IP.
 * Fall back to a getRandomValues-based UUID v4 (available in insecure contexts)
 * and finally to a Math.random id if Web Crypto is missing entirely.
 */
export function randomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") +
      "-" +
      hex.slice(4, 6).join("") +
      "-" +
      hex.slice(6, 8).join("") +
      "-" +
      hex.slice(8, 10).join("") +
      "-" +
      hex.slice(10, 16).join("")
    );
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
