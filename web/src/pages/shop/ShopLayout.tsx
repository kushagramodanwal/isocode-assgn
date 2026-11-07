import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { CartProvider } from "../../components/cart";
import { ShopNav } from "../../components/ShopNav";
import { LangToggle } from "../../components/LangToggle";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useSession } from "../../lib/session";
import { useQuery } from "../../lib/useQuery";
import { dict, type Lang } from "../../../../shared/i18n";
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
  return (
    <CartProvider userId={me.id}>
      <div lang={lang} className="mx-auto min-h-dvh max-w-xl pb-40">
        <header className="flex min-h-14 items-center justify-between gap-3 px-5 py-1">
          <p className="min-w-0 text-sm font-semibold">{me.retailer.shopName}</p>
          <div className="flex shrink-0 items-center">
            <LangToggle lang={lang} />
            <ThemeToggle lang={lang} />
            <button className="flex h-12 w-11 items-center justify-center text-[var(--color-muted)] active:opacity-60" aria-label={t.logout} title={t.logout} onClick={async () => { await logout(); navigate("/login"); }}>
              <LogOut size={18} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </header>
        <Outlet context={{ me, lang, credit: credit.data, reloadCredit: reload } satisfies ShopContext} />
      </div>
      <ShopNav lang={lang} />
    </CartProvider>
  );
}
