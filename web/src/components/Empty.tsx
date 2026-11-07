/** Empty state: one short sentence and, optionally, one action. Nothing else. */
export function Empty({ title, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      <p className="text-[var(--color-muted)]">{title}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
