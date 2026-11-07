import { PackArt } from "./PackArt";
import { StatusPill } from "./StatusPill";
import { dict, type Lang } from "../../../shared/i18n";
import { pct, rupees } from "../../../shared/money";
import { when } from "../../../shared/dates";

import type { OrderDto } from "../../../shared/api";

export function OrderDetail({ order, lang }: { order: OrderDto; lang: Lang }) {
  const t = dict[lang];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{t.orderNo(order.number)}</h1>
        <StatusPill status={order.status} lang={lang} />
      </div>
      <p className="text-sm text-[var(--color-muted)]">
        {when(new Date(order.createdAt))} · {order.source === "CAPTURE" ? (lang === "hi" ? "मैसेज से" : "From a message") : (lang === "hi" ? "ऐप से" : "In the app")}
      </p>
      {order.status === "CREDIT_HOLD" && order.holdReason && (
        <p className="rounded-xl bg-[var(--color-warn-soft)] px-4 py-3 text-sm text-[var(--color-warn)]">{order.holdReason}</p>
      )}
      {order.status === "REJECTED" && order.rejectReason && (
        <p className="rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">{order.rejectReason}</p>
      )}
      <ul className="card divide-y divide-[var(--color-line)]">
        {order.lines.map((l) => (
          <li key={l.id} className="flex gap-3 p-3">
            <PackArt code={l.code} kind={l.image} brand={l.brand} label={l.packLabel} size={56} />
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{lang === "hi" ? l.nameHi : l.name} <span className="text-[var(--color-muted)]">{l.packLabel}</span></p>
              <p className="num text-sm text-[var(--color-muted)]">
                {t.cases(l.cases)} × {rupees(l.casePricePaise)}
                {l.freeCases > 0 && <span className="text-[var(--color-accent-fg)]"> · +{l.freeCases} {t.free}</span>}
                {l.discountPaise > 0 && <span className="text-[var(--color-accent-fg)]"> · − {rupees(l.discountPaise)}</span>}
              </p>
              {l.schemeLabel && <p className="text-xs text-[var(--color-accent-fg)]">{l.schemeLabel}</p>}
            </div>
            <div className="num text-right text-sm">
              <p className="font-semibold">{rupees(l.totalPaise)}</p>
              <p className="text-xs text-[var(--color-faint)]">{t.gst} {pct(l.gstRateBp)}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="card num space-y-1.5 p-4 text-sm">
        <div className="flex justify-between"><dt className="text-[var(--color-muted)]">{t.subtotal}</dt><dd>{rupees(order.grossPaise)}</dd></div>
        {order.discountPaise > 0 && <div className="flex justify-between text-[var(--color-accent-fg)]"><dt>{t.discount}</dt><dd>− {rupees(order.discountPaise)}</dd></div>}
        <div className="flex justify-between"><dt className="text-[var(--color-muted)]">{t.taxable}</dt><dd>{rupees(order.taxablePaise)}</dd></div>
        <div className="flex justify-between"><dt className="text-[var(--color-muted)]">{t.gst}</dt><dd>+ {rupees(order.gstPaise)}</dd></div>
        <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-2 text-base"><dt className="font-semibold">{t.total}</dt><dd className="text-lg font-bold">{rupees(order.totalPaise)}</dd></div>
      </dl>
    </div>
  );
}
