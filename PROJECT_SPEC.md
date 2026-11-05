---
name: retailer-ordering-app
description: Build, review and submit the FMCG retailer ordering app (React + Vite frontend, Express + TypeScript API, PostgreSQL via Prisma). Use for any task on this project: features, bugs, schema changes, the scheme engine, AI order capture, mock payments and messaging, the order desk, Tally CSV export, UI design, tests, deployment, or the TDD and deployment.md submission.
---

# Retailer Ordering App: Project Skill

## 0. Read this first

- **Timeline: phased, solo.** The core build must work end to end before any optional work starts. Each phase ends with a working screen, not only backend code.
- **The hard parts are the product.** Scheme calculation, server-side price authority, the AI draft-and-confirm flow, and the last-case stock race. Protect these. Cut everything around them that does not appear in the demo.
- **Quality beats breadth.** Seven screens that work and look designed beat twenty with dead buttons.
- **Every must-have is met, or named as a mock.** Payments, messages, Tally and the LLM each have a working path or a labelled mock. Nothing is faked silently.
- **Assumptions are labelled, never hidden.** Each one goes into the TDD's assumptions register (section 14.1).
- **The AI is real.** The brief says the AI part must actually work. The demo uses a live LLM. Automated tests use a mock. Manual entry is the fallback when the LLM fails.

## 1. What we are building

A mobile-first ordering app for a packaged-food and home-care distributor in Jabalpur, serving about 1,800 kirana shops.

- **Retailers** (shop owners on low-end Android phones, often on slow 3G) see stock, their own prices, GST status and active schemes. They place an order in about a minute, or type a message and let the AI draft it.
- **Order desk** staff check drafts, correct lines, approve or reject orders, release credit holds, and export a CSV for Tally.
- **Owner-director** is the sponsor. He does not operate the app.
- **Salesmen** exist in the brief's user list. They are cut from the MVP UI (section 1.3), and their data model is noted for later.

### 1.1 Core build (must work end to end)

1. Sign-in with a mocked OTP, delivered through the mock message sender, and role-based redirect (retailer or desk).
2. Retailer catalogue with the retailer's prices, GST label, scheme badge and stock band.
3. Cart with live scheme preview from the server, and order placement.
4. Mock payment step at order confirmation. The retailer chooses a payment mode: pay on credit account, or mock online payment. The mock online payment succeeds or fails according to a demo test switch. No money moves. The result is stored on the order and shown in order history.
5. AI order capture from a text message, with per-line confidence, two alternatives, clarifying questions for unclear units, and manual fallback. Nothing is placed until the retailer confirms.
6. Order desk: queue, line correction, approve or reject, release credit hold, and Tally CSV export.
7. Scheme engine: buy-N-get-M free and slab discounts.
8. Desk corrections create retailer-scoped aliases, so the next message from that shop resolves without the model.
9. Mock notifications: OTP sent, order placed, held, approved, rejected, payment failed and exported. Each is written to a notification log through the messaging adapter and shown to the retailer in order history.

Core screens (seven, within the brief's six to eight):
1. Sign in
2. Catalogue
3. Cart, payment mode and order confirmation
4. AI draft review
5. Order history (retailer), with notifications
6. Desk queue
7. Desk order detail, with Tally export

### 1.2 Included if the core passes its tests

- Repeat order from a past order, with current prices and stock re-checked
- Retailer list on the desk with no order in 14 days (a simple query and one table)
- Desk export history list (the batch records already exist, so this is a table view)

### 1.3 Cut (state these in the TDD with reasons)

- Salesman screens, salesman-assigned retailer lists, and offline ordering with an offline queue
- Photo of a handwritten list (OCR) and Hindi voice notes. The pipeline takes text, which is where the core build is.
- Van loading lists
- Real payment gateway, real refunds, payment reconciliation, and money movement of any kind
- Real SMS, WhatsApp and Tally import. Each sits behind an adapter with a mock implementation (1.5).
- Delivery tracking and GST e-invoicing (stays in Tally)
- Full PWA install polish. A valid manifest and a basic service worker for the app shell are enough.
- Playwright UI tests, if time runs short. Vitest, Supertest and React Testing Library are mandatory.
- Stock movement ledger, price history tables, database-level audit immutability, OTP delivery to real phones, session revocation UI

### 1.4 Success targets (for the TDD's "why this matters" section)

Errors under 1%, 50% of orders placed in-app or AI-captured within 4 months, and the order-entry team reduced from 6 to 3.

### 1.5 Mocked external systems (required)

Every outside system sits behind an interface in `apps/api/src/platform/adapters/`. Each has a mock implementation, and the mock is the default unless config says otherwise.

| System | Interface | Demo implementation | Visible in the app as |
|---|---|---|---|
| Messaging (OTP, order notices) | `MessageSender` | Mock. Writes to the `Notification` log. Never logs the OTP value. | Updates panel in order history, and the masked-phone confirmation on sign-in |
| Payments | `PaymentGateway` | Mock. Succeeds or fails by a demo test switch. | Payment mode and status on the order, with a "Demo payment" label |
| Tally | `TallyExporter` | CSV exporter. Import format unconfirmed. | Export batch with row counts, file hash and a download |
| LLM | `LlmClient` | Real provider in the demo, mock in tests | "AI draft" marker, and "manual entry" when the provider is unavailable |
| Stock and price feed | Seed data | Seed script | "Stock as of" timestamp on each data screen |

Rules for all adapters:
- Provider is chosen by config (`MESSAGING_PROVIDER=mock`, `PAYMENT_PROVIDER=mock`, `LLM_PROVIDER=...`). Never by code edits.
- Mock results are labelled as mocked, in the UI where a user would otherwise be misled, in the TDD, and in `deployment.md`.
- A failing adapter never blocks an order. A failed notification is retried once, then logged as failed. A failed payment moves the order to `payment_failed` (section 4.5), where the retailer chooses another mode.
- Adapter calls carry an idempotency reference where the provider supports it. The mock stores it, so retries are visible in tests.

## 2. Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite, PWA-ready | Every screen is behind sign-in, so SSR adds nothing |
| Routing | React Router | Role-based route guards |
| Server state | TanStack Query | Caching, loading and error states per request |
| Validation | Zod, shared through `packages/domain` | One schema for the client preview and the server |
| Backend | Node.js, Express, TypeScript | Fits the team's skills |
| Database | PostgreSQL | Transactions and row locks are needed for stock and idempotency |
| ORM | Prisma, with raw SQL only where needed | Typed queries, migrations, and `SELECT ... FOR UPDATE` through `$queryRaw` |
| AI | `LlmClient` interface with a real provider adapter and a mock adapter | Real demo, deterministic tests |
| Messaging, payments, Tally | Adapter interfaces with mock implementations (1.5) | Named mocks, visible results |
| Tests | Vitest (domain and services), Supertest (API), React Testing Library (UI states) | Covers the risks that matter |
| Local infra | Docker Compose for PostgreSQL | Same database in dev, CI and the demo |

### 2.1 Layout

```
ordering-app/
├── apps/
│   ├── web/                      React + Vite
│   │   └── src/
│   │       ├── features/         auth, catalogue, cart, orders, ai-draft, desk
│   │       ├── components/       shared primitives (section 10.1)
│   │       ├── styles/           tokens.css
│   │       ├── lib/              api client, query client, money formatting
│   │       └── i18n/             en.ts, hi.ts
│   └── api/
│       ├── prisma/               schema.prisma, migrations/, seed.ts
│       └── src/
│           ├── platform/
│           │   ├── config.ts     env parsing, startup guards
│           │   ├── logger.ts     structured logs, redaction
│           │   ├── prisma.ts     client
│           │   ├── errors.ts     error format and handler
│           │   ├── bigint.ts     paise-to-string helper
│           │   └── adapters/     MessageSender, PaymentGateway, TallyExporter (each with mock)
│           ├── middleware/       session, requireRole, validate, idempotency-key, origin-check
│           ├── modules/
│           │   ├── auth/         auth.routes.ts, auth.service.ts, auth.schema.ts
│           │   ├── catalogue/    catalogue.routes.ts, catalogue.service.ts
│           │   ├── orders/       orders.routes.ts, orders.service.ts, orders.schema.ts,
│           │   │                 order-states.ts (transition table), payment.service.ts
│           │   ├── notifications/ notifications.service.ts (writes the log)
│           │   ├── ai-capture/   ai.routes.ts, ai.service.ts, normalise usage, llm/ (client + adapters)
│           │   ├── desk/         desk.routes.ts, desk.service.ts, aliases.service.ts
│           │   └── exports/      csv.ts, exports.service.ts
│           └── server.ts
├── packages/
│   └── domain/                   scheme-engine/, money.ts, normalise.ts, schemas.ts
├── docs/screens/                 screenshots at 360px and 1280px
├── .env.example                  variable names only, with safe placeholders
├── docker-compose.yml
└── README.md
```

**Layering rule:** routes validate input, check roles, call a service and shape the response. They never import Prisma. Services hold business rules and transactions. A separate repository file is added only when a query is reused across services or is complicated enough to need a name. Most modules will not need one.

## 3. Non-negotiable rules

Check every change against these. If a change breaks one, stop and raise it.

1. **The server is the authority.** Prices, schemes, stock, totals and credit are computed on the server. The client displays what the server returns. The client may run the shared scheme engine for preview only. A price in a request body is ignored.
2. **Money is integer paise.** `8.10` is stored as `810`. No floats in the database, API, domain code or UI. One formatting helper, used at the display edge only.
3. **Retailer-scoped queries filter by the caller's retailer.** Use `findOrderForRetailer(id, retailerId)`, not `findOrder(id)`. A record that belongs to another retailer returns `404`, not `403`, so IDs are not revealed.
4. **The retailer ID comes from the session**, never from the request body.
5. **The AI never writes an order, a price, a stock value, a scheme or a payment.** It returns candidate SKUs, quantities and units. The backend validates each one and decides whether it can be ordered.
6. **No order is placed without a human confirmation.** For AI orders, the retailer confirms the draft. The desk approves the order.
7. **Order creation is idempotent.** `Idempotency-Key` is required, and a unique constraint enforces it. Payment calls reuse the order's reference, so a retried request cannot charge twice.
8. **Stock changes happen only inside a transaction that locks the stock row.** Approval is the only operation that decreases stock.
9. **No hard deletes** for retailers, SKUs, schemes, aliases or orders. Use `active` flags.
10. **No secrets in the repository.** Config comes from environment variables. `.env.example` lists names only. Never log OTP values, session tokens, full phone numbers, LLM keys or full prompts.
11. **Validate every input** at the route with Zod. Write schemas are strict, so unknown fields are rejected.
12. **Default-deny permissions.** Every route declares its allowed roles. A startup test fails if any route has no declaration.
13. **Serialise BigInt explicitly.** Prisma `BigInt` does not serialise to JSON. Convert paise to strings in the response layer through one helper.
14. **The LLM receives only what it needs.** The message text, and the candidate SKU codes and names. It never receives prices, credit limits, other retailers' data or the retailer's name.
15. **Mocks are visible.** A mocked payment, message or export is labelled wherever a user could mistake it for a real one.

## 4. Domain rules

### 4.1 Units, pricing and GST

- **A1 (MVP): dealer prices are per case.** Orders, stock and schemes are counted in cases. The UI labels the price "per case". If the client confirms per-pack pricing, add `units_per_case` to `Sku` and compute case price in `money.ts`. Scheme and stock logic do not change.
- **A2: sample prices are GST-inclusive.** Every displayed price shows "incl. GST" or "excl. GST". The seed sets a flag per price, and the TDD marks the value as an assumption to confirm.
- A `Price` row is either a list price (`retailer_id` null) or a retailer-specific price. The retailer-specific price wins when it is valid.
- Prices have `valid_from` and `valid_to`. Changing a price inserts a new row. Old rows are not edited.
- Each order line stores `unit_price_paise`, `gst_inclusive` and the scheme result as they were at placement. History and exports never change when prices change later.
- On submit, the server re-reads prices. If a price changed since the preview, the response returns `422` with the changed lines, and the retailer confirms the new total.

### 4.2 Scheme engine (`packages/domain/scheme-engine`)

This is the hard part. Build it first and test it hardest.

- Pure function. No database, no I/O, no reading the clock. The order date is an input.
- **Input:** cart lines (SKU code, cases ordered, unit price in paise), the schemes applicable to this retailer, and the order date.
- **Output per line:** `billedCases`, `freeCases`, `deliveredCases`, `discountPaise`, `freeGoodsStatus` (`ok` or `pending_stock`), and a plain-language `explanation` string.

**Buy N get M free:**
- `free = floor(ordered / N) × M`
- 20 cases under "Buy 10 get 1" → 2 free, 20 billed, 22 delivered
- 9 cases → 0 free

**Slab discount:**
- Applies when `ordered >= minCases`, using the highest qualifying slab only
- Discount = `floor(lineAmountPaise × discountBps / 10000)`
- Example: 5 cases of detergent at ₹101.50 = 50,750 paise line amount. 3% gives 1,522 paise, which is ₹15.22, rounded down.

**Rules:**
- **A3: free goods and slab discounts do not stack.** One scheme per line. The engine picks the scheme with the larger retailer benefit and records why. Configurable in one place and stated in the TDD.
- Recalculate from scratch on every change. Never apply deltas.
- A scheme outside its validity window, or scoped to another retailer, is ignored with a reason in the output.
- Free goods out of stock are returned as `pending_stock`. They are never dropped silently.
- An unknown scheme type throws. It never returns a silent zero.

**Tests (mandatory):** thresholds at N and N−1, a multiple of N, large quantities, zero quantity, several lines, a slab boundary at exactly `minCases`, an expired scheme, a scheme scoped to another retailer, rounding down at paisa boundaries, free goods with stock short, and an unknown type.

### 4.3 Stock

- `Stock` has one row per SKU: `on_hand_cases` (integer, ≥ 0) and `updated_at`.
- **Placement** reads stock and shows a band to the retailer: in stock, low (under 20 cases), or out. It does not change stock.
- **Approval** is the only operation that decreases stock. In one transaction:
  1. Lock the stock rows for every SKU on the order, in ascending SKU code order. This avoids deadlocks when two approvals overlap.
  2. Check each line against `on_hand_cases`, including free cases.
  3. If any line is short, roll back and return `422` listing the short lines.
  4. Decrement stock, set the order to `approved`, write the status event and the notification, and commit.
- Reject and cancel never touch stock, because nothing was reserved.
- **A4: no reservation table and no stock ledger in the MVP.** Stock is decremented on approval. A reconciliation ledger is a stated next step.
- Stock comes from the seed data. Each data screen shows "stock as of" with the seed timestamp, so staleness is visible.

**The concurrency test (mandatory):** seed 5 cases of one SKU. Two approvals for 5 cases each run at the same time against a real PostgreSQL instance. Exactly one succeeds. The other returns `422`, and stock ends at zero, never negative.

### 4.4 Credit hold

- `Retailer.credit_limit_paise` is set in the seed data.
- **A5: open exposure** is the sum of totals for the retailer's orders in `pending_desk`, `on_hold` and `approved` status that have not been exported. Exported orders count as settled in Tally, which is outside the app. Online-paid orders are excluded from exposure, because the payment already settles them.
- When an order is placed on credit, if open exposure plus the new total exceeds the limit, the order is saved as `on_hold` with a reason such as "Exceeds credit limit by ₹X". It is not rejected.
- The desk can release a hold, which moves the order to `pending_desk` and writes an event, or reject it.
- Retailers see their own limit and exposure only.

### 4.5 Payments (mocked)

- **A11: payment modes.** `credit_account` and `online_mock`. Credit uses the credit rule in 4.4. Online uses `PaymentGateway`.
- **Demo test switch.** When `PAYMENT_PROVIDER=mock`, the confirmation screen offers "Demo: payment succeeds" and "Demo: payment fails". The switch is visible and labelled "Demo payment, no money moves". It is never shown when the provider is real.
- **Flow at confirmation:**
  1. The retailer chooses a mode and confirms.
  2. For `credit_account`, the credit rule decides between `pending_desk` and `on_hold`. `payment_status` is `not_required`.
  3. For `online_mock`, the order is created in `payment_pending`, the gateway is called with the order's reference, and the result is written.
  4. On success, the order moves to `pending_desk` with `payment_status` `succeeded` and a mock reference.
  5. On failure, the order moves to `payment_failed`. The retailer sees "Payment failed. Choose another mode." Choosing another mode moves it on.
- **Refunds:** a rejected order that was paid online writes `refund_status = required_mock` and a notification. No refund is processed. The desk screen shows this state. Real refunds are cut.
- Payment calls carry the order reference as an idempotency key. A retry after a timeout returns the original result from the mock.

### 4.6 Order lifecycle

States: `payment_pending`, `payment_failed`, `pending_desk`, `on_hold`, `approved`, `exported`, `rejected`, `cancelled`.

| From | To | Who |
|---|---|---|
| (new) | `pending_desk` | Retailer, credit within limit, or online payment succeeded |
| (new) | `on_hold` | Retailer, credit over limit |
| (new) | `payment_pending` | Retailer, online mode chosen (transient) |
| `payment_pending` | `pending_desk` | System, gateway success |
| `payment_pending` | `payment_failed` | System, gateway failure |
| `payment_failed` | `pending_desk` or `on_hold` | Retailer, after choosing another mode |
| `payment_failed`, `pending_desk`, `on_hold` | `cancelled` | Retailer, before approval |
| `pending_desk` | `approved` | Desk, with stock lock |
| `pending_desk`, `on_hold` | `rejected` | Desk |
| `on_hold` | `pending_desk` | Desk (release hold) |
| `approved` | `exported` | Export transaction only |

- The table lives in `order-states.ts`. The service checks it. Tests cover every allowed and forbidden transition.
- Every transition increments `Order.version`, writes an `OrderEvent`, and queues a notification, all in the same transaction as the change.

### 4.7 Order desk

- The queue shows `pending_desk` and `on_hold` orders, with AI-drafted orders marked. Each draft shows the original message beside the parsed lines.
- Line edits require `If-Match` with the order version. A stale version returns `409` and the UI shows "changed by someone else, reload".
- Approval re-checks prices and stock inside the transaction. If a price changed, the order returns to the desk for review.
- Orders paid online and then rejected show the refund-required state (4.5).
- Every correction to an AI-drafted line offers to create an alias (5.7).

### 4.8 Aliases

- Scoped to one retailer. "chhota" for shop A never affects shop B.
- One active alias per `(retailer_id, phrase_normalized)`, enforced by a partial unique index in a raw migration. A new correction deactivates the old alias and records the change in the alias's `replaced_by_id` field.
- Aliases that point to an inactive SKU are ignored during matching and flagged on the desk screen.
- Normalisation is one function in `packages/domain/normalise.ts` (section 5.3).

### 4.9 Notifications (mocked)

- Every notable event writes a `Notification` row through `MessageSender`. Events: `otp_sent`, `order_placed`, `order_on_hold`, `payment_failed`, `order_approved`, `order_rejected`, `refund_required`, `export_created`.
- Each row stores recipient (masked phone or user ID), channel, template name, a short text, delivery status (`sent`, `failed`) and a retry count. The row never stores an OTP value.
- The retailer sees their notifications in the Updates panel on order history. The desk sees export notifications on the export screen.
- Notification failures are logged, retried once, and never block the order.

### 4.10 CSV export (Tally, unconfirmed format)

- **A6: the export is a documented CSV, not a Tally XML file.** The import format for Tally must be confirmed with the client. The TDD states this plainly. We do not claim the file imports into Tally without that confirmation.
- Columns: `order_number`, `order_date`, `retailer_code`, `retailer_name`, `sku_code`, `billed_cases`, `free_cases`, `unit_price_paise`, `line_discount_paise`, `gst_inclusive`, `line_total_paise`, `order_total_paise`.
- Amounts are exported as rupees with two decimals, produced from paise by one formatter. Nothing else converts money.
- Export runs in one transaction: create an `ExportBatch` with a file SHA-256, mark included orders with `exported_batch_id` where it is still null, and set status `exported`. Re-running with the same orders is a no-op, and the response says so.
- Orders missing a retailer code or GST flag are excluded and listed in the batch report. If validation fails, nothing is marked.
- The export goes through `TallyExporter`. The mock writes the file and records the batch. The real adapter is cut.

### 4.11 Visibility

- A retailer's prices, credit, orders, drafts, payments and notifications are visible only to that retailer.
- The desk sees everything. Desk changes are recorded as order events with the actor.
- Salesman visibility (assigned retailers only) applies if the salesman role is built later.

## 5. AI order capture

### 5.1 Two requests

`POST /ai/drafts` creates a draft. `POST /ai/drafts/:id/confirm` places an order from a reviewed draft through the same path as a manual order. They are never combined, so an AI response can never place an order on its own.

### 5.2 Pipeline

1. **Validate:** non-empty, at most 1,000 characters.
2. **Normalise:** apply the same function used for aliases.
3. **Alias match first:** each token span is checked against the retailer's active aliases. Matches become high-confidence lines and are not sent to the model.
4. **LLM extraction for unmatched spans:** one call, timeout of 8 seconds (configurable), structured output required. The prompt lists the candidate SKUs (code and name only), the allowed units (`case`, `piece`, `unknown`), and asks for JSON only.
5. **Schema validation:** the response must parse with Zod. Unknown SKU codes, non-positive quantities or unknown units are rejected for that line.
6. **Backend confidence scoring:** confidence is computed by our rules, not taken from the model. See 5.4.
7. **Alternatives:** up to two other candidate SKUs, with their scores.
8. **Unit check:** if the unit is `unknown`, the line is marked "needs clarification" and the question is "Cases or pieces?". The line is never guessed.
9. **Stock and price annotation:** the backend adds the stock band and price for display. These values never come from the model.
10. **Save** the `AiDraft` with the normalised message, the raw model response (JSONB, for audit) and the draft lines.

### 5.3 Normalisation vocabulary (defined once, tested)

The vocabulary is small and explicit:
- `peti`, `pati`, `case` → unit `case`
- `kilo`, `kg` → size 1 kg when it follows a product name
- `wala`, `wali` → ignored (filler)
- `bhaiya`, `bhai` → ignored (salutation)
- `chhota` → size hint, resolved through the retailer's aliases first

A word outside the vocabulary is passed to the model as is. The vocabulary is a stated assumption (A7).

### 5.4 Confidence rules (ours, not the model's)

| Signal | Effect |
|---|---|
| Exact retailer alias match | High |
| Model SKU valid, unit explicit, single clear match | High |
| Model SKU valid, unit unknown | Needs clarification |
| Top two candidates within a close score margin | Medium, with alternatives shown |
| Model returns a SKU not in the catalogue | Line rejected, reason logged |
| No candidate above threshold | Unresolved. The retailer picks from the catalogue. |

Stock status does not lower confidence. A correct match that is out of stock stays high confidence and gets a separate "out of stock" flag. Identifying the product and deciding whether it can be ordered are separate steps.

### 5.5 Failure handling

- **LLM timeout, error or missing key:** return the draft with `status: manual_entry_required`. The raw message is kept. The UI offers catalogue search to add lines by hand, so the feature still works without the model.
- **Malformed model output:** reject it, log the error without the raw response, and use the manual path.
- **Model suggests a price, stock value, scheme or payment:** ignored. The fields are never read.
- **Duplicate message from the same retailer within 2 minutes:** the existing draft is returned, to avoid duplicate drafts from double taps.
- **Empty or whitespace-only message:** `400`.
- **Every line unresolved:** the draft is saved and the UI shows the manual path.

### 5.6 Demo and tests

**Demo message:** `bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti`

Expected draft:
- "biscuit chhota" → SKU-BS-075, 5 cases, high (alias for this retailer)
- "washing powder 1 kilo" → SKU-DT-1KG, 2 cases, high
- "chai patti 250" → SKU-TE-250, 1 case, high confidence, flagged out of stock

**Mock LLM tests (mandatory):** alias hit, model hit, timeout, malformed JSON, unknown SKU, unclear unit, duplicate message, empty message, missing API key, and a model response containing a price, which must be ignored.

**Live check:** before submission, run the demo message against the real provider and record the output in the TDD. If the live output differs from the expected draft, the TDD explains the difference.

### 5.7 Desk correction becomes learning

When the desk changes an AI-drafted line's SKU, the desk screen offers "Remember this for [retailer name]", checked by default. Accepting creates an alias. The next draft for that retailer resolves the phrase without the model. This is tested: correct a line, submit a new message with the same phrase, and the second draft resolves through the alias.

## 6. Data model

Fourteen tables. Everything else is cut or added later.

| Entity | Purpose | Key fields |
|---|---|---|
| `User` | Anyone who signs in | `id`, `phone` (unique), `role` (`retailer`, `desk`), `retailer_id` (nullable), `active` |
| `Session` | A signed-in browser | `id`, `user_id`, `token_hash` (unique), `expires_at`, `last_seen_at` |
| `Retailer` | The shop | `id`, `code` (unique), `name`, `credit_limit_paise`, `active` |
| `Sku` | Sellable product | `id`, `code` (unique), `name`, `brand`, `image_url`, `active` |
| `Price` | Price for a SKU, list or retailer | `id`, `sku_id`, `retailer_id` (nullable), `price_paise`, `gst_inclusive`, `valid_from`, `valid_to` |
| `Stock` | Cases on hand per SKU | `sku_id` (primary key), `on_hand_cases`, `updated_at` |
| `Scheme` | Free-goods or slab rule | `id`, `sku_id`, `type` (`buy_n_get_m`, `slab`), `n`, `m`, `min_cases`, `discount_bps`, `retailer_id` (nullable), `valid_from`, `valid_to`, `active` |
| `Order` | Placed order | `id`, `order_number` (unique), `retailer_id`, `placed_by_user_id`, `status`, `version`, `total_paise`, `hold_reason`, `payment_mode`, `payment_status`, `payment_reference`, `refund_status`, `idempotency_key`, `ai_draft_id` (nullable), `exported_batch_id` (nullable), `placed_at` |
| `OrderLine` | One SKU in an order | `id`, `order_id`, `sku_id`, `billed_cases`, `free_cases`, `unit_price_paise`, `gst_inclusive`, `discount_paise`, `line_total_paise`, `scheme_explanation` |
| `OrderEvent` | Append-only history of order changes | `id`, `order_id`, `from_status`, `to_status`, `actor_user_id`, `note`, `created_at` |
| `AiDraft` | One message and its parsed lines | `id`, `retailer_id`, `raw_message`, `normalised_message`, `model_response` (JSONB), `lines` (JSONB), `status`, `created_at` |
| `Alias` | Retailer shorthand mapped to a SKU | `id`, `retailer_id`, `phrase_normalised`, `sku_id`, `active`, `replaced_by_id` |
| `ExportBatch` | One CSV export run | `id`, `file_sha256`, `order_count`, `total_paise`, `excluded` (JSONB), `created_by_user_id`, `created_at` |
| `Notification` | Log of mocked outgoing messages | `id`, `user_id` (nullable), `channel`, `template`, `body`, `status`, `attempts`, `created_at` |

**Notes for the TDD:**
- `Order` carries `version` for optimistic locking, and `idempotency_key` with a unique constraint on `(placed_by_user_id, idempotency_key)`.
- `AiDraft.lines` is JSONB because lines are read with their draft and never queried on their own.
- `OrderEvent` is append-only in application code, and every write happens in the same transaction as the change it records. Database-level immutability is cut.
- `Stock` uses `sku_id` as its primary key, so there is exactly one row per SKU.
- Money columns are `BIGINT`. Timestamps are `timestamptz`, stored in UTC. "Today" is computed in `Asia/Kolkata`.
- The salesman role is not in the core, so no `Retailer.salesman_id` is needed yet. Add it when salesman screens are built.

### 6.1 Constraints

Prisma can express most of these. Raw SQL migrations add the rest, each commented next to the Prisma model.

- Unique: `User.phone`, `Session.token_hash`, `Retailer.code`, `Sku.code`, `Order.order_number`, `Order (placed_by_user_id, idempotency_key)`, `OrderLine (order_id, sku_id)`, `Alias (retailer_id, phrase_normalised) where active` (raw partial index)
- Check: `Stock.on_hand_cases >= 0`, `Price.price_paise > 0`, `OrderLine.billed_cases >= 0`, `OrderLine.free_cases >= 0`, `Scheme.discount_bps between 0 and 10000`, `Order.total_paise >= 0`
- Foreign keys: all declared, with `ON DELETE RESTRICT`

Deliberately not built: exclusion constraints on price ranges (overlap is checked in the service and covered by a test), database-level append-only permissions, and stock reservation constraints.

### 6.2 Indexes

- `Order (retailer_id, placed_at desc)`: retailer history
- `Order (status, placed_at)`: desk queue
- `OrderEvent (order_id, created_at)`: order timeline
- `Price (sku_id, retailer_id, valid_from)`: price lookup
- `Alias (phrase_normalised)`: draft matching
- `Notification (user_id, created_at)`: notification list

## 7. Seed data

Clearly fake names and phone numbers (for example `+910000000001`). The seed must fill every screen. It is repeatable, using upserts keyed on codes.

- **SKUs:** 20 to 24 across four brands: biscuits, detergent, tea, and two home-care lines. Include the three sample SKUs exactly as given.
- **Stock:** most in stock. Some low (under 20 cases). At least two at zero, including SKU-TE-250.
- **Prices:** list prices for every SKU. Retailer-specific prices for three or four retailers.
- **Schemes:** one buy-N-get-M, one slab, one scoped to a single retailer, one expired.
- **Retailers:** 10 to 12. Varied credit limits. One at its limit, so a new credit order goes to hold.
- **Users:** two desk users, and one signed-in retailer user per retailer.
- **Orders:** 20 to 30 historical orders in mixed states, so the desk queue is never empty. Include some exported, some on hold, some approved, some `payment_failed`, and some paid online.
- **Aliases:** 8 to 10, including "chhota" → SKU-BS-075 for one retailer only.
- **Notifications:** a few seeded log rows, so the updates panel is not empty on first load.
- **Export batches:** one seeded batch, with its file, so the export history is not empty.

Demo logins for each role are listed in `deployment.md`. They use fake phone numbers and the demo OTP (section 8).

## 8. Sign-in and sessions

- **A7: OTP is mocked.** The OTP is generated by the auth service and delivered through `MessageSender`. In demo mode (`DEV_OTP_ENABLED=true`), the code is a fixed demo value, and the sign-in screen shows a hint that appears only in that mode.
- **The startup guard:** the app refuses to start if `NODE_ENV=production` and `DEV_OTP_ENABLED=true` together. This check has a test.
- **Logs and notifications never contain the OTP value.** The notification row says "OTP sent to ••••0001".
- `POST /auth/otp/request` returns the same response for registered and unknown phones, so it does not reveal which phones exist.
- `POST /auth/otp/verify` checks the code, creates a `Session`, and sets the cookie.
- Sessions use a random token. Only its SHA-256 hash is stored. Sessions expire after 12 hours of inactivity (`last_seen_at`).
- Cookie: `httpOnly`, `Secure` in production, `SameSite=Lax`.
- Rate limit on verify: 5 attempts per phone per 15 minutes, in memory. Stated as a limit of the MVP, which runs on one instance.
- `POST /auth/logout` deletes the session. `GET /me` returns the user, role and retailer.
- Role checks are middleware (`requireRole`). Record checks are in the service.

## 9. API

Base path `/api/v1`. JSON only. Every error uses `{ code, message, details }`. No stack traces or SQL in responses.

Status codes: `400` validation, `401` not signed in, `403` wrong role, `404` not found or not visible, `409` version or idempotency conflict, `422` business rule (out of stock, credit hold, price changed, payment failed).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/logout`, `GET /me` |
| Catalogue | `GET /skus?q=&cursor=`, `GET /skus/:id`, `GET /schemes/active` |
| Cart | `POST /cart/preview` (no writes, called on each quantity change) |
| Orders (retailer) | `POST /orders` (requires `Idempotency-Key`, body includes `paymentMode` and, in demo, `demoPaymentOutcome`), `GET /orders?cursor=`, `GET /orders/:id` (includes events and notifications), `POST /orders/:id/cancel`, `POST /orders/:id/retry-payment` (body: new `paymentMode`) |
| AI capture | `POST /ai/drafts`, `GET /ai/drafts/:id`, `POST /ai/drafts/:id/confirm` (body includes `paymentMode`, places the order through the same path as `POST /orders`) |
| Notifications | `GET /notifications?cursor=` (caller's own only) |
| Desk | `GET /desk/orders?status=`, `GET /desk/orders/:id`, `PATCH /desk/orders/:id/lines/:lineId` (requires `If-Match`), `POST /desk/orders/:id/approve`, `POST /desk/orders/:id/reject`, `POST /desk/orders/:id/release-hold` |
| Aliases | `GET /desk/aliases?retailerId=`, `POST /desk/aliases`, `POST /desk/aliases/:id/deactivate` |
| Export | `POST /desk/exports/csv` (body: order IDs), `GET /desk/exports/:batchId`, `GET /desk/exports/:batchId/file` |

Notes:
- `POST /ai/drafts/:id/confirm` makes a draft into an order only through an explicit confirmation. The confirmed quantities go through the same pricing, scheme, credit and payment checks as a manual order.
- `POST /cart/preview` returns the same numbers `POST /orders` will compute, so the cart and the confirmation agree.
- `demoPaymentOutcome` (`succeeds` or `fails`) is accepted only when `PAYMENT_PROVIDER=mock`. The real provider ignores it, and a startup test covers that.
- All list endpoints use cursor pagination with a page size cap of 50.
- Repeat order (optional) is `POST /orders/:id/repeat`, which returns a cart preview, not an order.

## 10. Frontend

### 10.1 Design system

- All colours, spacing, radii, type sizes and shadows are tokens in `apps/web/src/styles/tokens.css`. Components use tokens only. No hex codes or pixel values in feature code.
- Shared primitives in `components/`: `Button`, `Stepper`, `PriceLabel`, `StockBadge`, `SchemeBadge`, `ProductCard`, `StatusChip`, `ConfidenceBadge`, `PaymentBadge`, `MockBadge`, `EmptyState`, `ErrorState`, `Skeleton`, `Money`. Screens compose these. Screens do not restyle them.
- **Aesthetic direction (proposed, stated in the TDD):** warm off-white background, a single deep accent colour used only for actions, product images given the most space, one sans-serif family with a Devanagari fallback, and status colours always paired with text. The direction is chosen before the first screen is built, and the TDD says why.
- Type scale: four sizes at most. Prices use tabular figures so columns align.
- Spacing: one scale in 4px steps, used everywhere.
- Before building each screen, read `/mnt/skills/public/frontend-design/SKILL.md`.
- Each new screen is checked at 360px and 1280px before it is marked done. Save screenshots in `docs/screens/`.

### 10.2 Four states on every data screen

- **Loading:** skeleton shapes matching the final layout. Never a spinner over a blank page.
- **Empty:** a short message and a next step (for example, "No orders yet. Browse the catalogue."). Never a blank panel.
- **Error:** what failed, in plain words, and a retry button. No raw error text.
- **Success:** the content.

Tested with React Testing Library by rendering each state.

### 10.3 Mobile and performance

- Designed for 360px width first. Tap targets at least 48px. Steppers have large plus and minus buttons.
- First load under 3 seconds on slow 3G. Route-level code splitting, so the retailer and desk bundles load separately. No heavy charting or UI libraries in the entry bundle. Images are compressed, sized explicitly and lazy-loaded.
- Measure with Lighthouse on throttled 3G and record the result in the TDD. If the target is missed, the TDD says so and gives the measured number.
- Missing product images show a neutral placeholder, never a broken icon.

### 10.4 Language and money

- Hindi and English. All user-facing text comes from `i18n/`. No hard-coded strings in components.
- Every price shows its GST label. Money formatting goes through one helper that takes paise.
- The client never computes authoritative totals.

### 10.5 Key screens

- **Sign in:** phone field, then OTP field. The demo hint appears only when the demo OTP is enabled. A masked-phone line confirms where the code was "sent".
- **Catalogue:** search, and a grid of product cards with image, name, case size, retailer price with GST label, scheme badge, stock band, and a stepper for quick add. A sticky bottom bar shows the cart count and total.
- **Cart and confirmation:** line list with scheme explanations from `/cart/preview`, the total, the credit status, a payment mode choice (credit account, or online with the demo outcome switch when the mock is active), and a single submit button. A notice appears if a price changed.
- **AI draft review:** the original message at the top. Each parsed line shows the original words, the matched product, quantity, unit, a confidence badge, and up to two alternatives. An unclear unit shows a question card with two buttons ("Cases" and "Pieces"). A "Manual entry" button is always visible. Nothing is placed until the retailer confirms, and the same payment choice appears here.
- **Order history:** list with status chips and payment badges. Hold reasons and payment failures are shown in plain words. A "Payment failed, choose another mode" action appears on those orders. An Updates panel lists notifications, each marked as a demo message.
- **Desk queue:** orders with status chips, an "AI" marker on drafted orders, payment badges, and a filter for on-hold orders. A summary bar shows counts.
- **Desk order detail:** the original message beside the lines, line edit controls, scheme and credit status, payment status, approve, reject, release hold, and a refund-required notice where it applies. Short-stock lines are highlighted with the available count.
- **Export:** a list of orders ready to export, the batch action, and batch history with row counts, file hash and a download. The export is labelled "CSV for Tally, import format pending client confirmation."

### 10.6 Accessibility

- Labels on every input, visible focus states, contrast that meets WCAG AA for text.
- Confidence, stock, payment and status use text and icon as well as colour.

## 11. Testing

Minimum before a feature counts as done.

- **Scheme engine:** the full list in 4.2.
- **Money helpers:** paise conversion, rounding down, formatting, BigInt string conversion.
- **Order state table:** every allowed and forbidden transition, including the payment states.
- **Authorization:** each protected route tested with the wrong role and with another retailer's ID. A retailer cannot read another retailer's prices, orders, drafts, payments, notifications or credit. Expected result is `404` for records and `403` for roles.
- **Startup guards:** a route without a declared role fails the suite. The demo OTP cannot be enabled in production. `demoPaymentOutcome` is ignored when the real payment provider is configured.
- **Idempotency:** the same key twice returns the same order. Two concurrent requests with the same key produce one order.
- **Stock lock:** the concurrency test in 4.3 against real PostgreSQL.
- **Credit hold:** an order over the limit is saved as `on_hold` with a reason. Release moves it to `pending_desk`.
- **Payments:** a successful mock payment moves the order to `pending_desk`. A failed one moves it to `payment_failed`. Retrying with another mode moves it on. A rejected online-paid order shows `refund_required`. A retried payment call with the same reference does not charge twice.
- **Notifications:** each event writes one row. A failing sender is retried once and logged. A failure does not block the order. No OTP value appears in any row or log line.
- **AI pipeline:** the cases in 5.6, using the mock LLM. The live check is recorded in the TDD.
- **Alias learning:** a correction creates an alias, and the next draft uses it without calling the model.
- **Optimistic locking:** a stale `If-Match` returns `409`.
- **CSV export:** re-running the same export is a no-op. A validation failure marks nothing.
- **BigInt serialisation:** routes return paise as strings and do not throw.
- **UI states:** each data screen renders loading, empty and error states.
- **Playwright (only if time allows):** sign in, catalogue, add to cart, see scheme, place order with the demo payment, see it in the desk queue, approve, export.

Tests run in CI on every push. The test database comes from Docker Compose.

## 12. Build plan (phases)

Each phase ends with a working screen or flow, demoable on its own. Do not start the next phase until the current phase's tests pass.

| Phase | Build | End-of-phase check |
|---|---|---|
| 1 | Monorepo, TypeScript, Docker Compose PostgreSQL, Prisma schema and migrations (including raw constraints), seed script, config with startup guards, error format, BigInt helper, adapter interfaces with mocks, sign-in with mocked OTP through `MessageSender`, sessions, `requireRole`, route-declaration test, catalogue read endpoints, sign-in screen and catalogue screen with four states | Sign in as a retailer and see the catalogue with real seed data. Route and startup tests pass |
| 2 | Scheme engine with full tests. Pricing lookup with GST label. `POST /cart/preview`. Cart screen with live scheme preview | Changing a quantity updates scheme results. Scheme suite green |
| 3 | `POST /orders` with idempotency, stock band check, credit hold, mock payment, order state table, order history with payment badges and notifications. Cart confirmation screen with the payment choice. Authorization suite | A retailer places a credit order and an online-mock order through the UI. A failed mock payment shows the retry path. An over-limit order goes to hold with a reason. Cross-retailer tests pass |
| 4 | AI pipeline: normalisation, alias match, real LLM adapter, mock adapter, schema validation, confidence rules, `POST /ai/drafts`, confirm endpoint. AI draft review screen with manual fallback | The demo message produces the expected draft live. Removing the API key produces the manual path. Mock LLM tests green |
| 5 | Desk queue, desk detail, line edits with `If-Match`, approve with stock lock, reject, release hold, refund-required notice, alias learning from corrections | Desk approves the demo order. A correction creates an alias that works on the next draft. Stock lock logic in place |
| 6 | CSV export with batch record, idempotent re-run, export screen, concurrency test on the last-case race, BigInt and startup-guard tests, UI state tests, notification tests | All required tests in section 11 are green in CI |
| 7 | No new features. Responsive pass at 360px and 1280px, screenshots, Lighthouse on throttled 3G, `npm audit`, README, `deployment.md` listing every mock and its config key, TDD, clean-clone run of the demo | Submission checklist (14.2) complete |

**If behind schedule:**
- Phase 3 slips: keep the server rules and their tests for credit and payment. Simplify the UI to one payment choice.
- Phase 4 slips: the AI screen keeps the manual path and the live demo. The live LLM check stays mandatory.
- Phase 5 slips: alias learning stays as a server endpoint with its test. The UI button can wait.
- Phase 6 slips: the export stays, with its idempotency test. The notification log tests can be trimmed to the core events.
- Never drop: the scheme engine, the stock lock test, authorization tests, the AI fallback, desk approval, the payment failure path, and the labelled mocks.

Optional items (repeat order, 14-day list, export history) are considered only after Phase 6 is green.

## 13. Security checklist

- Demo OTP only when explicitly enabled outside production. Startup guard tested.
- No OTP values, session tokens, full phone numbers, LLM keys or full prompts in logs or notifications.
- Session tokens random, hashed at rest, expiring. Cookie flags as in section 8.
- Authorization on every route (role) and every record (ownership).
- Zod validation on every write. Strict schemas. Length limits on free text.
- Parameterised queries only. `$queryRaw` uses tagged templates, never string concatenation.
- CSRF: `SameSite=Lax` cookie, JSON content type required on writes, and an origin check on state-changing requests.
- Helmet with a content security policy. CORS limited to the web origin.
- LLM requests carry no prices, credit or other retailers' data (rule 14).
- Payment and messaging mocks never accept or store card numbers, bank details or real phone numbers.
- Secrets only in environment variables. `.env` is git-ignored. Scan the diff for key patterns before each push and before submission.
- `npm audit` run before submission. Result recorded in the TDD.
- Lock files committed.

## 14. Working on this project

Before writing code:
- Read this file and the existing code in the module you are changing.
- State which build phase and which rules in section 3 the change touches.
- If the change alters the schema, the API, a domain rule or an adapter, update the affected sections of this file and the TDD in the same change.

While writing code:
- Business rules go in services. Routes never import Prisma.
- Keep `packages/domain` free of I/O.
- External systems are called only through adapters in `platform/adapters`.
- Add or update tests in the same change.
- Small commits with clear messages. Do not squash the history. The reviewer reads it.
- Use domain names consistently: `Order`, `OrderLine`, `OrderEvent`, `Stock`, `Alias`, `AiDraft`, `ExportBatch`, `Notification`, `Scheme`.

Before declaring work done:
- Tests pass, including the affected authorization tests.
- No secrets in the diff.
- Every user-facing string is in i18n. Every price shows its GST label. Every mock is labelled.
- Loading, empty and error states exist for any new screen.
- New assumptions are added to the register.

Do not:
- Let the model write orders, prices, stock, schemes or payments.
- Use floats for money.
- Add GraphQL, microservices, Kubernetes, websockets, Redis, a message broker or a cart table. The cart lives in the browser.
- Hard-delete business records.
- Invent client facts beyond the problem statement.
- Claim the CSV imports into Tally until the client confirms the format.
- Claim a payment or message was real when it was a mock.
- Make the repository private before review is complete.

### 14.1 Assumptions register (required in the TDD)

Each entry has an ID, a statement, a status and the impact if it changes.

- **A1:** Dealer prices are per case. Impact if per pack: add `units_per_case`, compute case price in `money.ts`.
- **A2:** Sample prices are GST-inclusive. Impact if exclusive: the label and the export's tax columns change.
- **A3:** Free goods and slab discounts do not stack. One scheme per line, the better one for the retailer. Impact: scheme engine rule.
- **A4:** Stock is decremented on approval. No reservation table and no stock ledger. Impact: reconciliation needs a ledger.
- **A5:** Open credit exposure is orders in `pending_desk`, `on_hold` and `approved` that are not yet exported, excluding online-paid orders. Impact: changes the hold rule only.
- **A6:** Tally export is a documented CSV. The import format is to be confirmed by the client. Impact: export module only.
- **A7:** OTP sign-in is mocked with a demo code, delivered through the mock message sender. The Hindi vocabulary in 5.3 is limited to the words listed there.
- **A8:** The AI works on text only. Photos and voice notes are cut. The LLM is real in the demo and mocked in tests.
- **A9:** Salesmen, offline ordering, van loading lists, repeat order and the 14-day dashboard are outside the core build. Repeat order and the dashboard are included only if Phase 6 is green.
- **A10:** Payments, messages and Tally are mocked as described in 1.5. The mocks show their results in the UI, and no real money moves and no real message is sent.
- **A11:** Payment modes are credit account and mocked online payment. The demo outcome switch is a test control, labelled as demo, and is removed when a real gateway is configured.

### 14.2 Final checks

- Repository is public, with a README and an intact commit history.
- No secrets or real personal data in the repository or seed data.
- The demo runs from a clean clone by following `deployment.md` exactly.
- `deployment.md` lists every mocked system with its config key and mock mode, and the demo logins for each role.
- The seed fills every screen. No empty catalogue, no empty desk queue, no empty notification list.
- The payment failure path and the notification log both appear in the demo.
- The live AI check is recorded in the TDD, including any difference from the expected draft.
- Screenshots at 360px and 1280px are in `docs/screens/`.
- Lighthouse result on throttled 3G is in the TDD, including misses.
- `npm audit` result is in the TDD.
- The TDD opens with the GitHub URL and the live link, if deployed.

## 15. Scoring focus

- **Quality of work (50%):** core flows working on sample data, clean structure, tests for the hard parts, polished and consistent mobile UI with all states, basic security.
- **Problem solving (30%):** correct scheme and stock handling under concurrency, safe AI behaviour (draft, confirm, fallback, never trusting model output for money), sensible handling of payment and message failures, and clear trade-offs.
- **Communication (20%):** a TDD that explains decisions, labels every assumption and mock, states limits honestly, and lists what comes next.

Extra depth counts only when it is well judged. Never trade core quality for extra features.
