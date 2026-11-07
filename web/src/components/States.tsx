import { Link } from "react-router-dom";
import type { ApiFailure } from "../lib/api";


export function Skeleton({ rows = 4, className = "h-28" }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className={`skeleton ${className}`} />)}
    </div>
  );
}

/** One friendly line and "Try again". Offline is told apart from a server problem. */
export function ErrorState({ error, onRetry }: { error: ApiFailure; onRetry?: () => void }) {
  if (error.status === 404) return <NotFound />;
  return (
    <p role="alert" className="py-12 text-center">
      <span className="text-[var(--color-muted)]">{error.offline ? "No signal right now. · नेटवर्क नहीं है।" : "Something went wrong. · कुछ गड़बड़ हुई।"}</span>{" "}
      {onRetry && <button type="button" className="link min-h-12" onClick={onRetry}>Try again · फिर कोशिश करें</button>}
    </p>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-[var(--color-muted)]">This page isn&apos;t here. · यह पेज नहीं मिला।</p>
      <Link to="/" className="link mt-3 min-h-12">Go home · होम पर जाएँ</Link>
    </div>
  );
}
