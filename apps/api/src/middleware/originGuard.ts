import { createMiddleware } from "hono/factory";
import { env } from "../lib/env.js";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Rejects state-changing requests a browser sent from another origin.
 *
 * Session cookies are `SameSite=Lax`, which already blocks cross-site form
 * posts. This is the second layer: browsers always attach `Origin` to an unsafe
 * cross-origin request, so a mismatch is unambiguous. Requests with no `Origin`
 * at all are allowed through because they are not browser-initiated, which is
 * how the web app's server-side fetches reach the API.
 */
export const originGuard = createMiddleware(async (c, next) => {
  if (UNSAFE_METHODS.has(c.req.method)) {
    const origin = c.req.header("origin");

    if (origin !== undefined && origin !== env.PUBLIC_ORIGIN) {
      return c.json({ error: "Cross-origin request rejected" }, 403);
    }
  }

  await next();
});
