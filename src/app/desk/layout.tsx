import { requireDesk } from "@/lib/auth";
import { db } from "@/lib/db";
import { DeskNav } from "@/components/DeskNav";
import { logout } from "../login/actions";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDesk();
  const [inbox, holds, ready] = await Promise.all([
    db.capture.count({ where: { status: "NEEDS_REVIEW" } }),
    db.order.count({ where: { status: "CREDIT_HOLD" } }),
    db.order.count({ where: { status: "CONFIRMED" } }),
  ]);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <p className="font-semibold">Company A <span className="font-normal text-[var(--color-muted)]">· Order desk</span></p>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden text-[var(--color-muted)] sm:inline">{user.name}</span>
              <form action={logout}><button className="btn btn-ghost btn-sm">Log out</button></form>
            </div>
          </div>
          <DeskNav counts={{ inbox: inbox + holds, export: ready }} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
