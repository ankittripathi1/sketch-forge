import { decodeIdToken, generateState } from "arctic";
import { Hono } from "hono";
import { generateCodeVerifier } from "oslo/oauth2";
import { google } from "../lib/oauth.js";
import { getCookie } from "hono/cookie";
import { db, magicLinkTokens, userTable } from "@repo/db";
import { and, eq, gt } from "drizzle-orm";
import { loginSchema } from "@repo/schema";
import { deleteExpiredMagicLinkTokens, sendMagicLink } from "../lib/email.js";
import { createHash } from "crypto";
import { createSessionToken } from "../lib/jwt.js";
import { resolveGoogleUser } from "../lib/googleAccount.js";
import { env } from "../lib/env.js";
import { authMiddleware, type AuthVariables } from "../middleware/auth.js";
import {
  LOGIN_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  clearAuthCookies,
  clearCookie,
  setSessionCookie,
  setShortLivedCookie,
} from "../lib/cookies.js";
import {
  checkIdentifierLimit,
  rateLimitByAddress,
  type RateLimitOptions,
} from "../lib/rateLimit.js";

const auth = new Hono<{ Variables: AuthVariables }>();

const LOGIN_ADDRESS_LIMIT: RateLimitOptions = {
  scope: "login",
  limit: 10,
  windowSeconds: 15 * 60,
};

// Applied to the submitted address so one mailbox cannot be flooded from many
// clients. Returns the same 429 as the address limiter either way, so it never
// reveals whether the account exists.
const LOGIN_EMAIL_LIMIT: RateLimitOptions = {
  scope: "login",
  limit: 5,
  windowSeconds: 15 * 60,
};

const VERIFY_LIMIT: RateLimitOptions = {
  scope: "verify",
  limit: 20,
  windowSeconds: 15 * 60,
};

const OAUTH_LIMIT: RateLimitOptions = {
  scope: "oauth",
  limit: 20,
  windowSeconds: 15 * 60,
};

/** Only same-site paths are accepted, so `next` cannot become an open redirect. */
function safeNextPath(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function loginErrorRedirect(reason: string) {
  return `${env.PUBLIC_ORIGIN}/login?error=${reason}`;
}

auth.post("/login", rateLimitByAddress(LOGIN_ADDRESS_LIMIT), async (c) => {
  const body = await c.req.json();

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        message: "Invalid inputs",
        errors: parsed.error.issues,
      },
      400,
    );
  }

  const { email } = parsed.data;

  const throttled = checkIdentifierLimit(c, LOGIN_EMAIL_LIMIT, email);
  if (throttled) {
    return throttled;
  }

  await deleteExpiredMagicLinkTokens();

  let user = await db.query.userTable.findFirst({
    where: eq(userTable.email, email),
  });

  if (!user) {
    const [newUser] = await db.insert(userTable).values({ email }).returning();
    user = newUser!;
  }

  await sendMagicLink(user.id, user.email);

  return c.json(
    { message: "If this email exists, a magic link has been sent" },
    200,
  );
});

auth.get("/verify", rateLimitByAddress(VERIFY_LIMIT), async (c) => {
  const { token } = c.req.query();

  if (!token) {
    return c.redirect(loginErrorRedirect("invalid_token"));
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Delete-and-return in one statement. Two concurrent redemptions of the same
  // link race on the same row, and only one of them gets a row back.
  const [redeemed] = await db
    .delete(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        gt(magicLinkTokens.expiresAt, new Date()),
      ),
    )
    .returning();

  if (!redeemed?.userId) {
    return c.redirect(loginErrorRedirect("invalid_token"));
  }

  setSessionCookie(c, await createSessionToken(redeemed.userId));

  return c.redirect(`${env.PUBLIC_ORIGIN}/dashboard`);
});

auth.get("/google", rateLimitByAddress(OAUTH_LIMIT), async (c) => {
  if (!google) {
    return c.json({ error: "Google login is not configured" }, 404);
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  setShortLivedCookie(c, OAUTH_STATE_COOKIE, state);
  setShortLivedCookie(c, OAUTH_VERIFIER_COOKIE, codeVerifier);

  const nextPath = c.req.query("next");
  if (nextPath?.startsWith("/") && !nextPath.startsWith("//")) {
    setShortLivedCookie(c, LOGIN_NEXT_COOKIE, nextPath);
  }

  return c.redirect(url.toString());
});

auth.get("/google/callback", rateLimitByAddress(OAUTH_LIMIT), async (c) => {
  if (!google) {
    return c.json({ error: "Google login is not configured" }, 404);
  }

  const { code, state } = c.req.query();

  const storedState = getCookie(c, OAUTH_STATE_COOKIE);
  const storedVerifier = getCookie(c, OAUTH_VERIFIER_COOKIE);

  // Single-use regardless of the outcome below.
  clearCookie(c, OAUTH_STATE_COOKIE);
  clearCookie(c, OAUTH_VERIFIER_COOKIE);

  if (!code || !state || !storedState || state !== storedState) {
    return c.json({ error: "Invalid OAuth state" }, 400);
  }

  if (!storedVerifier) {
    return c.json({ error: "Invalid OAuth state" }, 400);
  }

  let claims: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  try {
    const tokens = await google.validateAuthorizationCode(code, storedVerifier);
    claims = decodeIdToken(tokens.idToken()) as typeof claims;
  } catch {
    // The provider response can carry the code and client secret.
    return c.json({ error: "Google sign-in failed" }, 400);
  }

  const googleId = claims.sub;
  const email = claims.email;

  // Without a verified email an attacker could register any address at the
  // provider and take over the matching local account below.
  if (!googleId || !email || claims.email_verified !== true) {
    return c.redirect(loginErrorRedirect("google_email_unverified"));
  }

  // Google asserted this address, so linking it to an existing local account is
  // safe and avoids colliding with the unique email constraint.
  const userId = await resolveGoogleUser({
    googleId,
    email,
    name: claims.name,
    avatarUrl: claims.picture,
  });

  setSessionCookie(c, await createSessionToken(userId));

  const nextPath = safeNextPath(getCookie(c, LOGIN_NEXT_COOKIE));
  clearCookie(c, LOGIN_NEXT_COOKIE);

  return c.redirect(`${env.PUBLIC_ORIGIN}${nextPath}`);
});

auth.post("/logout", (c) => {
  clearAuthCookies(c);
  return c.json({ message: "Logged out" });
});

auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");

  const user = await db.query.userTable.findFirst({
    where: eq(userTable.id, userId),
  });

  return c.json({ user });
});

export default auth;
