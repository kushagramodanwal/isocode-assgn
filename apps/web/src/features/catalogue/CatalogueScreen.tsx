import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Search, ShoppingBag } from 'lucide-react';
import { ProductCard } from '../../components/ProductCard';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { useI18n } from '../../i18n';
import { apiRequest } from '../../lib/api';
import { useCart } from '../cart/CartContext';

interface SkuItem {
  id: string;
  code: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  onHandCases: number;
  stockBand: 'in_stock' | 'low' | 'out';
  unitPricePaise: string;
  gstInclusive: boolean;
  activeSchemes: Array<{ description: string }>;
}

export function CatalogueScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { updateQuantity, getItemQuantity, totalCases } = useCart();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery<{
    items: SkuItem[];
  }>({
    queryKey: ['skus', search],
    queryFn: () =>
      apiRequest(`/api/v1/skus${search ? `?q=${encodeURIComponent(search)}` : ''}`),
  });

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-surface p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchCatalogue}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-bg-base text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Stock as of timestamp indicator (Spec 4.3) */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted self-end sm:self-center font-medium bg-bg-subtle px-2.5 py-1.5 rounded-md border border-border/50">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>Stock as of: Live Seed Data</span>
        </div>
      </div>

      {/* 4 States Handling (Spec 10.2) */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-bg-surface p-4 rounded-xl border border-border space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          message={(error as any)?.message || 'Failed to load catalogue items'}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && data?.items?.length === 0 && (
        <EmptyState
          title="No Products Found"
          message={search ? `No products match "${search}".` : 'No items currently in catalogue.'}
          actionLabel={search ? 'Clear Search' : undefined}
          onAction={search ? () => setSearch('') : undefined}
        />
      )}

      {!isLoading && !isError && data?.items && data.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.items.map((sku) => (
            <ProductCard
              key={sku.id}
              id={sku.id}
              code={sku.code}
              name={sku.name}
              brand={sku.brand}
              imageUrl={sku.imageUrl}
              unitPricePaise={sku.unitPricePaise}
              gstInclusive={sku.gstInclusive}
              stockBand={sku.stockBand}
              onHandCases={sku.onHandCases}
              activeSchemes={sku.activeSchemes}
              quantity={getItemQuantity(sku.code)}
              onQuantityChange={(qty) =>
                updateQuantity(sku.code, qty, {
                  name: sku.name,
                  brand: sku.brand,
                  unitPricePaise: sku.unitPricePaise,
                  gstInclusive: sku.gstInclusive,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Sticky Bottom Cart Banner when items in cart */}
      {totalCases > 0 && (
        <div className="sticky bottom-16 sm:bottom-4 left-0 right-0 z-20 mt-6">
          <div className="bg-accent text-white p-3.5 sm:p-4 rounded-xl shadow-lg flex items-center justify-between border border-accent-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-xs uppercase font-medium tracking-wider text-blue-200">
                  Cart Summary
                </div>
                <div className="text-sm font-bold">
                  {totalCases} cases selected
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/cart')}
              className="bg-white text-accent hover:bg-stone-100 font-bold px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition-colors touch-target"
            >
              <span>{t.viewCart}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
