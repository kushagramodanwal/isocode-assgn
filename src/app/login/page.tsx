import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { env } from "@/lib/env";
import { RETAILERS, DESK_USERS } from "../../../prisma/data/people";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const demo = env.demoMode
    ? [
        { phone: RETAILERS[0]!.phone, who: `${RETAILERS[0]!.shopName}`, role: "Retailer" },
        { phone: RETAILERS[1]!.phone, who: `${RETAILERS[1]!.shopName} (near credit limit)`, role: "Retailer" },
        { phone: DESK_USERS[0]!.phone, who: DESK_USERS[0]!.name, role: "Order desk" },
      ]
    : [];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white" aria-hidden>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 8h18v12H3zM2 4h20v4H2zM10 12h4" /></svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Company A Orders</h1>
        <p className="mt-1 text-[var(--color-muted)]">Your prices, today&apos;s schemes and live stock. · आपके दाम, स्कीम और स्टॉक।</p>
      </div>
      <LoginForm demo={demo} />
    </main>
  );
}
