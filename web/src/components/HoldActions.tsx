import { useState } from "react";
import { api, ApiFailure } from "../lib/api";

/** Release a credit hold, or reject with a reason the shop will see. Calls onDone so the page reloads. */
export function HoldActions({ orderId, canRelease, canReject, onDone }: { orderId: string; canRelease: boolean; canReject: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setMsg(e instanceof ApiFailure ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (rejecting && canReject) {
    return (
      <form className="w-full space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => api.post(`/desk/orders/${orderId}/reject`, { reason })); }}>
        <label htmlFor={`reason-${orderId}`} className="label">Reason (the shop will see this)</label>
        <input id={`reason-${orderId}`} value={reason} onChange={(e) => setReason(e.target.value)} className="field" maxLength={200} placeholder="e.g. Outstanding must be cleared first" autoFocus />
        {msg && <p role="alert" className="text-sm text-[var(--color-danger)]">{msg}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRejecting(false)}>Cancel</button>
          <button className="btn btn-sm btn-danger" disabled={busy}>{busy ? "Rejecting…" : "Reject order"}</button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRelease && (
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => run(() => api.post(`/desk/orders/${orderId}/release`))}>
          {busy ? "Releasing…" : "Release hold"}
        </button>
      )}
      {canReject && <button className="btn btn-sm btn-danger" onClick={() => setRejecting(true)}>Reject</button>}
      {msg && <p role="alert" className="text-sm text-[var(--color-danger)]">{msg}</p>}
    </div>
  );
}
