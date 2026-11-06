"use client";
import { useActionState, useState, useTransition } from "react";
import { rejectAction, releaseHoldAction, type ActionResult } from "@/app/desk/actions";

export function HoldActions({ orderId, canRelease, canReject }: { orderId: string; canRelease: boolean; canReject: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [state, action, rejectPending] = useActionState(rejectAction, { ok: false } as ActionResult);

  if (rejecting && canReject) {
    return (
      <form action={action} className="w-full space-y-2">
        <input type="hidden" name="orderId" value={orderId} />
        <label htmlFor={`reason-${orderId}`} className="label">Reason (the shop will see this)</label>
        <input id={`reason-${orderId}`} name="reason" className="field" maxLength={200} placeholder="e.g. Outstanding must be cleared first" autoFocus />
        {state.message && <p role="alert" className="text-sm text-[var(--color-danger)]">{state.message}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRejecting(false)}>Cancel</button>
          <button className="btn btn-sm btn-danger" disabled={rejectPending}>{rejectPending ? "Rejecting…" : "Reject order"}</button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRelease && (
        <button className="btn btn-sm btn-primary" disabled={pending} onClick={() => start(async () => {
          const r = await releaseHoldAction(orderId);
          setMsg(r.ok ? null : r.message ?? "Failed");
        })}>{pending ? "Releasing…" : "Release hold"}</button>
      )}
      {canReject && <button className="btn btn-sm btn-danger" onClick={() => setRejecting(true)}>Reject</button>}
      {msg && <p role="alert" className="text-sm text-[var(--color-danger)]">{msg}</p>}
    </div>
  );
}
