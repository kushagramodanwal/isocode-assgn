"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DeskNav({ counts }: { counts: { inbox: number; export: number } }) {
  const path = usePathname();
  const items = [
    { href: "/desk", label: "Inbox", n: counts.inbox, active: path === "/desk" || path.startsWith("/desk/capture") },
    { href: "/desk/orders", label: "Orders", active: path.startsWith("/desk/orders") },
    { href: "/desk/export", label: "Tally export", n: counts.export, active: path.startsWith("/desk/export") },
    { href: "/desk/loading", label: "Van loading", active: path.startsWith("/desk/loading") },
    { href: "/desk/retailers", label: "Quiet shops", active: path.startsWith("/desk/retailers") },
  ];
  return (
    <nav aria-label="Desk" className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={i.active ? "page" : undefined}
              className={`flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap ${i.active ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}>
              {i.label}
              {!!i.n && <span className="num rounded-full bg-[var(--color-accent)] px-1.5 text-[11px] leading-5 text-white">{i.n}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
