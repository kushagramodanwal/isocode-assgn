"use client";
import { useActionState, useState } from "react";
import { loginStep, type LoginState } from "./actions";

type Demo = { phone: string; who: string; role: string };

export function LoginForm({ demo }: { demo: Demo[] }) {
  const [state, action, pending] = useActionState(loginStep, { step: "phone" } as LoginState);
  const [phone, setPhone] = useState("");

  if (state.step === "code") {
    return (
      <>
      {/* Secondary actions live in their own form so Enter in the code field always means "Sign in". */}
      <form id="login-alt" action={action} hidden><input type="hidden" name="phone" value={state.phone} /></form>
      <form action={action} className="card space-y-4 p-5" noValidate key={state.phone}>
        <input type="hidden" name="phone" value={state.phone} />
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-[var(--color-muted)]">Code sent to <span className="num font-medium text-[var(--color-ink)]">+91 {state.phone}</span></p>
          <button form="login-alt" name="intent" value="reset" className="btn-ghost text-sm font-medium">Change</button>
        </div>
        {state.demoCode && (
          <div className="rounded-xl bg-[var(--color-accent-soft)] px-4 py-3 text-sm">
            <span className="text-[var(--color-muted)]">Demo SMS:</span> your code is <strong className="num text-base tracking-widest">{state.demoCode}</strong>
          </div>
        )}
        {state.info && <p className="text-sm text-[var(--color-muted)]">{state.info}</p>}
        <div>
          <label htmlFor="code" className="label">6-digit code · कोड</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus defaultValue={state.demoCode}
            className="field num text-center text-2xl tracking-[0.5em]" aria-invalid={!!state.error} aria-describedby="code-error" />
          {state.error && <p id="code-error" role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
        </div>
        <button name="intent" value="verify" className="btn btn-primary w-full" disabled={pending}>{pending ? "Checking…" : "Sign in · लॉग इन"}</button>
        <button form="login-alt" name="intent" value="send" className="min-h-11 w-full text-center text-sm text-[var(--color-muted)]" disabled={pending}>
          Send a new code
        </button>
      </form>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <form action={action} className="card space-y-4 p-5" noValidate>
        <div>
          <label htmlFor="phone" className="label">Mobile number · मोबाइल नंबर</label>
          <div className="flex items-stretch gap-2">
            <span className="flex items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-[var(--color-muted)]">+91</span>
            <input
              id="phone" name="phone" inputMode="numeric" autoComplete="tel-national" maxLength={14}
              className="field num text-lg tracking-wide" placeholder="98xxxxxxxx" value={phone || state.phone || ""}
              onChange={(e) => setPhone(e.target.value)} aria-invalid={!!state.error} aria-describedby="phone-error"
            />
          </div>
          {state.error && <p id="phone-error" role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{state.error}</p>}
        </div>
        <button name="intent" value="send" className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending code…" : "Get code · कोड भेजें"}</button>
        <p className="text-xs text-[var(--color-faint)]">We&apos;ll send a 6-digit code by SMS.</p>
      </form>

      {demo.length > 0 && (
        <section aria-labelledby="demo-h" className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] p-4">
          <h2 id="demo-h" className="text-sm font-semibold">Demo accounts</h2>
          <p className="mb-3 text-xs text-[var(--color-muted)]">SMS is mocked in this demo. Tap an account, then Get code: the code appears on screen.</p>
          <ul className="space-y-2">
            {demo.map((d) => (
              <li key={d.phone}>
                <button type="button" onClick={() => setPhone(d.phone)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-[var(--color-surface)] px-3 py-2.5 text-left text-sm ring-1 ring-[var(--color-line)]">
                  <span><span className="font-medium">{d.who}</span><span className="block text-xs text-[var(--color-muted)]">{d.role}</span></span>
                  <span className="num text-[var(--color-muted)]">{d.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
