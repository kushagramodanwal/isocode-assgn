import type { Metadata } from "next";
import Link from "next/link";
import { requireRetailer } from "@/lib/auth";
import { db } from "@/lib/db";
import { dict } from "@/lib/i18n";
import { ago } from "@/lib/dates";
import { TypeOrderForm } from "./TypeOrderForm";

export const metadata: Metadata = { title: "Type order" };
export const dynamic = "force-dynamic";

export default async function TypeOrderPage() {
  const user = await requireRetailer();
  const t = dict[user.lang];
  const drafts = await db.capture.findMany({
    where: { retailerId: user.retailerId, createdById: user.id, status: "NEEDS_REVIEW" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold">{t.typeTitle}</h1>
      <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">{t.typeHint}</p>
      <TypeOrderForm lang={user.lang} />
      {drafts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">{user.lang === "hi" ? "अधूरे ऑर्डर" : "Not confirmed yet"}</h2>
          <ul className="card divide-y divide-[var(--color-line)]">
            {drafts.map((d) => (
              <li key={d.id}><Link href={`/shop/capture/${d.id}`} className="block px-4 py-3"><p className="line-clamp-1 text-sm">{d.rawText}</p><p className="text-xs text-[var(--color-faint)]">{ago(d.createdAt)}</p></Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
