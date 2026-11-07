import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiFailure } from "../../lib/api";
import { useQuery } from "../../lib/useQuery";
import { MediaCapture } from "../../components/MediaCapture";
import type { AppConfig } from "../../../../shared/api";

type R = { id: string; shopName: string; area: string; phone: string; code: string };

export function NewCapturePage() {
  const navigate = useNavigate();
  const retailers = useQuery<R[]>("/desk/retailers");
  const config = useQuery<AppConfig>("/config");
  const [retailerId, setRetailerId] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { id } = await api.post<{ id: string }>("/captures", { retailerId, text });
      navigate(`/desk/capture/${id}`);
    } catch (e) {
      setError(e instanceof ApiFailure ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-bold">Add a WhatsApp order</h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">Paste the text, or add the photo of a list or a voice note. The reader drafts the lines; nothing is ordered until you confirm.</p>
      <form className="card space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div>
          <label htmlFor="retailerId" className="label">Shop (matched from the sender&apos;s number)</label>
          <select id="retailerId" className="field" value={retailerId} onChange={(e) => setRetailerId(e.target.value)} disabled={!retailers.data}>
            <option value="" disabled>{retailers.data ? "Choose a shop…" : "Loading shops…"}</option>
            {retailers.data?.map((r) => <option key={r.id} value={r.id}>{r.shopName} · {r.area} · {r.phone}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="text" className="label">Message</label>
          <textarea id="text" className="field" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo…" />
        </div>
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !retailerId || text.trim().length < 3}>{busy ? "Reading the message…" : "Read message"}</button>
      </form>
      <div className="card mt-4 p-5">
        <MediaCapture lang="en" enabled={!!config.data?.mediaCapture} retailerId={retailerId} allowAudioFile onCreated={(id) => navigate(`/desk/capture/${id}`)} />
      </div>
    </div>
  );
}
