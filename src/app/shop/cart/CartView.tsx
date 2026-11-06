"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CatalogueItem } from "@/server/catalogue.shared";
import { toPriced } from "@/server/catalogue.shared";
import { priceCart, type LineQuote } from "@/domain/pricing";
import { useCart } from "@/components/cart";
import { PackArt } from "@/components/PackArt";
import { Stepper } from "@/components/Stepper";
import { dict, type Lang } from "@/lib/i18n";
import { pct, rupees } from "@/lib/money";
import { placeOrderAction } from "../actions";

export function CartView({ lang, items, availableCreditPaise }: { lang: Lang; items: CatalogueItem[]; availableCreditPaise: number }) {
  const t = dict[lang];
  const cart = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
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
    return <div className="space-y-3 p-4" aria-busy="true"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-40" /></div>;
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 pt-16 text-center">
        <svg viewBox="0 0 24 24" width="48" height="48" className="mx-auto text-[var(--color-faint)]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 4h2l2 12h11l2-8H6M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z" /></svg>
        <h1 className="mt-4 text-lg font-semibold">{t.cartEmpty}</h1>
        <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--color-muted)]">{t.cartEmptyHint}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/shop" className="btn btn-primary">{t.browse}</Link>
          <Link href="/shop/capture" className="btn btn-secondary">{t.typeOrder}</Link>
        </div>
      </div>
    );
  }

  const over = quote.totals.totalPaise - Math.max(0, availableCreditPaise);

  function place() {
    setError(null);
    start(async () => {
      const r = await placeOrderAction({
        items: quote.lines.map((l) => ({ productId: l.productId, cases: l.cases })),
        idempotencyKey: keyRef.current,
        expectedTotalPaise: quote.totals.totalPaise,
      }).catch(() => ({ ok: false as const, error: "server" as const }));
      if (r.ok) {
        cart.clear();
        router.push(`/shop/orders/${r.orderId}?placed=1`);
        return;
      }
      if (r.error === "changed" || r.error === "blocked") {
        setError(t.changed);
        router.refresh();
      } else {
        setError(online ? t.somethingWrong : t.offlineCart);
      }
    });
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-xl font-bold">{t.cart}</h1>
      <ul className="space-y-3">
        {quote.lines.map((l) => <CartLine key={l.productId} line={l} item={byId.get(l.productId)!} lang={lang} />)}
      </ul>

      <section className="card mt-4 p-4" aria-label="Order total">
        <dl className="num space-y-1.5 text-sm">
          <Row label={t.subtotal} value={rupees(quote.totals.grossPaise)} />
          {quote.totals.discountPaise > 0 && <Row label={t.discount} value={`− ${rupees(quote.totals.discountPaise)}`} accent />}
          <Row label={t.taxable} value={rupees(quote.totals.taxablePaise)} />
          <Row label={t.gst} value={`+ ${rupees(quote.totals.gstPaise)}`} />
          <div className="my-2 border-t border-[var(--color-line)]" />
          <div className="flex items-baseline justify-between text-base">
            <dt className="font-semibold">{t.total}</dt>
            <dd className="text-xl font-bold">{rupees(quote.totals.totalPaise)}</dd>
          </div>
          {quote.totals.freeCases > 0 && (
            <p className="pt-1 text-[var(--color-accent)]">★ {t.freeGoods}: {t.cases(quote.totals.freeCases)} ({rupees(quote.totals.freeGoodsValuePaise)})</p>
          )}
        </dl>
      </section>

      {over > 0 && !quote.blocked && (
        <p className="mt-3 rounded-xl bg-[var(--color-warn-soft)] px-4 py-3 text-sm text-[var(--color-warn)]" role="note">{t.creditWarn(rupees(over))}</p>
      )}
      {!online && <p className="mt-3 rounded-xl bg-[var(--color-warn-soft)] px-4 py-3 text-sm text-[var(--color-warn)]">{t.offlineCart}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="sticky bottom-16 -mx-4 mt-4 bg-[var(--color-bg)] px-4 pt-2 pb-3">
        <button className="btn btn-primary w-full text-lg" disabled={quote.blocked || pending || !online} onClick={place}>
          {pending ? t.placing : `${t.placeOrder} · ${rupees(quote.totals.totalPaise)}`}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-[var(--color-accent)]" : ""}`}>
      <dt className={accent ? "" : "text-[var(--color-muted)]"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CartLine({ line, item, lang }: { line: LineQuote; item: CatalogueItem; lang: Lang }) {
  const t = dict[lang];
  const cart = useCart();
  const name = lang === "hi" ? item.nameHi : item.name;
  const n = line.nudge;
  const blocked = line.blocked;
  return (
    <li className={`card p-3 ${blocked ? "border-[#f1c7c2]" : ""}`}>
      <div className="flex gap-3">
        <PackArt kind={item.image} brand={item.brand} label={item.packLabel} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug">{name} <span className="font-normal text-[var(--color-muted)]">{item.packLabel}</span></h3>
            <button className="text-sm text-[var(--color-muted)] underline-offset-2 hover:underline" onClick={() => cart.set(item.id, 0)}>{t.remove}</button>
          </div>
          <p className="num text-sm text-[var(--color-muted)]">{rupees(line.casePricePaise)} × {line.cases} · {t.plusGst(pct(line.gstRateBp))}</p>
          {line.scheme && (
            <p className="num mt-1 text-sm font-medium text-[var(--color-accent)]">
              ★ {line.scheme.type === "FREE_GOODS" ? `+${t.cases(line.freeCases)} ${t.free}` : `${pct(line.scheme.percentBp)} · − ${rupees(line.discountPaise)}`}
            </p>
          )}
        </div>
      </div>

      {line.issues.includes("OUT_OF_STOCK") && <p className="mt-2 text-sm text-[var(--color-danger)]">{t.issueOut}</p>}
      {line.issues.includes("INSUFFICIENT_STOCK") && <p className="mt-2 text-sm text-[var(--color-danger)]">{t.issueShort(item.stockCases)}</p>}
      {line.issues.includes("FREE_GOODS_SHORT") && <p className="mt-2 text-sm text-[var(--color-warn)]">{t.issueFreeShort}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="num text-lg font-semibold">{blocked ? "—" : rupees(line.totalPaise)}</span>
        {!line.issues.includes("OUT_OF_STOCK") && (
          <Stepper value={cart.items[item.id] ?? line.cases} max={Math.max(item.stockCases, 1)} onChange={(v) => cart.set(item.id, v)} label={`${name} ${item.packLabel}`} />
        )}
      </div>
      {n && (
        <button className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-[var(--color-accent-soft)] px-4 text-left text-sm font-medium text-[var(--color-accent)]" onClick={() => cart.add(item.id, n.addCases)}>
          <span>★ {n.kind === "FREE_GOODS" ? t.nudgeFree(n.addCases, n.freeCases) : t.nudgeSlab(n.addCases, pct(n.percentBp))}</span>
          <span className="shrink-0 font-bold">{t.addNudge(n.addCases)}</span>
        </button>
      )}
    </li>
  );
}
