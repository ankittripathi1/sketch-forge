import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { SESSION_COOKIE } from "../lib/cookies.js";
import { verifySessionToken } from "../lib/jwt.js";

export type AuthVariables = {
  userId: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);

    if (!token) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const userId = await verifySessionToken(token);

    if (!userId) {
      return c.json({ error: "Invalid token" }, 401);
    }

    c.set("userId", userId);
    await next();
  },
);
