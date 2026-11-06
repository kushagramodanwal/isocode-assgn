/** Big - / qty / + control. Typing a number is allowed for bulk quantities. */
export function Stepper({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max: number; label: string }) {
  return (
    <div className="flex items-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]" role="group" aria-label={label}>
      <button type="button" className="h-12 w-12 text-2xl leading-none text-[var(--color-accent)]" onClick={() => onChange(value - 1)} aria-label={`Remove one case of ${label}`}>−</button>
      <input
        type="text" inputMode="numeric" value={value} aria-label={`${label} cases`}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 3)) || 0)}
        onFocus={(e) => e.currentTarget.select()}
        className="num h-12 w-12 bg-transparent text-center text-lg font-semibold outline-none"
      />
      <button type="button" className="h-12 w-12 text-2xl leading-none text-[var(--color-accent)] disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Add one case of ${label}`}>+</button>
    </div>
  );
}
