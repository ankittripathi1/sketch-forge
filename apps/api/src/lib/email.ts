import { Resend } from "resend";
import { createHash, randomBytes } from "crypto";
import { db, magicLinkTokens } from "@repo/db";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLink(userId: string, email: string) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(magicLinkTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const link = `${process.env.API_URL}/auth/verify?token=${rawToken}`;

  console.log("[magic-link] sending to:", email);
  console.log("[magic-link] link:", link);

  const result = await resend.emails.send({
    from: "SketchForge <onboarding@resend.dev>",
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

  console.log("[magic-link] resend result:", JSON.stringify(result));
}
