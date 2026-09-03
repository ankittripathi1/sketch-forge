import { describe, expect, test } from "bun:test";
import { sessionCookieName } from "./config";

describe("sessionCookieName", () => {
  // These literals are duplicated in apps/api/src/lib/cookies.ts. If one side
  // changes, the middleware stops seeing the session cookie and everyone is
  // silently logged out, so both sides assert them.
  test("uses the __Host- prefix in production", () => {
    expect(sessionCookieName(true)).toBe("__Host-session");
  });

  test("uses a plain name elsewhere, since __Host- requires Secure", () => {
    expect(sessionCookieName(false)).toBe("session");
  });
});
