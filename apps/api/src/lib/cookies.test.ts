import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import {
  SESSION_MAX_AGE_SECONDS,
  cookieAttributes,
  cookieNameFor,
} from "./cookies.js";

/**
 * Renders a Set-Cookie header the way Hono would, so the production attributes
 * can be asserted without running the process in production mode.
 */
async function renderCookie(production: boolean): Promise<string> {
  const app = new Hono().get("/", (c) => {
    setCookie(c, cookieNameFor("session", production), "token-value", {
      ...cookieAttributes(production),
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return c.body(null, 204);
  });

  const response = await app.request("/");
  return response.headers.getSetCookie()[0]!;
}

describe("production cookies", () => {
  test("carry the __Host- prefix", () => {
    expect(cookieNameFor("session", true)).toBe("__Host-session");
    expect(cookieNameFor("google_state", true)).toBe("__Host-google_state");
  });

  test("are Secure, HttpOnly, SameSite=Lax, Path=/, and domainless", async () => {
    const cookie = await renderCookie(true);

    expect(cookie).toStartWith("__Host-session=");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    // A Domain attribute would make the __Host- prefix invalid and let a
    // sibling host overwrite the session.
    expect(cookie).not.toContain("Domain=");
  });

  // apps/sketch-forge/src/api/config.ts mirrors these exact literals and has a
  // matching test, so a change on either side fails a build.
});

describe("development cookies", () => {
  test("drop the prefix and Secure so plain http works locally", async () => {
    const cookie = await renderCookie(false);

    expect(cookie).toStartWith("session=");
    expect(cookie).not.toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });
});
