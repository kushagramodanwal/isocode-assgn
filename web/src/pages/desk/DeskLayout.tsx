import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DeskNav } from "../../components/DeskNav";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useSession } from "../../lib/session";
import { useQuery } from "../../lib/useQuery";
import type { DeskSummary } from "../../../../shared/api";

export function DeskLayout() {
  const { me, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const summary = useQuery<DeskSummary>("/desk/summary");
  const { reload } = summary;
  useEffect(() => { reload(); }, [location.pathname, reload]);
  const s = summary.data;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-bg)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <p className="font-semibold">Company A <span className="font-normal text-[var(--color-muted)]">· Order desk</span></p>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden text-[var(--color-muted)] sm:inline">{me?.name}</span>
              <ThemeToggle />
              <button className="btn btn-ghost btn-sm" onClick={async () => { await logout(); navigate("/login"); }}>Log out</button>
            </div>
          </div>
          <DeskNav counts={{ inbox: s ? s.captures.length + s.holds.length : 0, export: s?.ready.count ?? 0 }} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
