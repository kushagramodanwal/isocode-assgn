import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CartItem {
  skuCode: string;
  name: string;
  brand: string;
  cases: number;
  unitPricePaise: string;
  gstInclusive: boolean;
}

interface CartContextType {
  items: CartItem[];
  updateQuantity: (
    skuCode: string,
    cases: number,
    meta?: { name: string; brand: string; unitPricePaise: string; gstInclusive: boolean }
  ) => void;
  getItemQuantity: (skuCode: string) => number;
  clearCart: () => void;
  totalCases: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  updateQuantity: () => {},
  getItemQuantity: () => 0,
  clearCart: () => {},
  totalCases: 0,
});

const STORAGE_KEY = 'jabalpur_fmcg_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const updateQuantity = (
    skuCode: string,
    cases: number,
    meta?: { name: string; brand: string; unitPricePaise: string; gstInclusive: boolean }
  ) => {
    setItems((prev) => {
      if (cases <= 0) {
        return prev.filter((i) => i.skuCode !== skuCode);
      }
      const existingIdx = prev.findIndex((i) => i.skuCode === skuCode);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], cases };
        return next;
      }
      if (meta) {
        return [
          ...prev,
          {
            skuCode,
            cases,
            name: meta.name,
            brand: meta.brand,
            unitPricePaise: meta.unitPricePaise,
            gstInclusive: meta.gstInclusive,
          },
        ];
      }
      return prev;
    });
  };

  const getItemQuantity = (skuCode: string) => {
    return items.find((i) => i.skuCode === skuCode)?.cases || 0;
  };

  const clearCart = () => setItems([]);

  const totalCases = items.reduce((sum, i) => sum + i.cases, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        updateQuantity,
        getItemQuantity,
        clearCart,
        totalCases,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
