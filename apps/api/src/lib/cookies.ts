import type { Context } from "hono";
import type { CookieOptions } from "hono/utils/cookie";
import { deleteCookie, setCookie } from "hono/cookie";
import { isProduction } from "./env.js";

/**
 * One definition of how this API writes cookies.
 *
 * In production every cookie carries the `__Host-` prefix, which browsers only
 * accept when the cookie is `Secure`, has `Path=/`, and has no `Domain`. That
 * pins each cookie to this exact host, so a compromised sibling host cannot
 * overwrite a session. It is also why the deployment uses a single public
 * origin rather than a shared cookie domain.
 *
 * `apps/sketch-forge/src/api/config.ts` mirrors the naming rule, because the
 * web middleware reads the session cookie directly.
 */
export function cookieNameFor(base: string, production: boolean): string {
  return production ? `__Host-${base}` : base;
}

/**
 * Attributes shared by every cookie this API sets.
 *
 * `sameSite: "Lax"` rather than `"Strict"`: the magic-link and OAuth callbacks
 * are top-level navigations arriving from another site, and a Strict cookie
 * would not be sent with them.
 */
export function cookieAttributes(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "Lax",
    path: "/",
  } as const satisfies CookieOptions;
}

export const SESSION_COOKIE = cookieNameFor("session", isProduction);
export const OAUTH_STATE_COOKIE = cookieNameFor("google_state", isProduction);
export const OAUTH_VERIFIER_COOKIE = cookieNameFor(
  "google_code_verifier",
  isProduction,
);
export const LOGIN_NEXT_COOKIE = cookieNameFor("login_next", isProduction);

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const OAUTH_MAX_AGE_SECONDS = 60 * 10;

const baseOptions = cookieAttributes(isProduction);

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    ...baseOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function setShortLivedCookie(
  c: Context,
  name: string,
  value: string,
): void {
  setCookie(c, name, value, {
    ...baseOptions,
    maxAge: OAUTH_MAX_AGE_SECONDS,
  });
}

/**
 * Clears a cookie using the same attributes it was written with. A mismatched
 * `path`, `secure`, or `sameSite` leaves the original cookie in the browser.
 */
export function clearCookie(c: Context, name: string): void {
  deleteCookie(c, name, baseOptions);
}

export function clearAuthCookies(c: Context): void {
  for (const name of [
    SESSION_COOKIE,
    OAUTH_STATE_COOKIE,
    OAUTH_VERIFIER_COOKIE,
    LOGIN_NEXT_COOKIE,
  ]) {
    clearCookie(c, name);
  }
}
