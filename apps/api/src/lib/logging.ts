import { createMiddleware } from "hono/factory";

/**
 * Query parameters that carry a credential. Hono's built-in logger prints the
 * full path including the query string, which would put every magic-link token
 * and OAuth code straight into the access log.
 */
const SECRET_QUERY_KEYS = new Set([
  "token",
  "code",
  "state",
  "code_verifier",
  "id_token",
  "access_token",
  "refresh_token",
]);

const REDACTED = "[redacted]";

/** Returns `pathname?query` with credential-bearing parameters masked. */
export function redactUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return REDACTED;
  }

  for (const key of [...url.searchParams.keys()]) {
    if (SECRET_QUERY_KEYS.has(key.toLowerCase())) {
      url.searchParams.set(key, REDACTED);
    }
  }

  return `${url.pathname}${url.search}`;
}

/** Access log that never emits credentials. */
export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now();
  await next();
  console.log(
    `${c.req.method} ${redactUrl(c.req.url)} ${c.res.status} ${Date.now() - start}ms`,
  );
});
