import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendSms } from "./messaging";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_WINDOW = 3;
export const OTP_WINDOW_MS = 10 * 60 * 1000;
export const OTP_RESEND_GAP_MS = 30 * 1000;

function hash(phone: string, code: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(`${phone}:${code}`).digest("hex");
}

export type RequestOtpResult =
  | { ok: true; demoCode?: string }
  | { ok: false; reason: "rate_limited" | "too_soon"; retryInSeconds: number };

/**
 * Always behaves the same whether or not the phone is registered, so the login form
 * can't be used to discover which numbers are customers.
 */
export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const now = Date.now();
  const recent = await db.otpChallenge.findMany({
    where: { phone, createdAt: { gte: new Date(now - OTP_WINDOW_MS) } },
    orderBy: { createdAt: "desc" },
  });
  const last = recent[0];
  if (last && now - last.createdAt.getTime() < OTP_RESEND_GAP_MS) {
    return { ok: false, reason: "too_soon", retryInSeconds: Math.ceil((OTP_RESEND_GAP_MS - (now - last.createdAt.getTime())) / 1000) };
  }
  if (recent.length >= OTP_MAX_PER_WINDOW) {
    const oldest = recent[recent.length - 1]!;
    return { ok: false, reason: "rate_limited", retryInSeconds: Math.ceil((OTP_WINDOW_MS - (now - oldest.createdAt.getTime())) / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpChallenge.create({ data: { phone, codeHash: hash(phone, code), expiresAt: new Date(now + OTP_TTL_MS) } });

  const user = await db.user.findUnique({ where: { phone } });
  if (user?.active) await sendSms(phone, `${code} is your Company A ordering code. It expires in 5 minutes.`);

  // SMS is mocked. In demo mode the code is shown on screen, only for registered numbers.
  return { ok: true, demoCode: env.demoMode && user?.active ? code : undefined };
}

export type VerifyOtpResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "locked" };

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const challenge = await db.otpChallenge.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { ok: false, reason: "expired" };
  if (challenge.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "locked" };

  // Count the attempt first, atomically, so parallel guesses can't exceed the limit.
  const bumped = await db.otpChallenge.updateMany({
    where: { id: challenge.id, attempts: { lt: OTP_MAX_ATTEMPTS }, consumedAt: null },
    data: { attempts: { increment: 1 } },
  });
  if (bumped.count === 0) return { ok: false, reason: "locked" };

  const a = Buffer.from(hash(phone, code), "hex");
  const b = Buffer.from(challenge.codeHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: challenge.attempts + 1 >= OTP_MAX_ATTEMPTS ? "locked" : "invalid" };
  }

  const user = await db.user.findUnique({ where: { phone } });
  if (!user || !user.active) return { ok: false, reason: "invalid" };
  const consumed = await db.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (consumed.count === 0) return { ok: false, reason: "expired" };
  return { ok: true, userId: user.id };
}
