import { describe, expect, test } from "bun:test";
import { SketchForgeClipboardSchema } from "./canvas.js";
import { CreateFolderSchema } from "./folder.js";
import { reviewPageSchema } from "./notebook.js";
import { CreatePageSchema, UpdatePageSchema } from "./page.js";

const validElement = {
  id: "element",
  tool: "rectangle",
  x1: 0,
  y1: 0,
  x2: 100,
  y2: 50,
  seed: 1,
  strokeColor: "#000000",
  fillColor: "none",
  fillStyle: "none",
  strokeWidth: 2,
};

describe("page schemas", () => {
  test("accepts a complete page payload", () => {
    const result = CreatePageSchema.safeParse({
      folderId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Architecture notes",
      elements: [validElement],
      note: "# Decisions",
      viewMode: "doc",
      status: "learning",
      pageOrder: 2,
      tags: ["system-design"],
    });

    expect(result.success).toBe(true);
  });

  test("rejects empty titles, invalid ids, and unknown statuses", () => {
    expect(CreatePageSchema.safeParse({ title: "" }).success).toBe(false);
    expect(CreatePageSchema.safeParse({ folderId: "folder" }).success).toBe(
      false,
    );
    expect(CreatePageSchema.safeParse({ status: "archived" }).success).toBe(
      false,
    );
  });

  test("enforces the note size limit", () => {
    expect(
      CreatePageSchema.safeParse({ note: "x".repeat(200_001) }).success,
    ).toBe(false);
  });

  test("coerces review timestamps in update payloads", () => {
    const result = UpdatePageSchema.safeParse({
      lastReviewedAt: "2026-08-03T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.lastReviewedAt).toBeInstanceOf(Date);
  });
});

describe("related persistence schemas", () => {
  test("validates folder colors and review quality", () => {
    expect(
      CreateFolderSchema.safeParse({ name: "Inbox", color: "#a1B2c3" }).success,
    ).toBe(true);
    expect(
      CreateFolderSchema.safeParse({ name: "Inbox", color: "red" }).success,
    ).toBe(false);
    expect(reviewPageSchema.safeParse({ quality: 5 }).success).toBe(true);
    expect(reviewPageSchema.safeParse({ quality: 6 }).success).toBe(false);
    expect(reviewPageSchema.safeParse({ quality: 3.5 }).success).toBe(false);
  });

  test("accepts only versioned Sketch Forge clipboard payloads", () => {
    expect(
      SketchForgeClipboardSchema.safeParse({
        type: "sketch-forge/elements",
        version: 1,
        elements: [validElement],
      }).success,
    ).toBe(true);
    expect(
      SketchForgeClipboardSchema.safeParse({
        type: "sketch-forge/elements",
        version: 2,
        elements: [validElement],
      }).success,
    ).toBe(false);
  });
});
