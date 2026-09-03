/**
 * Base URL the browser uses to reach the API.
 *
 * In production the API is served under the same public origin as the web app,
 * so this is a path (`/api`) and requests stay same-origin. Local development
 * runs the API on its own port.
 */
export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:4001");

/**
 * Name of the session cookie the API issues.
 *
 * Must stay identical to `cookieNameFor("session", ...)` in
 * `apps/api/src/lib/cookies.ts`. The `__Host-` prefix is only valid on a
 * Secure, Path=/, domainless cookie, which is what the API sets in production.
 * Both sides have a test on these literals so a change to one fails the build.
 */
export function sessionCookieName(production: boolean): string {
  return production ? "__Host-session" : "session";
}

export const SESSION_COOKIE_NAME = sessionCookieName(
  process.env.NODE_ENV === "production",
);
