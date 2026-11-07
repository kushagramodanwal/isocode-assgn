import { Link, useLocation } from "react-router-dom";
import { MessageSquareText, ReceiptText, Store } from "lucide-react";
import { dict, type Lang } from "../../../shared/i18n";

/** Three destinations. The cart lives in the cart bar, which appears only when it has items. */
export function ShopNav({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const path = useLocation().pathname;
  const items = [
    { to: "/shop", label: t.shop, Icon: Store, active: path === "/shop" || path.startsWith("/shop/cart") },
    { to: "/shop/capture", label: t.byMessage, Icon: MessageSquareText, active: path.startsWith("/shop/capture") },
    { to: "/shop/orders", label: t.orders, Icon: ReceiptText, active: path.startsWith("/shop/orders") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg)] pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      <ul className="mx-auto grid max-w-xl grid-cols-3">
        {items.map(({ to, label, Icon, active }) => (
          <li key={to}>
            <Link to={to} aria-current={active ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-xs ${active ? "font-semibold text-[var(--color-accent-fg)]" : "text-[var(--color-muted)]"}`}>
              <Icon size={22} strokeWidth={1.5} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
