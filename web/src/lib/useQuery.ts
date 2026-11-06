import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiFailure } from "./api";

export type Query<T> = { data: T | null; error: ApiFailure | null; loading: boolean; reload: () => void };

/** Minimal data hook: loading, error, reload. Ignores responses from stale requests. */
export function useQuery<T>(path: string | null): Query<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (path === null) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then((d) => { if (mine === seq.current) setData(d); })
      .catch((e: unknown) => { if (mine === seq.current) setError(e instanceof ApiFailure ? e : new ApiFailure(0, null)); })
      .finally(() => { if (mine === seq.current) setLoading(false); });
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
