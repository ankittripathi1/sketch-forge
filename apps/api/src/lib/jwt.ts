import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { env } from "./env.js";
import { SESSION_MAX_AGE_SECONDS } from "./cookies.js";

/**
 * Session tokens.
 *
 * Rotation and revocation strategy:
 * - Every token carries `iss`, `aud`, `iat`, `jti`, and a 7 day `exp`. Tokens
 *   issued for any other service or audience are rejected.
 * - Rotating `JWT_SECRET` with the old value moved to `JWT_SECRET_PREVIOUS`
 *   lets existing sessions keep working until they expire, while everything
 *   new is signed with the current secret.
 * - Rotating `JWT_SECRET` *without* setting `JWT_SECRET_PREVIOUS` invalidates
 *   every outstanding session immediately. That is the global revocation
 *   lever, and the only one available until per-session records exist.
 */
export const JWT_ISSUER = "sketch-forge-api";
export const JWT_AUDIENCE = "sketch-forge-web";

const encoder = new TextEncoder();
const currentSecret = encoder.encode(env.JWT_SECRET);
const previousSecret = env.JWT_SECRET_PREVIOUS
  ? encoder.encode(env.JWT_SECRET_PREVIOUS)
  : null;

const verificationSecrets = previousSecret
  ? [currentSecret, previousSecret]
  : [currentSecret];

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(currentSecret);
}

/**
 * Returns the user id a session token belongs to, or `null` when the token is
 * missing, expired, tampered with, or issued for a different issuer/audience.
 */
export async function verifySessionToken(
  token: string,
): Promise<string | null> {
  for (const secret of verificationSecrets) {
    try {
      const { payload } = await jwtVerify(token, secret, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      if (payload.sub) {
        return payload.sub;
      }
    } catch {
      // Try the previous secret before giving up.
    }
  }

  return null;
}
