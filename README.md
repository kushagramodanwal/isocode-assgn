# Company A Orders

Retailer ordering app with AI order capture for an FMCG distributor in Jabalpur (fictional "Company A": 4 brands, 1,800 kirana shops).

**Stack:** React + Vite · Node.js + Express · PostgreSQL (Prisma) · TypeScript throughout.

## What it does

- **Retailers** (phone-first, Hindi/English): OTP sign-in, catalogue with their own prices, GST shown on every price, live schemes and stock, repeat last order, a cart priced live by the scheme engine (free goods, slab discounts, "add 1 more, get 1 free" nudges), credit warnings, order history, and "type your order like on WhatsApp".
- **AI order capture** from a typed or pasted message, a **photo of a handwritten list**, or a **Hindi voice note** (Gemini). A message such as `bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti` becomes a draft where every line shows the retailer's own words, the matched SKU, a confidence level, two alternatives and, where the unit is unclear, a case-or-piece question. Nothing is ordered until a person confirms. Corrections become per-shop aliases.
- **Order desk:** inbox of messages and credit holds, line-by-line review, orders, Tally XML/CSV export batches, van loading list by route, shops with no order in 14 days.

## Quick start

See **[deployment.md](deployment.md)** for setup, environment variables and demo logins.

```bash
npm install
```

```bash
npx prisma migrate deploy && npm run db:seed
```

```bash
npm run dev
```

## Layout

```
shared/   pure TypeScript shared by API and app: pricing.ts (scheme engine), capture/ (message reader + SKU matcher), tally.ts, api.ts (request/response types)
server/   Express: routes/ → services/ → Prisma
web/      React SPA: pages/shop, pages/desk, components/
prisma/   schema, migrations, fictional seed data
docs/     Technical Design Document
```

## Product images

`web/public/products/<sku>.webp` are pack shots rendered from the catalogue (the brands are fictional, so there are no real photos). After changing the catalogue, re-render them:

```bash
npx tsx scripts/render-pack-images.ts
```

## Measuring the AI part

`npm run eval` scores message capture on 30 labelled messages (49 lines) against a catalogue with deliberate look-alikes: SKU, quantity and unit accuracy, and "dangerous" errors (a wrong product shown as "Sure"). Add `-- --gemini` to include Gemini. Current results are in the TDD, §7.3.

## Tests

`npm test` runs 151 tests: the scheme engine, the message reader, the Gemini adapter (mocked), the Tally writer, order and capture services against Postgres (including a stock race), and the HTTP API's access control and request guards.

## Documents

- [Technical Design Document](docs/TDD.pdf) ([HTML source](docs/TDD.html))
- [Deployment](deployment.md)
