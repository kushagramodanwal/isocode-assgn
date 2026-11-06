import { Link } from "react-router-dom";
import type { ApiFailure } from "../lib/api";

export function Skeleton({ rows = 4, className = "h-28" }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className={`skeleton ${className}`} />)}
    </div>
  );
}

/** Errors say what to do next. Offline is told apart from a server problem. */
export function ErrorState({ error, onRetry }: { error: ApiFailure; onRetry?: () => void }) {
  if (error.status === 404) return <NotFound />;
  return (
    <div role="alert" className="card px-6 py-10 text-center">
      <p className="font-semibold">{error.offline ? "No signal right now · नेटवर्क नहीं है" : "Something went wrong · कुछ गड़बड़ हुई"}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{error.offline ? "Your cart is saved on this phone. Try again when you have signal." : error.message}</p>
      {onRetry && <button className="btn btn-primary mt-5" onClick={onRetry}>Try again · फिर कोशिश करें</button>}
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-[var(--color-muted)]">404</p>
      <h1 className="mt-1 text-xl font-bold">Not found · नहीं मिला</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">This page doesn&apos;t exist, or it belongs to another account.</p>
      <Link to="/" className="btn btn-primary mt-6">Go home</Link>
    </div>
  );
}
