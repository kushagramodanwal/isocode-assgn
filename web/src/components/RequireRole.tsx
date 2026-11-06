import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../lib/session";
import type { Role } from "../../../shared/api";

/** UX guard only: the API enforces roles on every request. */
export function RequireRole({ role }: { role: Role }) {
  const { me, ready } = useSession();
  if (!ready) return <div className="p-4"><div className="skeleton h-12" /></div>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== role) return <Navigate to={me.role === "DESK" ? "/desk" : "/shop"} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { me, ready } = useSession();
  if (!ready) return null;
  return <Navigate to={!me ? "/login" : me.role === "DESK" ? "/desk" : "/shop"} replace />;
}
