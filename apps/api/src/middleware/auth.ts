import { jwtVerify } from "jose";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { JWT_SECRET } from "../lib/jwt.js";

export type AuthVariables = {
  userId: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const cookie = getCookie(c, "session");

    if (!cookie) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      const { payload } = await jwtVerify(cookie, JWT_SECRET);

      if (!payload.sub) {
        return c.json({ error: "Invalid token" }, 401);
      }

      c.set("userId", payload.sub);
      await next();
    } catch {
      return c.json({ error: "Invalid token" }, 401);
    }
  },
);
