import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MAX_CASES_PER_LINE } from "../../../shared/pricing";

type Items = Record<string, number>;
type Cart = {
  items: Items;
  ready: boolean;
  count: number;
  set: (productId: string, cases: number) => void;
  add: (productId: string, cases: number) => void;
  replace: (items: Items) => void;
  clear: () => void;
};

const Ctx = createContext<Cart | null>(null);

/**
 * The cart lives on the phone (localStorage), so tapping + is instant on 3G and nothing is lost
 * when signal drops. The server re-prices everything when the order is placed.
 */
export function CartProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const key = `cart:v1:${userId}`;
  const [items, setItems] = useState<Items>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object") {
          const clean: Items = {};
          for (const [k, v] of Object.entries(parsed)) if (typeof v === "number" && Number.isInteger(v) && v > 0) clean[k] = Math.min(v, MAX_CASES_PER_LINE);
          setItems(clean);
        }
      }
    } catch {
      /* private mode or corrupted: start empty */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* storage full or blocked: cart still works for this visit */
    }
  }, [items, ready, key]);

  const set = useCallback((id: string, cases: number) => {
    setItems((prev) => {
      const next = { ...prev };
      const n = Math.max(0, Math.min(MAX_CASES_PER_LINE, Math.floor(cases || 0)));
      if (n === 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }, []);
  const add = useCallback((id: string, cases: number) => setItems((prev) => {
    const n = Math.max(0, Math.min(MAX_CASES_PER_LINE, (prev[id] ?? 0) + cases));
    const next = { ...prev };
    if (n === 0) delete next[id];
    else next[id] = n;
    return next;
  }), []);
  const replace = useCallback((next: Items) => setItems(next), []);
  const clear = useCallback(() => setItems({}), []);

  const value = useMemo(
    () => ({ items, ready, count: Object.keys(items).length, set, add, replace, clear }),
    [items, ready, set, add, replace, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): Cart {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
