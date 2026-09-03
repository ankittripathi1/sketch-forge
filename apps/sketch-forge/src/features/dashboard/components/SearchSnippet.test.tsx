import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { parseSearchSnippet, SearchSnippet } from "./SearchSnippet";

describe("parseSearchSnippet", () => {
  test("preserves plain text", () => {
    expect(parseSearchSnippet("architecture notes")).toEqual([
      { text: "architecture notes", highlighted: false },
    ]);
  });

  test("parses one or more PostgreSQL highlight ranges", () => {
    expect(
      parseSearchSnippet(
        "An <mark>event</mark> crosses another <MARK>event</MARK>.",
      ),
    ).toEqual([
      { text: "An ", highlighted: false },
      { text: "event", highlighted: true },
      { text: " crosses another ", highlighted: false },
      { text: "event", highlighted: true },
      { text: ".", highlighted: false },
    ]);
  });

  test("keeps an unclosed highlight as highlighted text", () => {
    expect(parseSearchSnippet("before <mark>after")).toEqual([
      { text: "before ", highlighted: false },
      { text: "after", highlighted: true },
    ]);
  });
});

describe("SearchSnippet", () => {
  test("escapes user HTML while retaining generated mark elements", () => {
    const html = renderToStaticMarkup(
      <SearchSnippet
        snippet={
          '<img src=x onerror="steal()"><mark>match</mark><script>steal()</script>'
        }
      />,
    );

    expect(html).toContain("&lt;img src=x onerror=&quot;steal()&quot;&gt;");
    expect(html).toContain("&lt;script&gt;steal()&lt;/script&gt;");
    expect(html).toContain(">match</mark>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
  });
});
