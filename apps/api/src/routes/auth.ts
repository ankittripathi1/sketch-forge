import { decodeIdToken, generateState } from "arctic";
import { Hono } from "hono";
import { generateCodeVerifier } from "oslo/oauth2";
import { google } from "../lib/oauth.js";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { db, magicLinkTokens, oauthAccounts, userTable } from "@repo/db";
import { and, eq, gt } from "drizzle-orm";
import { loginSchema } from "@repo/schema";
import { sendMagicLink } from "../lib/email.js";
import { hash } from "bcryptjs";
import { getJwtToken, JWT_SECRET } from "../lib/jwt.js";
import { jwtVerify } from "jose";

const auth = new Hono();

auth.get("/login", async (c) => {
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

  const user = await db.query.userTable.findFirst({
    where: eq(userTable.email, email),
  });

  if (!user) {
    return c.json(
      { message: "If this email exists, a magic link has been sent" },
      200,
    );
  }

  await sendMagicLink(user.id, user.email);

  return c.json(
    { message: "If this email exists, a magic link has been sent" },
    200,
  );
});

auth.get("/verify", async (c) => {
  const { token } = c.req.query();

  if (!token) {
    return c.json({ error: "Token required" }, 400);
  }

  const tokenHash = await hash(token, process.env.HASH_SALT!);

  const validToken = await db.query.magicLinkTokens.findFirst({
    where: and(
      eq(magicLinkTokens.tokenHash, tokenHash),
      gt(magicLinkTokens.expiresAt, new Date()),
    ),
  });

  if (!validToken) {
    return c.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_token`);
  }

  await db.delete(magicLinkTokens).where(eq(magicLinkTokens.id, validToken.id));

  if (!validToken.userId) {
    return c.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_token`);
  }

  const JWTtoken = await getJwtToken(validToken.userId);

  setCookie(c, "session", JWTtoken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return c.redirect(`${process.env.FRONTEND_URL}`);
});

auth.get("/google", async (c) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  setCookie(c, "google_state", state, {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 10,
    path: "/",
  });

  setCookie(c, "google_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 10,
    path: "/",
  });

  return c.redirect(url.toString());
});

auth.get("/google/callback", async (c) => {
  const { code, state } = c.req.query();

  const storedState = getCookie(c, "google_state");
  const storedVerifier = getCookie(c, "google_code_verifier");

  if (!code || !state || state !== storedState || !storedVerifier) {
    return c.json({ error: "Invalid OAuth state" }, 400);
  }

  const tokens = await google.validateAuthorizationCode(code, storedVerifier);

  const claims = decodeIdToken(tokens.idToken());
  const googleId = claims.sub as string;
  const email = claims.email as string;
  const name = claims.name as string;
  const avatarUrl = claims.picture as string;

  const existingOauth = await db
    .select()
    .from(oauthAccounts)
    .where(eq(oauthAccounts.providerAccountId, googleId))
    .limit(1);

  let userId: string;

  if (existingOauth.length > 0) {
    userId = existingOauth[0]!.userId!;
  } else {
    const newUser = await db
      .insert(userTable)
      .values({ email, name, avatarUrl })
      .returning();

    userId = newUser[0]!.id;

    await db.insert(oauthAccounts).values({
      userId,
      provider: "google",
      providerAccountId: googleId,
    });
  }
  return c.redirect(`${process.env.FRONTEND_URL}?userId=${userId}`);
});

auth.post("/logout", (c) => {
  deleteCookie(c, "google_state");
  deleteCookie(c, "google_code_verifier");
  return c.json({ message: "Logged out" });
});

auth.get("/me", async (c) => {
  const cookie = getCookie(c, "session");

  if (!cookie) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const { payload } = await jwtVerify(cookie, JWT_SECRET);
    const userId = payload.userId as string;

    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
    });

    if (!user) {
      return c.json({ user });
    }

    return c.json({ user });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

export default auth;
