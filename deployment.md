# Deployment

Company A Orders is one Node.js service (Express API that also serves the React app built by Vite) and one PostgreSQL database.

```
shared/   pure TypeScript used by both sides (scheme engine, capture reader, Tally writer, API types)
server/   Express API  →  Prisma  →  PostgreSQL
web/      React + Vite single-page app
prisma/   schema, migrations, fictional seed data
```

## Run it locally

You need **Node.js 20 or newer** and **PostgreSQL 15 or newer** (any local install, Docker, or a free cloud database).

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create two empty databases: one for the app and one for tests.

   ```bash
   createdb kirana_orders
   ```

   ```bash
   createdb kirana_test
   ```

3. Create `.env` from the template and fill it in.

   ```bash
   cp .env.example .env
   ```

   For a local demo, these values work (use your own Postgres user and password):

   ```
   DATABASE_URL=postgresql://postgres:<password>@localhost:5432/kirana_orders
   TEST_DATABASE_URL=postgresql://postgres:<password>@localhost:5432/kirana_test
   SESSION_SECRET=<run: openssl rand -base64 48>
   DEMO_MODE=true
   LLM_PROVIDER=none
   ```

   To read messages with Gemini instead of the rule-based reader, create a key at https://aistudio.google.com/apikey and set:

   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=<your key>
   ```

   Gemini also turns on **photo of a list** and **voice note** capture (without a key those buttons explain they need it). Recording a voice note in the browser needs HTTPS (or localhost).

   The free tier allows 5 requests a minute and is sometimes busy; whenever Gemini can't answer, the app falls back to the rule-based reader by itself. Compare Gemini with the rule-based reader on the four sample messages (takes about a minute; calls are paced):

   ```bash
   npm run ai:check
   ```

4. Create the tables and load the sample data (18 shops, 43 SKUs including 22 deliberate look-alikes, about 218 past orders, 4 WhatsApp messages waiting).

   ```bash
   npx prisma migrate deploy
   ```

   ```bash
   npm run db:seed
   ```

5. Start the API and the web app together (API on :4000, web on :5173 with hot reload).

   ```bash
   npm run dev
   ```

6. Open http://localhost:5173 and sign in with a demo account below.

### Checks

```bash
npm test
```

Runs 151 tests (no Gemini key needed: the AI adapter is tested with a mocked SDK). The 25 database and API tests use `TEST_DATABASE_URL`; they are skipped if it is not set. Apply migrations to the test database once first:

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
```

```bash
npm run lint
```

```bash
npm run typecheck
```

### Production build on your machine

```bash
npm run build
```

```bash
npm start
```

`npm run build` builds the React app into `dist/web` and bundles the API into `dist/server.js`. `npm start` serves both on http://localhost:4000.

To reset the demo data at any time:

```bash
npm run db:seed
```

## Demo logins

SMS is mocked. With `DEMO_MODE=true` the login screen lists these accounts, and after **Get code** the 6-digit code appears on screen. Every phone number below is fictional.

| Role | Phone | What to try |
|---|---|---|
| Retailer: Sharma General Store | `9000000001` | Hindi interface; catalogue, repeat last order, cart with free goods and slab discount; "Type order" with the brief's message |
| Retailer: Gupta Kirana | `9000000002` | Close to its credit limit: an order over credit goes on hold |
| Order desk: Anjali | `9000000100` | Inbox with 4 WhatsApp messages (the first is the brief's sample), credit hold, Tally export, van loading, quiet shops |
| Order desk: Imran | `9000000101` | Second desk user |

Any other seeded retailer can sign in with `90000000NN`, NN = 01 to 18.

## How it is deployed (Render)

The repository includes a Render Blueprint, `render.yaml`. It creates one Node web service (API and
React app in one process) and one PostgreSQL database, both in Singapore, the Render region closest
to India.

1. **Push the code to GitHub.** Render deploys from the repository.

   ```bash
   git push origin main
   ```

2. **Create the services.** In the Render dashboard choose **New → Blueprint**, connect GitHub,
   pick this repository and click **Apply**. Render reads `render.yaml` and creates
   `company-a-orders` (web) and `company-a-db` (Postgres). `DATABASE_URL` and `SESSION_SECRET` are
   filled in automatically.

3. **Fill the two values Render asks for:**
   - `GEMINI_API_KEY`: your Google AI Studio key, or leave it empty to use only the rule-based reader
     (photo and voice capture then say they need the AI reader).
   - `APP_ORIGIN`: the service URL, for example `https://company-a-orders.onrender.com`. If you don't
     know it yet, put that guess in, deploy, then correct it under **Environment** and redeploy.

4. **Wait for the first deploy.** The build runs `npm ci`, `npm run build` and
   `npx prisma migrate deploy` (creates the tables). Render then starts the app with `npm start`
   and checks `/api/health`.

5. **Load the demo data once.** Free Render services have no shell, so run the seed from your own
   machine against the database's **External Database URL** (Render → `company-a-db` → Connect):

   ```bash
   DATABASE_URL="<External Database URL>?sslmode=require" npm run db:seed
   ```

   The seed wipes and reloads the demo data, so it is not part of the build. Run it again whenever
   you want to reset the demo.

6. **Open the URL** and sign in with a demo account below. With `DEMO_MODE=true` the OTP appears on
   screen.

**Things to know about the free plan**

- The web service sleeps after 15 minutes without traffic; the first request after that takes about
  30–60 seconds while it wakes. Open the link a minute before a demo, or use a paid instance
  (about $7 a month) to keep it awake.
- Render's free Postgres expires after 30 days. For a longer review, upgrade it, or put a Neon or
  Supabase connection string (Mumbai or Singapore) in `DATABASE_URL` instead.
- Don't add `NODE_ENV=production` as an environment variable: the build needs dev tools that npm
  skips in production mode. `npm start` sets it for the running app.
- Voice recording needs HTTPS, which Render provides.

**Other hosts.** Any Node 20+ host works the same way: build command
`npm ci && npm run build && npx prisma migrate deploy`, start command `npm start`, health check
`/api/health`, plus the environment variables below.

## Environment variables

Names only. Never commit values. `.env.example` lists the same names.

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes | At least 32 random characters; signs session cookies and hashes OTPs |
| `DEMO_MODE` | yes | `true` shows demo accounts and on-screen OTPs (SMS is mocked). `false` for a real launch with an SMS provider |
| `APP_ORIGIN` | in production | Public URL of the app, e.g. `https://orders.example.in`. State-changing requests from other origins are refused |
| `PORT` | no | Port to listen on (default 4000; most hosts set it) |
| `NODE_ENV` | no | `npm start` sets `production` |
| `LLM_PROVIDER` | no | `gemini` to use Google Gemini for reading messages; `none` (default) uses the built-in rule-based reader |
| `GEMINI_API_KEY` | only with `LLM_PROVIDER=gemini` | Google AI Studio API key (free tier works) |
| `LLM_MODEL` | no | Override the Gemini model (default `gemini-3.5-flash-lite`, measured at about 2–4 s per message) |
| `LLM_TIMEOUT_MS` | no | How long to wait for Gemini before using the rule-based reader (default 15000) |
| `TEST_DATABASE_URL` | tests only | Separate database for integration tests |

## Mocked outside systems

As the brief allows, these are mocked:

- **SMS for OTP:** the code is shown on screen in demo mode and logged (masked) on the server. `server/src/services/messaging.ts` is where a DLT-registered SMS provider would plug in.
- **WhatsApp:** the desk pastes a message and picks the shop. A WhatsApp Business webhook would call the same `POST /api/captures`.
- **Tally:** the desk downloads a Tally Prime XML (Import → Vouchers) or CSV. Stock and outstanding come from the seed instead of a Tally sync.
- **Payments:** none (out of scope).
