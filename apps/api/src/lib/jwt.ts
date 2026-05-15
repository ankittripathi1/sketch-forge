import { SignJWT } from "jose";

export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getJwtToken(userId: string) {
  const token = await new SignJWT({ userId: userId })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(userId)
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  return token;
}
