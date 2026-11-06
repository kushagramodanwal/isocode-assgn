"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./cart";
import { dict, type Lang } from "@/lib/i18n";

const icons = {
  catalogue: <path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z" />,
  type: <path d="M4 5h16v11H8l-4 4zM8 9h8M8 12h5" />,
  orders: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  cart: <path d="M3 4h2l2 12h11l2-8H6M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z" />,
};

export function ShopNav({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const path = usePathname();
  const { count } = useCart();
  const items = [
    { href: "/shop", label: t.catalogue, icon: icons.catalogue, active: path === "/shop" },
    { href: "/shop/capture", label: t.typeOrder, icon: icons.type, active: path.startsWith("/shop/capture") },
    { href: "/shop/orders", label: t.orders, icon: icons.orders, active: path.startsWith("/shop/orders") },
    { href: "/shop/cart", label: t.cart, icon: icons.cart, active: path.startsWith("/shop/cart"), badge: count },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Main">
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={i.active ? "page" : undefined}
              className={`relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${i.active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}`}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{i.icon}</svg>
              {i.label}
              {!!i.badge && (
                <span className="num absolute top-2 left-1/2 ml-2 min-w-5 rounded-full bg-[var(--color-accent)] px-1.5 text-center text-[11px] leading-5 text-white" aria-label={`${i.badge} items`}>{i.badge}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
