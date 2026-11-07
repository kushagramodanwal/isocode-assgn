import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiFailure } from "../lib/api";
import { useSession } from "../lib/session";
import { useQuery } from "../lib/useQuery";
import type { AppConfig, OtpRequestResult } from "../../../shared/api";
import { ThemeToggle } from "../components/ThemeToggle";

type Step = { step: "phone" } | { step: "code"; phone: string; demoCode?: string; info?: string };

/** The server allows a new code 30 s after the last one; the button counts down to match. */
const RESEND_SECONDS = 30;

function waitText(s: number) {
  return s > 60 ? `${Math.ceil(s / 60)} minutes` : `${s} seconds`;
}

export function LoginPage() {
  const { me, ready, refresh } = useSession();
  const navigate = useNavigate();
  const config = useQuery<AppConfig>("/config");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>({ step: "phone" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (ready && me) return <Navigate to={me.role === "DESK" ? "/desk" : "/shop"} replace />;

  async function sendCode(forPhone: string) {
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<OtpRequestResult>("/auth/otp", { phone: forPhone });
      const clean = forPhone.replace(/\D/g, "").slice(-10);
      if (r.ok) {
        setStep({ step: "code", phone: clean, demoCode: r.demoCode });
        setCode(r.demoCode ?? "");
        setResendIn(RESEND_SECONDS);
      } else if (r.reason === "too_soon") {
        setStep({ step: "code", phone: clean });
        setResendIn(r.retryInSeconds);
      } else {
        setError(`Too many codes requested. Try again in ${waitText(r.retryInSeconds)}.`);
      }
    } catch (e) {
      setError(e instanceof ApiFailure ? (e.offline ? "No signal. Try again." : e.message) : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function verify(forPhone: string) {
    setError(null);
    setBusy(true);
    try {
      const r = await api.post<{ ok: true; role: "DESK" | "RETAILER" }>("/auth/verify", { phone: forPhone, code: code.replace(/\s/g, "") });
      await refresh();
      navigate(r.role === "DESK" ? "/desk" : "/shop", { replace: true });
    } catch (e) {
      setError(e instanceof ApiFailure ? (e.offline ? "No signal. Try again." : e.message) : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="absolute top-2 right-3"><ThemeToggle /></div>
      <div className="mb-8">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white" aria-hidden>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 8h18v12H3zM2 4h20v4H2zM10 12h4" /></svg>
        </div>
        <h1 className="text-xl font-semibold">Namaste · नमस्ते</h1>
        <p className="mt-1 text-[var(--color-muted)]">Company A Orders</p>
      </div>

      {step.step === "code" ? (
        <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void verify(step.phone); }}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-[var(--color-muted)]">Code sent to <span className="num font-medium text-[var(--color-ink)]">+91 {step.phone}</span></p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStep({ step: "phone" }); setError(null); }}>Change · बदलें</button>
          </div>
          {step.demoCode && (
            <div className="rounded-xl bg-[var(--color-accent-soft)] px-4 py-3 text-sm">
              <span className="text-[var(--color-muted)]">Demo SMS:</span> your OTP is <strong className="num text-base tracking-widest">{step.demoCode}</strong>
            </div>
          )}
          {step.info && <p className="text-sm text-[var(--color-muted)]">{step.info}</p>}
          <div>
            <label htmlFor="code" className="label">6-digit OTP · 6 अंकों का OTP</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="field num text-center text-2xl tracking-[0.5em]" aria-invalid={!!error} aria-describedby="code-error" />
            {error && <p id="code-error" role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
          </div>
          <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in · लॉग इन"}</button>
          <button type="button" className="min-h-12 w-full text-center text-sm text-[var(--color-muted)] disabled:opacity-100" disabled={busy || resendIn > 0} onClick={() => sendCode(step.phone)} aria-live="polite">
            {resendIn > 0 ? <span className="num">Resend OTP in {resendIn}s · {resendIn} सेकंड में दोबारा</span> : <span className="link">Resend OTP · OTP दोबारा भेजें</span>}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void sendCode(phone); }}>
            <div>
              <label htmlFor="phone" className="label">Mobile number · मोबाइल नंबर</label>
              <div className="flex items-stretch gap-2">
                <span className="flex items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-[var(--color-muted)]">+91</span>
                <input id="phone" inputMode="numeric" autoComplete="tel-national" maxLength={14} className="field num text-lg tracking-wide" placeholder="98xxxxxxxx"
                  value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!error} aria-describedby="phone-error" />
              </div>
              {error && <p id="phone-error" role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
            </div>
            <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send OTP · OTP भेजें"}</button>
            <p className="text-xs text-[var(--color-muted)]">We&apos;ll send a 6-digit OTP by SMS. No password.</p>
          </form>

          {config.data?.demoMode && config.data.demoAccounts.length > 0 && (
            <section aria-labelledby="demo-h" className="section p-5">
              <h2 id="demo-h" className="text-sm font-semibold">Demo accounts</h2>
              <p className="mb-3 text-xs text-[var(--color-muted)]">SMS is mocked in this demo. Tap an account, then Send OTP: the OTP appears on screen.</p>
              <ul className="space-y-2">
                {config.data.demoAccounts.map((d) => (
                  <li key={d.phone}>
                    <button type="button" onClick={() => setPhone(d.phone)} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left text-sm">
                      <span><span className="font-medium">{d.who}</span><span className="block text-xs text-[var(--color-muted)]">{d.role}</span></span>
                      <span className="num text-[var(--color-muted)]">{d.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
