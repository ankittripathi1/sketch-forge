import { describe, expect, test } from "bun:test";
import { getBackgroundStyle } from "./backgroundStyle";

describe("getBackgroundStyle", () => {
  test("returns only the background color for plain canvases", () => {
    expect(
      getBackgroundStyle(
        "plain",
        1,
        { x: 0, y: 0 },
        "#ffffff",
        "#dddddd",
        "#cccccc",
      ),
    ).toEqual({ backgroundColor: "#ffffff" });
  });

  test("scales and offsets grid backgrounds with the viewport", () => {
    const style = getBackgroundStyle(
      "grid",
      2,
      { x: 45, y: -5 },
      "#ffffff",
      "#dddddd",
      "#cccccc",
    );

    expect(style.backgroundSize).toBe("20px 20px");
    expect(style.backgroundPosition).toBe("5px -5px");
    expect(style.backgroundImage).toContain("linear-gradient(#dddddd 1px");
  });

  test("uses a larger spacing interval for dot backgrounds", () => {
    const style = getBackgroundStyle(
      "dots",
      1.5,
      { x: 20, y: 35 },
      "#111111",
      "#333333",
      "#777777",
    );

    expect(style.backgroundColor).toBe("#111111");
    expect(style.backgroundSize).toBe("30px 30px");
    expect(style.backgroundPosition).toBe("5px 5px");
    expect(style.backgroundImage).toBe(
      "radial-gradient(circle, #777777 1.5px, transparent 1.5px)",
    );
  });
});
