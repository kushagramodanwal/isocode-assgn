"use client";
import { useActionState } from "react";
import { createDeskCapture, type CreateState } from "@/app/capture/actions";

type R = { id: string; shopName: string; area: string; phone: string; code: string };

export function NewCaptureForm({ retailers }: { retailers: R[] }) {
  const [state, action, pending] = useActionState(createDeskCapture, {} as CreateState);
  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label htmlFor="retailerId" className="label">Shop (matched from the sender&apos;s number)</label>
        <select id="retailerId" name="retailerId" className="field" defaultValue="" required>
          <option value="" disabled>Choose a shop…</option>
          {retailers.map((r) => <option key={r.id} value={r.id}>{r.shopName} · {r.area} · {r.phone}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="text" className="label">Message</label>
        <textarea id="text" name="text" className="field" maxLength={2000} defaultValue={state.text} placeholder="bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo…" required />
      </div>
      {state.error && <p role="alert" className="text-sm text-[var(--color-danger)]">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Reading the message…" : "Read message"}</button>
    </form>
  );
}
