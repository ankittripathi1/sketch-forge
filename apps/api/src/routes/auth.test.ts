/**
 * Authentication integration tests against a real, isolated PostgreSQL database
 * (see ../../test/setup.ts). Magic-link single-use and Google account linking
 * are enforced by the database, so they are exercised for real here.
 *
 * The only stubbed boundary is outbound mail delivery. Everything the login
 * route writes still goes to the database.
 */
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import { SignJWT } from "jose";
import { db, magicLinkTokens, oauthAccounts, userTable } from "@repo/db";
import { eq, inArray } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { createSessionToken, verifySessionToken } from "../lib/jwt.js";
import { SESSION_COOKIE } from "../lib/cookies.js";
import { resolveGoogleUser } from "../lib/googleAccount.js";
import { resetRateLimits } from "../lib/rateLimit.js";
import { originGuard } from "../middleware/originGuard.js";
import { env } from "../lib/env.js";

const deliveries: string[] = [];

mock.module("../lib/email.js", () => ({
  sendMagicLink: async (userId: string) => {
    deliveries.push(userId);
  },
  deleteExpiredMagicLinkTokens: async () => {},
  shouldPrintMagicLink: () => false,
}));

// Imported after the mail stub is registered so the route picks it up.
const { default: authRouter } = await import("./auth.js");
const { default: pagesRouter } = await import("./pages.js");

const app = new Hono()
  .use(originGuard)
  .route("/auth", authRouter)
  .route("/pages", pagesRouter);

const createdUserIds: string[] = [];
const createdEmails: string[] = [];

async function createUser(label: string) {
  const email = `${label}-${crypto.randomUUID()}@auth.test`;
  const [user] = await db.insert(userTable).values({ email }).returning();

  if (!user) {
    throw new Error("Failed to create test user");
  }

  createdUserIds.push(user.id);
  return user;
}

/** Writes a magic-link token the way lib/email.ts does, without sending mail. */
async function issueMagicLink(userId: string, ttlMs = 10 * 60 * 1000) {
  const rawToken = randomBytes(32).toString("hex");

  await db.insert(magicLinkTokens).values({
    userId,
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return rawToken;
}

function sessionCookieFrom(response: Response): string | undefined {
  return response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
}

function sessionTokenFrom(response: Response): string | undefined {
  const cookie = sessionCookieFrom(response);
  if (!cookie) return undefined;
  return cookie.slice(cookie.indexOf("=") + 1).split(";")[0];
}

beforeEach(() => {
  resetRateLimits();
  deliveries.length = 0;
});

afterAll(async () => {
  if (createdEmails.length > 0) {
    await db.delete(userTable).where(inArray(userTable.email, createdEmails));
  }
  if (createdUserIds.length > 0) {
    await db.delete(userTable).where(inArray(userTable.id, createdUserIds));
  }
});

describe("magic link verification", () => {
  test("redeems a valid link once and issues a session", async () => {
    const user = await createUser("redeem");
    const token = await issueMagicLink(user.id);

    const response = await app.request(`/auth/verify?token=${token}`);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `${env.PUBLIC_ORIGIN}/dashboard`,
    );
    expect(await verifySessionToken(sessionTokenFrom(response)!)).toBe(user.id);
  });

  test("cannot redeem the same link twice", async () => {
    const user = await createUser("replay");
    const token = await issueMagicLink(user.id);

    expect(
      sessionCookieFrom(await app.request(`/auth/verify?token=${token}`)),
    ).toBeDefined();

    const second = await app.request(`/auth/verify?token=${token}`);
    expect(second.headers.get("location")).toBe(
      `${env.PUBLIC_ORIGIN}/login?error=invalid_token`,
    );
    expect(sessionCookieFrom(second)).toBeUndefined();
  });

  test("concurrent redemptions of one link produce exactly one session", async () => {
    const user = await createUser("race");
    const token = await issueMagicLink(user.id);

    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        app.request(`/auth/verify?token=${token}`),
      ),
    );

    const issued = responses.filter(
      (response) => sessionCookieFrom(response) !== undefined,
    );
    expect(issued).toHaveLength(1);

    const remaining = await db
      .select({ id: magicLinkTokens.id })
      .from(magicLinkTokens)
      .where(eq(magicLinkTokens.userId, user.id));
    expect(remaining).toHaveLength(0);
  });

  test("rejects an expired link", async () => {
    const user = await createUser("expired");
    const token = await issueMagicLink(user.id, -1000);

    const response = await app.request(`/auth/verify?token=${token}`);

    expect(response.headers.get("location")).toBe(
      `${env.PUBLIC_ORIGIN}/login?error=invalid_token`,
    );
    expect(sessionCookieFrom(response)).toBeUndefined();
  });

  test("rejects an unknown token", async () => {
    const response = await app.request("/auth/verify?token=not-a-real-token");

    expect(response.headers.get("location")).toBe(
      `${env.PUBLIC_ORIGIN}/login?error=invalid_token`,
    );
    expect(sessionCookieFrom(response)).toBeUndefined();
  });
});

describe("session cookie attributes", () => {
  test("is httpOnly, path-scoped, SameSite=Lax, and domainless", async () => {
    const user = await createUser("cookie");
    const token = await issueMagicLink(user.id);

    const cookie = sessionCookieFrom(
      await app.request(`/auth/verify?token=${token}`),
    );

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=604800");
    // No Domain: the cookie stays pinned to the issuing host, which is what
    // makes the production `__Host-` prefix valid.
    expect(cookie).not.toContain("Domain=");
  });

  test("logout clears the session with matching attributes", async () => {
    const cookie = sessionCookieFrom(
      await app.request("/auth/logout", { method: "POST" }),
    );

    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=0");
  });
});

describe("session tokens", () => {
  const foreignSecret = new TextEncoder().encode(
    "a-different-secret-of-sufficient-length",
  );
  const ownSecret = new TextEncoder().encode(env.JWT_SECRET);

  const sign = (
    secret: Uint8Array,
    claims: { issuer?: string; audience?: string },
  ) => {
    let builder = new SignJWT()
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(crypto.randomUUID())
      .setExpirationTime("1h");

    if (claims.issuer) builder = builder.setIssuer(claims.issuer);
    if (claims.audience) builder = builder.setAudience(claims.audience);

    return builder.sign(secret);
  };

  test("accepts a token this API issued", async () => {
    const userId = crypto.randomUUID();
    expect(await verifySessionToken(await createSessionToken(userId))).toBe(
      userId,
    );
  });

  test("rejects a token signed with a different secret", async () => {
    const token = await sign(foreignSecret, {
      issuer: "sketch-forge-api",
      audience: "sketch-forge-web",
    });

    expect(await verifySessionToken(token)).toBeNull();
  });

  test("rejects a token issued for another audience", async () => {
    const token = await sign(ownSecret, {
      issuer: "sketch-forge-api",
      audience: "someone-else",
    });

    expect(await verifySessionToken(token)).toBeNull();
  });

  test("rejects a token from another issuer", async () => {
    const token = await sign(ownSecret, {
      issuer: "someone-else",
      audience: "sketch-forge-web",
    });

    expect(await verifySessionToken(token)).toBeNull();
  });

  test("rejects a legacy token with no issuer or audience", async () => {
    expect(await verifySessionToken(await sign(ownSecret, {}))).toBeNull();
  });

  test("rejects a malformed token", async () => {
    expect(await verifySessionToken("not.a.jwt")).toBeNull();
  });
});

describe("google account linking", () => {
  test("links to an existing verified email instead of breaking uniqueness", async () => {
    const user = await createUser("google-link");
    const googleId = `google-${crypto.randomUUID()}`;

    const resolved = await resolveGoogleUser({
      googleId,
      email: user.email,
      name: "Linked",
    });

    expect(resolved).toBe(user.id);

    const accounts = await db
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.providerAccountId, googleId));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.userId).toBe(user.id);
  });

  test("returns the same user on a repeat sign-in without duplicating the link", async () => {
    const user = await createUser("google-repeat");
    const googleId = `google-${crypto.randomUUID()}`;

    const first = await resolveGoogleUser({ googleId, email: user.email });
    const second = await resolveGoogleUser({ googleId, email: user.email });

    expect(second).toBe(first);

    const accounts = await db
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.providerAccountId, googleId));
    expect(accounts).toHaveLength(1);
  });

  test("creates a user when the email is unknown", async () => {
    const email = `google-new-${crypto.randomUUID()}@auth.test`;
    createdEmails.push(email);
    const googleId = `google-${crypto.randomUUID()}`;

    const userId = await resolveGoogleUser({ googleId, email });

    const [created] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId));
    expect(created?.email).toBe(email);
  });

  test("keeps two google accounts on the same email pointed at one user", async () => {
    const user = await createUser("google-two");

    const first = await resolveGoogleUser({
      googleId: `google-${crypto.randomUUID()}`,
      email: user.email,
    });
    const second = await resolveGoogleUser({
      googleId: `google-${crypto.randomUUID()}`,
      email: user.email,
    });

    expect(first).toBe(user.id);
    expect(second).toBe(user.id);
  });
});

describe("google oauth entry points", () => {
  test("are unavailable when no credentials are configured", async () => {
    expect((await app.request("/auth/google")).status).toBe(404);
  });

  test("never issue a session for a mismatched state", async () => {
    const response = await app.request(
      "/auth/google/callback?code=abc&state=attacker",
      {
        headers: {
          cookie: `${SESSION_COOKIE}=; google_state=genuine; google_code_verifier=v`,
        },
      },
    );

    // 404 while Google is unconfigured, 400 once it is. Never a session.
    expect([400, 404]).toContain(response.status);
    expect(sessionCookieFrom(response)).toBeUndefined();
  });

  test("never issue a session when the verifier cookie is missing", async () => {
    const response = await app.request(
      "/auth/google/callback?code=abc&state=matching",
      { headers: { cookie: "google_state=matching" } },
    );

    expect([400, 404]).toContain(response.status);
    expect(sessionCookieFrom(response)).toBeUndefined();
  });
});

describe("login throttling", () => {
  const login = (email: string) =>
    app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

  const attemptSequence = async (email: string) => {
    resetRateLimits();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 8; attempt++) {
      statuses.push((await login(email)).status);
    }
    return statuses;
  };

  test("throttles repeated attempts", async () => {
    const user = await createUser("throttle");

    const statuses = await attemptSequence(user.email);

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
  });

  test("behaves identically for a known and an unknown address", async () => {
    const known = await createUser("throttle-known");
    const unknown = `throttle-unknown-${crypto.randomUUID()}@auth.test`;
    createdEmails.push(unknown);

    // Same number of attempts against each. A difference here would let an
    // attacker probe for registered addresses.
    expect(await attemptSequence(known.email)).toEqual(
      await attemptSequence(unknown),
    );
  });

  test("returns Retry-After when throttled", async () => {
    const user = await createUser("throttle-header");

    resetRateLimits();
    let throttled: Response | undefined;
    for (let attempt = 0; attempt < 8 && !throttled; attempt++) {
      const response = await login(user.email);
      if (response.status === 429) throttled = response;
    }

    expect(throttled).toBeDefined();
    expect(Number(throttled!.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("cross-origin state changes", () => {
  const sessionFor = async (label: string) => {
    const user = await createUser(label);
    return `${SESSION_COOKIE}=${await createSessionToken(user.id)}`;
  };

  test("rejects a mutation from another origin", async () => {
    const response = await app.request("/pages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
        cookie: await sessionFor("csrf"),
      },
      body: JSON.stringify({ title: "Injected" }),
    });

    expect(response.status).toBe(403);
  });

  test("allows a mutation from the configured origin", async () => {
    const response = await app.request("/pages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: env.PUBLIC_ORIGIN,
        cookie: await sessionFor("csrf-ok"),
      },
      body: JSON.stringify({ title: "Allowed" }),
    });

    expect(response.status).toBe(201);
  });

  test("does not block a safe cross-origin read", async () => {
    const response = await app.request("/pages", {
      headers: {
        origin: "https://evil.example",
        cookie: await sessionFor("csrf-read"),
      },
    });

    expect(response.status).toBe(200);
  });
});
