import type { Metadata } from "next";
import { requireDesk } from "@/lib/auth";
import { inactiveRetailers } from "@/server/insights";
import { Empty } from "@/components/Empty";
import { rupeesShort } from "@/lib/money";
import { day } from "@/lib/dates";

export const metadata: Metadata = { title: "Quiet shops" };
export const dynamic = "force-dynamic";

export default async function QuietShops() {
  await requireDesk();
  const quiet = await inactiveRetailers(14);
  return (
    <div>
      <h1 className="text-lg font-bold">No order in 14 days</h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">Quietest first. A call or a salesman visit here is the cheapest sale of the week.</p>
      {quiet.length === 0 ? <Empty title="Every shop ordered in the last 14 days" body="Nothing to chase today." /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {quiet.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.shopName}</p>
                  <p className="text-xs text-[var(--color-muted)]">{r.ownerName} · {r.area}</p>
                  <p className="text-xs text-[var(--color-faint)]">{r.route}</p>
                </div>
                <span className={`pill ${r.daysQuiet === null || r.daysQuiet > 30 ? "pill-danger" : "pill-warn"}`}>{r.daysQuiet === null ? "never ordered" : `${r.daysQuiet} days`}</span>
              </div>
              <p className="num mt-3 text-sm text-[var(--color-muted)]">
                Last order {r.lastOrderAt ? day(r.lastOrderAt) : "—"} · {r.ordersLast60} orders in 60 days · avg {rupeesShort(r.avgOrderPaise)}
              </p>
              <a href={`tel:+91${r.phone}`} className="btn btn-secondary btn-sm mt-3">Call {r.phone}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
