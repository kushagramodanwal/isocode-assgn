import { useEffect } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { CartProvider } from "../../components/cart";
import { ShopNav } from "../../components/ShopNav";
import { LangToggle } from "../../components/LangToggle";
import { useSession } from "../../lib/session";
import { useQuery } from "../../lib/useQuery";
import { dict, type Lang } from "../../../../shared/i18n";
import { rupeesShort } from "../../../../shared/money";
import type { Credit, Me } from "../../../../shared/api";

export type ShopContext = { me: Me; lang: Lang; credit: Credit | null; reloadCredit: () => void };
export const useShop = () => useOutletContext<ShopContext>();

export function ShopLayout() {
  const { me, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const credit = useQuery<Credit>("/shop/credit");
  const { reload } = credit;
  // Credit changes after every order; refresh it whenever the page changes.
  useEffect(() => { reload(); }, [location.pathname, reload]);
  if (!me || !me.retailer) return null;
  const lang = me.lang;
  const t = dict[lang];
  const c = credit.data;
  const over = c ? c.availablePaise < 0 : false;
  return (
    <CartProvider userId={me.id}>
      <div lang={lang} className="mx-auto min-h-dvh max-w-3xl pb-24">
        <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{me.retailer.shopName}</p>
              <p className={`num text-xs ${over ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"}`}>
                {c ? (
                  <>{over ? t.creditOver : t.creditAvailable}: <span className="font-semibold">{rupeesShort(Math.max(0, c.availablePaise))}</span> {t.creditOf(rupeesShort(c.limitPaise))}</>
                ) : <span className="inline-block h-3 w-40 skeleton align-middle" />}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <LangToggle lang={lang} />
              <button className="btn btn-ghost btn-sm" onClick={async () => { await logout(); navigate("/login"); }}>{t.logout}</button>
            </div>
          </div>
        </header>
        <Outlet context={{ me, lang, credit: c, reloadCredit: reload } satisfies ShopContext} />
      </div>
      <ShopNav lang={lang} />
    </CartProvider>
  );
}
