import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CatalogueItem } from "../../../../shared/catalogue";
import { useCart } from "../../components/cart";
import { PackArt } from "../../components/PackArt";
import { Stepper } from "../../components/Stepper";
import { dict, type Lang } from "../../../../shared/i18n";
import { pct, rupees } from "../../../../shared/money";
import { schemeText } from "../../../../shared/schemeText";

type Props = {
  lang: Lang;
  items: CatalogueItem[];
  frequent: string[];
  lastOrder: { number: number; lines: { productId: string; cases: number }[] } | null;
};

const LOW_STOCK = 10;

export function Catalogue({ lang, items, frequent, lastOrder }: Props) {
  const t = dict[lang];
  const cart = useCart();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | "food" | "home">("all");
  const [toast, setToast] = useState<string | null>(null);
  const query = useDeferredValue(q.trim().toLowerCase());

  const shown = useMemo(() => {
    return items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!query) return true;
      const hay = `${i.name} ${i.nameHi} ${i.brand} ${i.packLabel} ${i.code} ${i.keywords.join(" ")}`.toLowerCase();
      return query.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [items, cat, query]);

  const frequentItems = frequent.map((id) => items.find((i) => i.id === id)).filter((x): x is CatalogueItem => !!x);
  const showFrequent = !query && cat === "all" && frequentItems.length > 0;

  function repeatLast() {
    if (!lastOrder) return;
    const stock = new Map(items.map((i) => [i.id, i.stockCases]));
    const next = { ...cart.items };
    let skipped = 0;
    for (const l of lastOrder.lines) {
      const s = stock.get(l.productId) ?? 0;
      if (s <= 0) { skipped++; continue; }
      next[l.productId] = Math.min(s, Math.max(next[l.productId] ?? 0, l.cases));
    }
    cart.replace(next);
    setToast(skipped ? `${t.repeatAdded} · ${skipped} × ${t.outOfStock}` : t.repeatAdded);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="px-4 pt-4">
      <div className="sticky top-[61px] z-[5] -mx-4 bg-[var(--color-bg)] px-4 pb-3">
        <label className="sr-only" htmlFor="search">{t.search}</label>
        <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="field" autoComplete="off" />
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Category">
          {(["all", "food", "home"] as const).map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
              className={`btn btn-sm shrink-0 ${cat === c ? "btn-primary" : "btn-secondary"}`}>
              {c === "all" ? t.all : c === "food" ? t.food : t.home}
            </button>
          ))}
        </div>
      </div>
      {lastOrder && !query && (
        <button onClick={repeatLast} className="card mb-4 flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left">
          <span><span className="font-semibold">↻ {t.repeatLast}</span><span className="block text-xs text-[var(--color-muted)]">{t.orderNo(lastOrder.number)} · {t.items(lastOrder.lines.length)}</span></span>
          <span className="text-[var(--color-accent)]" aria-hidden>+</span>
        </button>
      )}

      <p className="mb-3 text-xs text-[var(--color-muted)]">{t.gstNote} {t.pricesPrivate}</p>

      {showFrequent && (
        <section aria-labelledby="freq" className="mb-6">
          <h2 id="freq" className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{t.frequently}</h2>
          <ul className="space-y-3">{frequentItems.map((i) => <ProductRow key={`f-${i.id}`} item={i} lang={lang} items={items} />)}</ul>
        </section>
      )}

      {shown.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium">{t.noResults}</p>
          <Link to="/shop/capture" className="btn btn-secondary mt-4">{t.typeOrder}</Link>
        </div>
      ) : (
        <section aria-label={t.catalogue}>
          {showFrequent && <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{t.all}</h2>}
          <ul className="space-y-3">{shown.map((i) => <ProductRow key={i.id} item={i} lang={lang} items={items} />)}</ul>
        </section>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md rounded-xl bg-[var(--color-ink)] px-4 py-3 text-center text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function ProductRow({ item, lang, items }: { item: CatalogueItem; lang: Lang; items: CatalogueItem[] }) {
  const t = dict[lang];
  const cart = useCart();
  const qty = cart.items[item.id] ?? 0;
  const casePrice = item.unitPricePaise * item.unitsPerCase;
  const out = item.stockCases <= 0;
  const special = item.unitPricePaise < item.basePricePaise;
  const sibling = out ? items.find((o) => o.id !== item.id && o.name === item.name && o.stockCases > 0) : undefined;
  const name = lang === "hi" ? item.nameHi : item.name;

  return (
    <li className={`card flex gap-3 p-3 ${out ? "opacity-90" : ""}`}>
      <PackArt kind={item.image} brand={item.brand} label={item.packLabel} size={84} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug">{name} <span className="font-normal text-[var(--color-muted)]">{item.packLabel}</span></h3>
            <p className="text-xs text-[var(--color-faint)]">{item.brand} · {t.packsPerCase(item.unitsPerCase)}</p>
          </div>
        </div>
        <p className="num mt-1.5">
          <span className="text-lg font-bold">{rupees(casePrice)}</span>
          <span className="text-sm text-[var(--color-muted)]"> {t.perCase}</span>
          <span className="ml-1 text-xs text-[var(--color-muted)]">{t.plusGst(pct(item.gstRateBp))}</span>
        </p>
        <p className="num text-xs text-[var(--color-muted)]">{t.perPack(rupees(item.unitPricePaise))}{special && <span className="pill pill-accent ml-2">{t.yourPrice}</span>}</p>
        {item.schemes.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.schemes.map((s) => <span key={s.id} className="pill pill-accent">★ {schemeText(s, lang)}</span>)}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          {out ? (
            <span className="pill pill-danger">{t.outOfStock}</span>
          ) : item.stockCases <= LOW_STOCK ? (
            <span className="pill pill-warn">{t.lowStock(item.stockCases)}</span>
          ) : (
            <span className="text-xs text-[var(--color-faint)]">{t.inStock(item.stockCases)}</span>
          )}
          {out ? (
            sibling ? (
              <button className="btn btn-secondary btn-sm" onClick={() => cart.add(sibling.id, 1)}>+ {sibling.packLabel}</button>
            ) : null
          ) : qty > 0 ? (
            <Stepper value={qty} max={item.stockCases} onChange={(n) => cart.set(item.id, Math.min(n, item.stockCases))} label={`${name} ${item.packLabel}`} />
          ) : (
            <button className="btn btn-primary min-w-24" onClick={() => cart.set(item.id, 1)} aria-label={`${t.add} ${name} ${item.packLabel}`}>{t.add}</button>
          )}
        </div>
      </div>
    </li>
  );
}
