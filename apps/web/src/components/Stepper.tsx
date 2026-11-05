import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  disabled = false,
}: StepperProps) {
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-bg-surface shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min || disabled}
        aria-label="Decrease quantity"
        className="w-12 h-12 flex items-center justify-center text-text-main hover:bg-bg-subtle active:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-target"
      >
        <Minus className="w-5 h-5 stroke-[2.5]" />
      </button>

      <span className="w-12 text-center font-bold text-base tabular-nums text-text-main select-none">
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max || disabled}
        aria-label="Increase quantity"
        className="w-12 h-12 flex items-center justify-center text-text-main hover:bg-bg-subtle active:bg-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-target"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
}
