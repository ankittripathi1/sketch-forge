import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DARK_STROKE,
  DEFAULT_LIGHT_STROKE,
  isColorDark,
} from "./colors";

describe("isColorDark", () => {
  test("classifies dark and light colors", () => {
    expect(isColorDark("#000000")).toBe(true);
    expect(isColorDark("ffffff")).toBe(false);
  });

  test("uses luminance rather than individual channels", () => {
    expect(isColorDark("#00ff00")).toBe(false);
    expect(isColorDark("#0000ff")).toBe(true);
  });

  test("rejects unsupported color formats", () => {
    expect(isColorDark("#fff")).toBe(false);
    expect(isColorDark("not-a-color")).toBe(false);
  });

  test("keeps the theme defaults on opposite sides of the threshold", () => {
    expect(isColorDark(DEFAULT_LIGHT_STROKE)).toBe(true);
    expect(isColorDark(DEFAULT_DARK_STROKE)).toBe(false);
  });
});
