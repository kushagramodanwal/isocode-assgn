/** Edge-safe session token helpers (used by middleware and server code). */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "session";

export type SessionClaims = { uid: string; role: "RETAILER" | "DESK"; rid: string | null };

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims, maxAgeSeconds: number): Promise<string> {
  return new SignJWT({ role: claims.role, rid: claims.rid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.uid)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof payload.sub !== "string" || (role !== "RETAILER" && role !== "DESK")) return null;
    return { uid: payload.sub, role, rid: typeof payload.rid === "string" ? payload.rid : null };
  } catch {
    return null;
  }
}
