import { describe, expect, test } from "bun:test";
import { redactUrl } from "./logging.js";
import { shouldPrintMagicLink } from "./email.js";

describe("redactUrl", () => {
  test("masks a magic-link token", () => {
    const redacted = redactUrl(
      "http://localhost:4001/auth/verify?token=deadbeefcafe",
    );

    expect(redacted).toBe("/auth/verify?token=%5Bredacted%5D");
    expect(redacted).not.toContain("deadbeefcafe");
  });

  test("masks an oauth code and state", () => {
    const redacted = redactUrl(
      "https://example.com/api/auth/google/callback?code=4%2Fsecret&state=abc123",
    );

    expect(redacted).not.toContain("secret");
    expect(redacted).not.toContain("abc123");
  });

  test("leaves ordinary query parameters alone", () => {
    expect(redactUrl("https://example.com/pages/search?q=diagram")).toBe(
      "/pages/search?q=diagram",
    );
  });

  test("keeps the path when there is no query", () => {
    expect(redactUrl("https://example.com/health")).toBe("/health");
  });

  test("redacts wholesale rather than throwing on a malformed url", () => {
    expect(redactUrl("not a url")).toBe("[redacted]");
  });
});

describe("shouldPrintMagicLink", () => {
  test("prints only on a developer machine with no mail provider", () => {
    expect(shouldPrintMagicLink("development", false)).toBe(true);
    expect(shouldPrintMagicLink("development", true)).toBe(false);
  });

  test("never prints outside development", () => {
    for (const nodeEnv of ["production", "test", "staging"]) {
      expect(shouldPrintMagicLink(nodeEnv, false)).toBe(false);
      expect(shouldPrintMagicLink(nodeEnv, true)).toBe(false);
    }
  });
});
