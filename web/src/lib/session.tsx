import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Me } from "../../../shared/api";
import { api, ApiFailure } from "./api";

type Session = { me: Me | null; ready: boolean; refresh: () => Promise<void>; logout: () => Promise<void> };
const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setMe(await api.get<Me | null>("/me"));
    } catch (e) {
      if (e instanceof ApiFailure && (e.status === 401 || e.status === 403)) setMe(null);
      else if (!(e instanceof ApiFailure && e.offline)) setMe(null);
    } finally {
      setReady(true);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setMe(null);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return <Ctx.Provider value={{ me, ready, refresh, logout }}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
