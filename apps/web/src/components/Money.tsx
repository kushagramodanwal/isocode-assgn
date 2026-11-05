import { formatPaiseToRupees } from '@retailer/domain';

interface MoneyProps {
  paise: bigint | string | number;
  className?: string;
  showSymbol?: boolean;
}

export function Money({ paise, className = '', showSymbol = true }: MoneyProps) {
  const formatted = formatPaiseToRupees(paise, { includeSymbol: showSymbol });
  return <span className={`tabular-nums font-semibold ${className}`}>{formatted}</span>;
}
