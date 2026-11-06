# Assumptions

Every ambiguity in the brief is resolved here with a label. Items marked **verify** need client confirmation.

## Stack

- **A-00 — Next.js, not Vite.** The brief says "React Vite" but also asks for server components, server actions, `next/font`, `next/image` and a Vercel deploy, and phase 1 says "Next.js". Those only exist in Next.js, so the app is a single **Next.js 15 App Router** project. Vite is still used indirectly by Vitest.
- **A-00b — Local Postgres without Docker.** `docker-compose.yml` is provided; any Postgres 15+ reachable through `DATABASE_URL` works.

## Domain (from the brief)

- **A-01** Dealer prices in the sample data are per unit (pack). Case price = unit price × units per case. Biscuit 75 g: 8.10 × 96 = ₹777.60; Detergent 1 kg: 101.50 × 20 = ₹2,030.00; Tea 250 g: 118.00 × 40 = ₹4,720.00.
- **A-02** Dealer prices exclude GST. GST rate is a per-SKU field (basis points). Seed GST rates are placeholders — **verify**, not tax advice.
- **A-03** Retailers order in cases. Pieces only where `allowPieces = true`.
- **A-04** Money is integer paise. Discounts round half-up per line, to the paise.
- **A-05** One scheme applies per SKU at a time. Schemes have `validFrom`/`validTo` and optionally a segment.
- **A-06** Free goods consume stock. If stock can't cover the full free quantity, give what's available and flag the line.
- **A-07** An order over available credit (limit − outstanding) is accepted with status `CREDIT_HOLD`. The retailer is warned before placing.
- **A-08** Out-of-stock lines cannot be placed; the UI offers in-stock pack sizes of the same product, or removal.
- **A-09** Each retailer has a price tier (`STANDARD`, `PREMIUM`) with per-SKU overrides (`TierPrice`). Missing override → SKU base price.
- **A-10** A retailer only sees their own prices, credit, orders and messages. The desk sees everything.
