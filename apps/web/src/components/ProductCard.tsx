import React from 'react';
import { Package } from 'lucide-react';
import { SchemeBadge, StockBadge } from './Badges';
import { Money } from './Money';
import { Stepper } from './Stepper';

export interface ProductCardProps {
  id: string;
  code: string;
  name: string;
  brand: string;
  imageUrl?: string | null;
  unitPricePaise: string | bigint;
  gstInclusive: boolean;
  stockBand: 'in_stock' | 'low' | 'out';
  onHandCases?: number;
  activeSchemes?: Array<{ description: string }>;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

export function ProductCard({
  code,
  name,
  brand,
  imageUrl,
  unitPricePaise,
  gstInclusive,
  stockBand,
  onHandCases,
  activeSchemes = [],
  quantity,
  onQuantityChange,
}: ProductCardProps) {
  const isOutOfStock = stockBand === 'out';

  return (
    <div className="flex flex-col justify-between bg-bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div>
        {/* Top Badges & Image */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <StockBadge band={stockBand} onHand={onHandCases} />
          <span className="text-xs font-mono text-text-muted bg-bg-subtle px-2 py-0.5 rounded">
            {code}
          </span>
        </div>

        {/* Product Image or Fallback Placeholder (Spec 10.3) */}
        <div className="w-full h-32 bg-stone-100 rounded-lg flex items-center justify-center mb-3 overflow-hidden border border-border/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-400">
              <Package className="w-10 h-10 stroke-[1.5]" />
              <span className="text-[11px] mt-1 font-medium">{brand}</span>
            </div>
          )}
        </div>

        {/* Brand & Name */}
        <div className="mb-2">
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">
            {brand}
          </span>
          <h4 className="text-sm font-bold text-text-main leading-snug line-clamp-2 mt-0.5">
            {name}
          </h4>
        </div>

        {/* Schemes Badges */}
        {activeSchemes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {activeSchemes.map((s, idx) => (
              <SchemeBadge key={idx} description={s.description} />
            ))}
          </div>
        )}
      </div>

      {/* Pricing and Stepper Controls */}
      <div className="pt-3 border-t border-border/60 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-text-muted font-medium">Dealer Price / case</div>
          <div className="flex items-baseline gap-1.5">
            <Money paise={unitPricePaise} className="text-lg text-text-main" />
            <span className="text-[11px] text-text-muted">
              {gstInclusive ? 'incl. GST' : 'excl. GST'}
            </span>
          </div>
        </div>

        <div>
          <Stepper
            value={quantity}
            onChange={onQuantityChange}
            disabled={isOutOfStock}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}
