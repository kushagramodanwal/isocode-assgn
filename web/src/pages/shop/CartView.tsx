import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import type { CatalogueItem } from "../../../../shared/catalogue";
import { toPriced } from "../../../../shared/catalogue";
import { priceCart, type LineQuote } from "../../../../shared/pricing";
import { useCart } from "../../components/cart";
import { PackArt } from "../../components/PackArt";
import { Stepper } from "../../components/Stepper";
import { dict, type Lang } from "../../../../shared/i18n";
import { pct, rupees } from "../../../../shared/money";
import { api, ApiFailure } from "../../lib/api";
import type { PlaceOrderResult } from "../../../../shared/api";

export function CartView({ lang, items, availableCreditPaise, onChanged }: { lang: Lang; items: CatalogueItem[]; availableCreditPaise: number; onChanged: () => void }) {
  const t = dict[lang];
  const cart = useCart();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const priced = useMemo(() => new Map(items.map((i) => [i.id, toPriced(i)])), [items]);

  const entries = Object.entries(cart.items).filter(([id]) => byId.has(id));
  const quote = useMemo(() => priceCart(entries.map(([productId, cases]) => ({ productId, cases })), priced, new Date()), [entries, priced]);

  // One key per version of the cart: a double tap or a retry on bad signal can't create two orders.
  const keyRef = useRef<string>("");
  const cartSig = JSON.stringify(cart.items);
  useEffect(() => { keyRef.current = crypto.randomUUID(); }, [cartSig]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  if (!cart.ready) {
    return <div className="space-y-4 px-5 pt-4" aria-busy="true"><div className="skeleton h-7 w-24" /><div className="skeleton h-16" /><div className="skeleton h-16" /><div className="skeleton h-32" /></div>;
  }

  if (entries.length === 0) {
    return (
      <div className="px-5 pt-20 text-center">
        <p>{t.cartEmpty}</p>
        <Link to="/shop" className="link mt-3 inline-block">{t.browse}</Link>
      </div>
    );
  }

  const over = quote.totals.totalPaise - Math.max(0, availableCreditPaise);

  async function place() {
    setError(null);
    setPending(true);
    try {
      const r = await api.post<PlaceOrderResult>("/shop/orders", {
        items: quote.lines.map((l) => ({ productId: l.productId, cases: l.cases })),
        idempotencyKey: keyRef.current,
        expectedTotalPaise: quote.totals.totalPaise,
      });
      if (r.ok) {
        cart.clear();
        navigate(`/shop/orders/${r.orderId}?placed=1`);
        return;
      }
      // Prices or stock moved under us: reload the catalogue and show the new total.
      setError(t.changed);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiFailure && e.offline ? t.offlineCart : t.somethingWrong);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="px-5 pt-2">
      <h1 className="text-xl font-semibold">{t.cart}</h1>
      <ul className="mt-2 divide-y divide-[var(--color-line)]">
        {quote.lines.map((l) => <CartLine key={l.productId} line={l} item={byId.get(l.productId)!} lang={lang} />)}
      </ul>

      <section className="section mt-8 p-5" aria-label={t.total}>
        <dl className="num space-y-2 text-sm text-[var(--color-muted)]">
          <Row label={t.subtotal} value={rupees(quote.totals.grossPaise)} />
          {quote.totals.discountPaise > 0 && <Row label={t.discount} value={`−\u00a0${rupees(quote.totals.discountPaise)}`} />}
          <Row label={t.gst} value={rupees(quote.totals.gstPaise)} />
          {quote.totals.freeCases > 0 && <Row label={t.freeGoods} value={`${t.cases(quote.totals.freeCases)} · ${rupees(quote.totals.freeGoodsValuePaise)}`} />}
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-[var(--color-line)] pt-4">
          <span>{t.total}</span>
          <span className="num text-2xl font-semibold">{rupees(quote.totals.totalPaise)}</span>
        </div>
      </section>

      {over > 0 && !quote.blocked && <p className="status status-warn mt-4 whitespace-normal">{t.creditWarn(rupees(over))}</p>}
      {!online && <p className="status status-warn mt-4 whitespace-normal">{t.offlineCart}</p>}
      {error && <p role="alert" className="status status-danger mt-4 whitespace-normal">{error}</p>}

      <div className="sticky bottom-16 -mx-5 mt-6 bg-white px-5 pt-2 pb-4">
        <button className="btn btn-primary h-14 w-full" disabled={quote.blocked || pending || !online} onClick={place}>
          {pending ? t.placing : t.placeOrder}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

function CartLine({ line, item, lang }: { line: LineQuote; item: CatalogueItem; lang: Lang }) {
  const t = dict[lang];
  const cart = useCart();
  const name = lang === "hi" ? item.nameHi : item.name;
  const n = line.nudge;
  const out = line.issues.includes("OUT_OF_STOCK");
  return (
    <li className="py-4">
      <div className="flex items-center gap-4">
        <div className={`flex min-w-0 flex-1 items-center gap-4 ${out ? "opacity-40" : ""}`}>
          <PackArt code={item.code} kind={item.image} brand={item.brand} label={item.packLabel} size={56} />
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{name} <span className="font-normal text-[var(--color-muted)]">{item.packLabel}</span></p>
            <p className="num text-xs text-[var(--color-muted)]">{t.cases(line.cases)}{!line.blocked && ` · ${rupees(line.totalPaise)}`}</p>
          </div>
        </div>
        {out ? (
          <button className="link shrink-0 text-sm" onClick={() => cart.set(item.id, 0)}>{t.remove}</button>
        ) : (
          <Stepper value={cart.items[item.id] ?? line.cases} max={Math.max(item.stockCases, 1)} onChange={(v) => cart.set(item.id, v)} label={`${name} ${item.packLabel}`} />
        )}
      </div>
      {line.scheme && (
        <p className="num mt-2 pl-[72px] text-xs text-[var(--color-accent)]">
          {line.scheme.type === "FREE_GOODS" ? t.freeAdded(line.freeCases) : `${t.offApplied(pct(line.scheme.percentBp))}\u00a0·\u00a0−\u00a0${rupees(line.discountPaise)}`}
        </p>
      )}
      {out && <p className="status status-danger mt-2 pl-[72px]">{t.issueOut}</p>}
      {line.issues.includes("INSUFFICIENT_STOCK") && <p className="status status-danger mt-2 pl-[72px]">{t.issueShort(item.stockCases)}</p>}
      {line.issues.includes("FREE_GOODS_SHORT") && <p className="status status-warn mt-2 pl-[72px] whitespace-normal">{t.issueFreeShort}</p>}
      {n && (
        <button className="mt-2 ml-[72px] text-left text-sm text-[var(--color-accent)] active:opacity-60" onClick={() => cart.add(item.id, n.addCases)}>
          {n.kind === "FREE_GOODS" ? t.nudgeFree(n.addCases, n.freeCases) : t.nudgeSlab(n.addCases, pct(n.percentBp))} <span className="font-semibold">· {t.addMore(n.addCases)}</span>
        </button>
      )}
    </li>
  );
}
