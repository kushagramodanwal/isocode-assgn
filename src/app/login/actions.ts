"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { requestOtp, verifyOtp } from "@/server/otp";
import { startSession } from "@/lib/auth";
import { db } from "@/lib/db";

const Phone = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"));
const Code = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

export type LoginState =
  | { step: "phone"; error?: string; phone?: string }
  | { step: "code"; phone: string; demoCode?: string; error?: string; info?: string };

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = Phone.safeParse(form.get("phone") ?? "");
  if (!phone.success) return { step: "phone", error: phone.error.issues[0]?.message, phone: String(form.get("phone") ?? "") };
  const r = await requestOtp(phone.data);
  if (!r.ok) {
    const wait = r.retryInSeconds > 60 ? `${Math.ceil(r.retryInSeconds / 60)} minutes` : `${r.retryInSeconds} seconds`;
    // If a code was already sent, keep the person on the code step.
    return r.reason === "too_soon"
      ? { step: "code", phone: phone.data, info: `Code already sent. You can ask for a new one in ${wait}.` }
      : { step: "phone", phone: phone.data, error: `Too many codes requested. Try again in ${wait}.` };
  }
  return { step: "code", phone: phone.data, demoCode: r.demoCode };
}

export async function checkCode(prev: LoginState, form: FormData): Promise<LoginState> {
  if (prev.step !== "code") return { step: "phone" };
  const code = Code.safeParse(String(form.get("code") ?? "").replace(/\s/g, ""));
  if (!code.success) return { ...prev, error: code.error.issues[0]?.message, info: undefined };
  const r = await verifyOtp(prev.phone, code.data);
  if (!r.ok) {
    const error =
      r.reason === "locked" ? "Too many wrong tries. Ask for a new code." : r.reason === "expired" ? "That code has expired. Ask for a new one." : "That code is not right. Check the SMS and try again.";
    return { ...prev, error, info: undefined };
  }
  const user = await db.user.findUniqueOrThrow({ where: { id: r.userId } });
  await startSession(user);
  redirect(user.role === "DESK" ? "/desk" : "/shop");
}

export async function logout() {
  const { endSession } = await import("@/lib/auth");
  await endSession();
  redirect("/login");
}

/** Single entry point for the login form: one state machine, three intents. */
export async function loginStep(prev: LoginState, form: FormData): Promise<LoginState> {
  const intent = form.get("intent");
  if (intent === "reset") return { step: "phone", phone: prev.phone };
  if (intent === "verify") return checkCode(prev, form);
  return sendCode(prev, form);
}
