import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Search } from "lucide-react";
import type { CatalogueItem } from "../../../../shared/catalogue";
import { toPriced } from "../../../../shared/catalogue";
import { priceCart } from "../../../../shared/pricing";
import { useCart } from "../../components/cart";
import { PackArt } from "../../components/PackArt";
import { Stepper } from "../../components/Stepper";
import { dict, type Lang } from "../../../../shared/i18n";
import { rupeesCompact, rupeesShort } from "../../../../shared/money";
import { schemeText } from "../../../../shared/schemeText";

type Props = {
  lang: Lang;
  name: string;
  availableCreditPaise: number | null;
  items: CatalogueItem[];
  frequent: string[];
  lastOrder: { number: number; lines: { productId: string; cases: number }[] } | null;
};

const LOW_STOCK = 10;

/**
 * Home: a greeting, one reorder button, search, then the list. The shop's usual products come
 * first in the list instead of in a separate section.
 */
export function Catalogue({ lang, name, availableCreditPaise, items, frequent, lastOrder }: Props) {
  const t = dict[lang];
  const cart = useCart();
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const query = useDeferredValue(q.trim().toLowerCase());

  const ordered = useMemo(() => {
    const rank = new Map(frequent.map((id, i) => [id, i]));
    return [...items].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
  }, [items, frequent]);

  const shown = useMemo(() => {
    if (!query) return ordered;
    return ordered.filter((i) => {
      const hay = `${i.name} ${i.nameHi} ${i.brand} ${i.packLabel} ${i.code} ${i.keywords.join(" ")}`.toLowerCase();
      return query.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [ordered, query]);

  const priced = useMemo(() => new Map(items.map((i) => [i.id, toPriced(i)])), [items]);
  // "About ₹X" for the reorder preview: today's prices and schemes, only what is in stock.
  const reorderQuote = useMemo(() => {
    if (!lastOrder) return null;
    const lines = lastOrder.lines.filter((l) => (priced.get(l.productId)?.stockCases ?? 0) > 0);
    return priceCart(lines.map((l) => ({ productId: l.productId, cases: Math.min(l.cases, priced.get(l.productId)!.stockCases) })), priced, new Date());
  }, [lastOrder, priced]);
  const cartEntries = Object.entries(cart.items).filter(([id]) => priced.has(id));
  const quote = useMemo(() => priceCart(cartEntries.map(([productId, cases]) => ({ productId, cases })), priced, new Date()), [cartEntries, priced]);

  function reorder() {
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
    setToast(skipped ? `${t.repeatAdded} · ${skipped} ${t.outOfStock.toLowerCase()}` : t.repeatAdded);
    setTimeout(() => setToast(null), 3000);
  }

  const over = availableCreditPaise !== null && availableCreditPaise < 0;

  return (
    <div className="px-5">
      <section className="pt-4 pb-8">
        <h1 className="text-xl font-semibold">{t.greeting(name.split(" ")[0] ?? name)}</h1>
        <p className={`num mt-1 text-sm ${over ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"}`}>
          {availableCreditPaise === null ? <span className="skeleton inline-block h-4 w-40 align-middle" /> : over ? t.creditOverLine : t.creditLine(rupeesShort(availableCreditPaise))}
        </p>
        {lastOrder && (
          <button onClick={reorder} className="btn btn-primary mt-6 h-auto min-h-16 w-full justify-start gap-4 px-5 py-3 text-left">
            <RotateCcw size={20} strokeWidth={1.5} aria-hidden className="shrink-0" />
            <span className="flex flex-col gap-1">
              <span>{t.reorder}</span>
              <span className="num text-xs font-normal opacity-80">{t.reorderSub(lastOrder.lines.length, rupeesShort(reorderQuote?.totals.totalPaise ?? 0))}</span>
            </span>
          </button>
        )}
      </section>

      <label className="relative block">
        <span className="sr-only">{t.search}</span>
        <Search size={18} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="field pl-11" autoComplete="off" />
      </label>
      <p className="mt-3 text-xs text-[var(--color-muted)]">{t.pricesNote}</p>

      {shown.length === 0 ? (
        <div className="py-16 text-center">
          <p>{t.noResults}</p>
          <Link to="/shop/capture" className="link mt-3 inline-block">{t.byMessage}</Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--color-line)]">
          {shown.map((i) => <ProductRow key={i.id} item={i} lang={lang} items={items} />)}
        </ul>
      )}

      {toast && <div role="status" className="fade-in fixed inset-x-5 bottom-40 z-30 mx-auto max-w-md rounded-xl bg-[var(--color-ink)] px-4 py-3 text-center text-sm text-white">{toast}</div>}

      {quote.lines.length > 0 && (
        <Link to="/shop/cart" className="fade-in fixed inset-x-0 bottom-[76px] z-20 mx-auto flex min-h-12 max-w-[calc(36rem-40px)] items-center justify-between gap-3 rounded-full bg-[var(--color-accent)] px-6 py-2 text-white" style={{ width: "calc(100% - 40px)" }}>
          <span className="num">{t.cartBar(quote.lines.length)} · <span className="font-semibold">{rupeesShort(quote.totals.totalPaise)}</span></span>
          <span className="font-semibold">{t.viewCart}</span>
        </Link>
      )}
    </div>
  );
}

function ProductRow({ item, lang, items }: { item: CatalogueItem; lang: Lang; items: CatalogueItem[] }) {
  const t = dict[lang];
  const cart = useCart();
  const qty = cart.items[item.id] ?? 0;
  const out = item.stockCases <= 0;
  const low = !out && item.stockCases <= LOW_STOCK;
  const sibling = out ? items.find((o) => o.id !== item.id && o.name === item.name && o.stockCases > 0) : undefined;
  const name = lang === "hi" ? item.nameHi : item.name;

  return (
    <li className="py-4">
      <div className="flex items-center gap-4">
        <div className={`flex min-w-0 flex-1 items-center gap-4 ${out ? "opacity-40" : ""}`}>
          <PackArt code={item.code} kind={item.image} brand={item.brand} label={item.packLabel} size={56} />
          <div className="min-w-0">
            <p className="font-semibold">{name} <span className="font-normal text-[var(--color-muted)]">{item.packLabel}</span></p>
            <p className="num text-xs text-[var(--color-muted)]">{t.pricePerPc(item.unitsPerCase, rupeesCompact(item.unitPricePaise))}</p>
            {item.schemes.map((s) => <p key={s.id} className="text-xs text-[var(--color-accent-fg)]">{schemeText(s, lang)}</p>)}
            <p className={`status ${out ? "status-danger" : low ? "status-warn" : "status-ok"}`}>{out ? t.outOfStock : low ? t.stockLow(item.stockCases) : t.stockIn}</p>
          </div>
        </div>
        <Stepper value={out ? 0 : qty} max={out ? 0 : item.stockCases} onChange={(n) => cart.set(item.id, Math.min(n, item.stockCases))} label={`${name} ${item.packLabel}`} />
      </div>
      {sibling && <button className="link mt-2 ml-[72px] text-sm" onClick={() => cart.add(sibling.id, 1)}>{t.tryInstead(`${sibling.packLabel}`)}</button>}
    </li>
  );
}
