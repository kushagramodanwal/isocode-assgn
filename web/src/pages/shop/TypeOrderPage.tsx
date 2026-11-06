import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiFailure } from "../../lib/api";
import { useQuery } from "../../lib/useQuery";
import { useShop } from "./ShopLayout";
import { dict } from "../../../../shared/i18n";
import { ago } from "../../../../shared/dates";

export function TypeOrderPage() {
  const { lang } = useShop();
  const t = dict[lang];
  const navigate = useNavigate();
  const drafts = useQuery<{ id: string; rawText: string; createdAt: string }[]>("/shop/captures");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const { id } = await api.post<{ id: string }>("/captures", { text });
      navigate(`/shop/capture/${id}`);
    } catch (e) {
      setError(e instanceof ApiFailure ? (e.offline ? t.offlineCart : e.message) : t.somethingWrong);
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold">{t.typeTitle}</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">{t.typeHint}</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label htmlFor="text" className="sr-only">{t.typeTitle}</label>
        <textarea id="text" className="field" maxLength={2000} placeholder={t.typePlaceholder} value={text} onChange={(e) => setText(e.target.value)} aria-describedby="text-error" />
        {error && <p id="text-error" role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || text.trim().length < 3}>{busy ? t.reading : t.readOrder}</button>
      </form>
      {drafts.data && drafts.data.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{lang === "hi" ? "अधूरे ऑर्डर" : "Not confirmed yet"}</h2>
          <ul className="card divide-y divide-[var(--color-line)]">
            {drafts.data.map((d) => (
              <li key={d.id}><Link to={`/shop/capture/${d.id}`} className="block px-4 py-3"><p className="line-clamp-1 text-sm">{d.rawText}</p><p className="text-xs text-[var(--color-faint)]">{ago(new Date(d.createdAt))}</p></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
