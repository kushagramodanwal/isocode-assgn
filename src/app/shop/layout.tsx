import { requireRetailer } from "@/lib/auth";
import { creditStatus } from "@/server/credit";
import { CartProvider } from "@/components/cart";
import { ShopNav } from "@/components/ShopNav";
import { LangToggle } from "@/components/LangToggle";
import { rupeesShort } from "@/lib/money";
import { dict } from "@/lib/i18n";
import { logout } from "../login/actions";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRetailer();
  const credit = await creditStatus(user.retailerId);
  const t = dict[user.lang];
  const over = credit.availablePaise < 0;
  return (
    <CartProvider userId={user.id}>
      <div lang={user.lang} className="mx-auto min-h-dvh max-w-3xl pb-24">
        <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.retailer.shopName}</p>
              <p className={`num text-xs ${over ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"}`}>
                {over ? t.creditOver : t.creditAvailable}: <span className="font-semibold">{rupeesShort(Math.max(0, credit.availablePaise))}</span> {t.creditOf(rupeesShort(credit.limitPaise))}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <LangToggle lang={user.lang} />
              <form action={logout}><button className="btn btn-ghost btn-sm">{t.logout}</button></form>
            </div>
          </div>
        </header>
        {children}
      </div>
      <ShopNav lang={user.lang} />
    </CartProvider>
  );
}
