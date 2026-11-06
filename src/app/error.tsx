"use client";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-bold">Something went wrong · कुछ गड़बड़ हुई</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Check your signal and try again. Your cart is saved on this phone.</p>
      {error.digest && <p className="mt-2 text-xs text-[var(--color-faint)]">Ref: {error.digest}</p>}
      <button onClick={reset} className="btn btn-primary mt-6">Try again · फिर कोशिश करें</button>
    </main>
  );
}
