# Deployment & Demo Guide

## 1. System Requirements & Quick Start

- **Node.js**: v20+ or v22+
- **PostgreSQL**: 15+ (local or Docker Compose)
- **Package Manager**: npm (workspaces enabled)

### Local PostgreSQL with Docker Compose
```bash
docker compose up -d
```
Or use a local PostgreSQL instance by configuring `DATABASE_URL` in `.env`.

### Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```

Install all dependencies across the monorepo:
```bash
npm install
```

### Database Migration & Seed
Run Prisma migrations and seed realistic FMCG data:
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Run the Application
In separate terminal sessions:
```bash
# Terminal 1: Start Express API server (Port 4000)
npm run dev:api

# Terminal 2: Start Vite Web Client (Port 5173)
npm run dev:web
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 2. Mocked External Systems Register (Rule 1.5 & 10)

Every outside system sits behind an interface in `apps/api/src/platform/adapters/`. Mocks are enabled by default and clearly labelled in the UI.

| External System | Config Key | Demo Mode | UI Indicator | Description |
|---|---|---|---|---|
| **Messaging** | `MESSAGING_PROVIDER` | `mock` | `[DEMO MSG]` | Generates OTPs, delivers masked SMS to in-app log table. Never logs OTP values. |
| **Payment Gateway** | `PAYMENT_PROVIDER` | `mock` | `[DEMO PAYMENT]` | Simulated UPI / card payment. Includes demo success/fail toggle switch. Zero real money moves. |
| **Tally ERP** | `TALLY_EXPORTER` | `mock` (CSV) | `[TALLY EXPORT]` | Exports standard CSV file with SHA-256 batch hash. Direct Tally import pending client XML spec (A6). |
| **LLM Order Capture** | `LLM_PROVIDER` | `mock` / `gemini` | `[AI DRAFT]` | Extracts SKUs and units from freeform Hinglish text. Live Gemini provider ready when API key is provided. |

---

## 3. Demo Accounts & Credentials

OTP verification is mocked in development with demo code: `123456`.

| Role | Shop / User Name | Phone Number | Demo OTP | Default Screen |
|---|---|---|---|---|
| **Retailer** | Ramesh Kirana Store (Wright Town) | `+910000000001` | `123456` | `/catalogue` |
| **Retailer** | Gupta General Store (Napier Town) | `+910000000002` | `123456` | `/catalogue` |
| **Retailer (Near Limit)** | Shreeji Provisions (Gorakhpur) | `+910000000003` | `123456` | `/catalogue` |
| **Order Desk Lead** | Distributor Desk Lead (Jabalpur) | `+910000000099` | `123456` | `/desk` |
| **Desk Operator** | Desk Operator | `+910000000098` | `123456` | `/desk` |

---

## 4. Test Demo Walks

### Flow A: Retailer Catalogue & Scheme Preview
1. Sign in with phone `+910000000001` and OTP `123456`.
2. Browse products. Add 10 cases of **Parle-G Glucose Biscuit (SKU-BS-075)**.
3. Open Cart: verify scheme rule automatically awards **+1 Free Case** (Buy 10 Get 1 Free).
4. Add 5 cases of **Surf Excel 1kg (SKU-DT-1KG)**: verify **3% slab discount** applies with exact paise rounding down.
5. Select "Pay on Credit Account" and place order.
6. Order appears in order history with status `pending_desk`.

### Flow B: Simulated Payment Failure & Retry
1. In Cart, choose "Online Payment (Demo Gateway)".
2. Set demo test switch to "Demo: Payment Fails".
3. Submit order: order enters `payment_failed` status.
4. Go to Order History: see clear explanation and tap "Switch to Credit Account". Order resumes to `pending_desk`.

### Flow C: AI Order Capture & Alias Learning
1. Navigate to "AI Order Message" (`/ai-draft`).
2. Click "Fill with Official Demo Message":
   `bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti`
3. Click "Process Order Message":
   - "biscuit chhota" resolves immediately via active shop alias to **SKU-BS-075** (High confidence).
   - "washing powder 1 kilo" resolves to **SKU-DT-1KG**.
   - "chai patti 250" resolves to **SKU-TE-250** and is flagged **Out of Stock**.
4. Confirm draft to place order.

### Flow D: Distributor Order Desk & Tally CSV Export
1. Sign in as desk user `+910000000099` (OTP `123456`).
2. View Desk Queue (`/desk`): see pending orders with AI badges.
3. Open order detail: click "Approve & Allocate Stock" (executes concurrency-safe PostgreSQL stock lock).
4. Go to "Tally Export" (`/desk/exports`): select approved orders and click "Export to Tally CSV". Download the generated CSV file.
