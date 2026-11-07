import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { CatalogueItem } from "../../../shared/catalogue";
import { pct, rupees } from "../../../shared/money";
import type { Lang } from "../../../shared/i18n";

const L = {
  en: { title: "Choose product", search: "Search products", suggested: "Suggested", substitute: "In stock instead", results: "Products", none: "No product matches that", close: "Close", out: "Out of stock", stock: (n: number) => `${n} in stock`, perCase: "/ case" },
  hi: { title: "सामान चुनें", search: "सामान खोजें", suggested: "सुझाव", substitute: "स्टॉक में यह है", results: "सामान", none: "कुछ नहीं मिला", close: "बंद करें", out: "स्टॉक ख़त्म", stock: (n: number) => `${n} स्टॉक में`, perCase: "/ पेटी" },
};

/**
 * Bottom sheet to pick a product: suggestions first, then search-as-you-type over the catalogue.
 * Replaces a 43-item dropdown that was unusable on a phone.
 */
export function ProductSheet({ lang, catalogue, suggested, substitute, currentId, onPick, onClose }: {
  lang: Lang;
  catalogue: CatalogueItem[];
  suggested: CatalogueItem[];
  substitute?: CatalogueItem;
  currentId: string | null;
  onPick: (id: string, substituted: boolean) => void;
  onClose: () => void;
}) {
  const s = L[lang];
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const results = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return catalogue
      .filter((c) => {
        const hay = `${c.name} ${c.nameHi} ${c.packLabel} ${c.brand} ${c.code} ${c.keywords.join(" ")}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 20);
  }, [catalogue, q]);

  const row = (c: CatalogueItem, substituted = false) => {
    const out = c.stockCases <= 0;
    return (
      <li key={`${substituted ? "s" : ""}${c.id}`}>
        <button type="button" disabled={c.id === currentId} onClick={() => onPick(c.id, substituted)}
          className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left active:opacity-60 disabled:opacity-40">
          <span className="min-w-0">
            <span className="block font-semibold">{lang === "hi" ? c.nameHi : c.name} <span className="font-normal text-[var(--color-muted)]">{c.packLabel}</span></span>
            <span className="num block text-xs text-[var(--color-muted)]">
              {rupees(c.unitPricePaise * c.unitsPerCase)} {s.perCase} + {pct(c.gstRateBp)} GST · {out ? s.out : s.stock(c.stockCases)}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={s.title}>
      <button type="button" className="fade-in absolute inset-0 bg-black/30" aria-label={s.close} onClick={onClose} />
      <div className="fade-in absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-xl flex-col rounded-t-xl bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={onClose} aria-label={s.close}><X size={20} strokeWidth={1.5} /></button>
        </div>
        <label className="relative mx-5 block">
          <span className="sr-only">{s.search}</span>
          <Search size={18} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden />
          <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.search} className="field pl-11" autoComplete="off" />
        </label>
        <div className="overflow-y-auto px-5 pt-2 pb-6">
          {q.trim() ? (
            results.length ? <ul className="divide-y divide-[var(--color-line)]">{results.map((c) => row(c))}</ul> : <p className="py-8 text-center text-[var(--color-muted)]">{s.none}</p>
          ) : (
            <>
              {substitute && (
                <>
                  <p className="mt-4 text-xs text-[var(--color-muted)]">{s.substitute}</p>
                  <ul>{row(substitute, true)}</ul>
                </>
              )}
              {suggested.length > 0 && (
                <>
                  <p className="mt-4 text-xs text-[var(--color-muted)]">{s.suggested}</p>
                  <ul className="divide-y divide-[var(--color-line)]">{suggested.map((c) => row(c))}</ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
