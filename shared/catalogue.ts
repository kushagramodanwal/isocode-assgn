/** Catalogue types and converters shared by the API and the phone. Must stay framework-free. */
import type { PricedProduct, SchemeRule, Slab } from "./pricing";

export type CatalogueItem = {
  id: string;
  code: string;
  name: string;
  nameHi: string;
  brand: string;
  category: string;
  packLabel: string;
  unitsPerCase: number;
  unitPricePaise: number; // this retailer's price
  basePricePaise: number;
  gstRateBp: number;
  stockCases: number;
  image: string;
  keywords: string[];
  schemes: { id: string; type: "FREE_GOODS" | "SLAB_DISCOUNT"; buyCases: number | null; freeCases: number | null; slabs: Slab[]; validFrom: string; validTo: string }[];
};

export function toSchemeRule(s: CatalogueItem["schemes"][number]): SchemeRule {
  const base = { id: s.id, validFrom: new Date(s.validFrom), validTo: new Date(s.validTo) };
  return s.type === "FREE_GOODS"
    ? { ...base, type: "FREE_GOODS", buyCases: s.buyCases ?? 0, freeCases: s.freeCases ?? 0 }
    : { ...base, type: "SLAB_DISCOUNT", slabs: s.slabs };
}

export function toPriced(item: CatalogueItem): PricedProduct {
  return {
    id: item.id,
    unitPricePaise: item.unitPricePaise,
    unitsPerCase: item.unitsPerCase,
    gstRateBp: item.gstRateBp,
    stockCases: item.stockCases,
    schemes: item.schemes.map(toSchemeRule),
  };
}

