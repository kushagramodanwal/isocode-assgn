import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db } from "../db";
import { env } from "../env";
import { endSession, requireRole, startSession, user } from "../auth";
import { HttpError, parse, route } from "../http";
import { requestOtp, verifyOtp } from "../services/otp";
import { DESK_USERS, RETAILERS } from "../../../prisma/data/people";
import type { AppConfig, Me } from "../../../shared/api";

export const authRouter = Router();

// Per-IP limit on top of the per-phone limits inside the OTP service.
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "rate_limited", message: "Too many attempts. Try again in a few minutes." } });

const Phone = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"));

authRouter.get("/config", (_req, res) => {
  const body: AppConfig = {
    demoMode: env.demoMode,
    aiReader: env.llmEnabled ? `llm:${env.llmModel}` : "rules",
    mediaCapture: env.llmEnabled,
    demoAccounts: env.demoMode
      ? [
          { phone: RETAILERS[0]!.phone, who: RETAILERS[0]!.shopName, role: "Retailer" },
          { phone: RETAILERS[1]!.phone, who: `${RETAILERS[1]!.shopName} (near credit limit)`, role: "Retailer" },
          { phone: DESK_USERS[0]!.phone, who: DESK_USERS[0]!.name, role: "Order desk" },
        ]
      : [],
  };
  res.json(body);
});

authRouter.post("/auth/otp", otpLimiter, route(async (req, res) => {
  const { phone } = parse(z.object({ phone: Phone }), req.body);
  res.json(await requestOtp(phone));
}));

authRouter.post("/auth/verify", otpLimiter, route(async (req, res) => {
  const { phone, code } = parse(z.object({ phone: Phone, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }), req.body);
  const r = await verifyOtp(phone, code);
  if (!r.ok) {
    const message = r.reason === "locked" ? "Too many wrong tries. Ask for a new code." : r.reason === "expired" ? "That code has expired. Ask for a new one." : "That code is not right. Check the SMS and try again.";
    throw new HttpError(401, r.reason, message);
  }
  const u = await db.user.findUniqueOrThrow({ where: { id: r.userId } });
  await startSession(res, u);
  res.json({ ok: true, role: u.role });
}));

authRouter.post("/auth/logout", (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

/** The signed-in user, or null. 200 either way: "not signed in" is an answer, not an error. */
authRouter.get("/me", (req, res) => {
  const u = req.user;
  if (!u) {
    res.json(null);
    return;
  }
  const body: Me = {
    id: u.id,
    name: u.name,
    role: u.role,
    lang: u.lang,
    retailer: u.retailer ? { id: u.retailer.id, shopName: u.retailer.shopName, code: u.retailer.code, area: u.retailer.area } : null,
  };
  res.json(body);
});

authRouter.put("/me/lang", requireRole(), route(async (req, res) => {
  const { lang } = parse(z.object({ lang: z.enum(["en", "hi"]) }), req.body);
  await db.user.update({ where: { id: user(req).id }, data: { lang } });
  res.json({ ok: true });
}));
