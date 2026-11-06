import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-[var(--color-muted)]">404</p>
      <h1 className="mt-1 text-xl font-bold">Not found · नहीं मिला</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">This page doesn&apos;t exist, or it belongs to another account.</p>
      <Link href="/" className="btn btn-primary mt-6">Go home</Link>
    </main>
  );
}
