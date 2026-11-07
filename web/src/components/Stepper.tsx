import { Minus, Plus } from "lucide-react";

/**
 * Quantity control. At zero it is a single "+" so an untouched list stays quiet; after the first
 * tap it becomes − n +. Tapping the number lets you type a bulk quantity. 44px touch targets.
 */
export function Stepper({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max: number; label: string }) {
  if (value <= 0) {
    return (
      <button type="button" onClick={() => onChange(1)} aria-label={`Add ${label}`}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-line)] text-[var(--color-ink)] transition-opacity active:opacity-60 disabled:opacity-40" disabled={max <= 0}>
        <Plus size={18} strokeWidth={1.5} aria-hidden />
      </button>
    );
  }
  return (
    <div className="fade-in flex h-11 items-center rounded-xl border border-[var(--color-line)]" role="group" aria-label={label}>
      <button type="button" className="flex h-11 w-10 items-center justify-center active:opacity-60" onClick={() => onChange(value - 1)} aria-label={`One less ${label}`}>
        <Minus size={16} strokeWidth={1.5} aria-hidden />
      </button>
      <input
        type="text" inputMode="numeric" value={value} aria-label={`${label} cases`}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 3)) || 0)}
        onFocus={(e) => e.currentTarget.select()}
        className="num h-11 w-9 bg-transparent text-center font-semibold outline-none"
      />
      <button type="button" className="flex h-11 w-10 items-center justify-center active:opacity-60 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`One more ${label}`}>
        <Plus size={16} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
