import { Resend } from "resend";
import { createHash, randomBytes } from "crypto";
import { db, magicLinkTokens } from "@repo/db";
import { lt } from "drizzle-orm";
import { apiPublicUrl, env } from "./env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * A magic link is a bearer credential: anyone holding it can sign in as its
 * owner. Printing it is only ever acceptable on a developer machine that has no
 * mail provider configured.
 */
export function shouldPrintMagicLink(
  nodeEnv: string,
  hasMailProvider: boolean,
): boolean {
  return nodeEnv === "development" && !hasMailProvider;
}

/** Drops magic-link tokens that can no longer be redeemed. */
export async function deleteExpiredMagicLinkTokens(): Promise<void> {
  await db
    .delete(magicLinkTokens)
    .where(lt(magicLinkTokens.expiresAt, new Date()));
}

export async function sendMagicLink(
  userId: string,
  email: string,
): Promise<void> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await db.insert(magicLinkTokens).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const link = `${apiPublicUrl}/auth/verify?token=${rawToken}`;

  if (shouldPrintMagicLink(env.NODE_ENV, resend !== null)) {
    console.log(`[dev] magic link: ${link}`);
    return;
  }

  if (!resend) {
    throw new Error("Cannot send a magic link: RESEND_API_KEY is not set");
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM!,
    to: email,
    subject: "Sign in to SketchForge",
    html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; padding: 20px; background: #f5f5f5;">
    <div style="max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
    <h1 style="margin: 0 0 20px; color: #333;">Welcome to SketchForge</h1>
    <p style="color: #666; line-height: 1.5;">Click the button below to sign in to your account. This link expires in 10 minutes.</p>
    <a href="${link}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Sign In</a>
    <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    </body>
    </html>
    `,
  });

  if (error) {
    // The provider echoes the recipient and request payload back in `error`.
    // Only the reason is safe to surface.
    throw new Error(`Magic link delivery failed: ${error.name}`);
  }
}
