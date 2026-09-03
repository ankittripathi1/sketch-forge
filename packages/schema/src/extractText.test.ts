import { test, expect } from "bun:test";
import { extractSearchableText } from "./extractText.js";
import type { SketchElement } from "./canvas.js";

const textElement = {
  tool: "text",
  text: "Auth Service",
} as unknown as SketchElement;

const rectElement = {
  tool: "rectangle",
  text: "ignored",
} as unknown as SketchElement;

test("indexes only text elements when no note is given", () => {
  expect(extractSearchableText([textElement, rectElement])).toBe(
    "Auth Service",
  );
});

test("appends the note as plain text", () => {
  const note = "## Decisions\n\n- chose **JWT** over sessions\n- [ ] rate limits";
  expect(extractSearchableText([textElement], note)).toBe(
    "Auth Service Decisions chose JWT over sessions rate limits",
  );
});

test("keeps link text but drops URLs", () => {
  expect(extractSearchableText([], "see [the RFC](https://example.com)")).toBe(
    "see the RFC",
  );
});

test("handles empty inputs", () => {
  expect(extractSearchableText([], null)).toBe("");
  expect(extractSearchableText([], "")).toBe("");
});
