# Kukke Yatra — React + Supabase

A faithful React/TypeScript port of `Kukke Yatra.html` with two dynamic features:

1. **Live PNR status** — proxied through a Supabase Edge Function that holds the RapidAPI key server-side and caches responses for 10 minutes.
2. **PIN-gated expense tracker** — reads are public, every write requires a shared 4-digit PIN that is hashed (PBKDF2-SHA256, 120k iters) and stored in `app_settings`. The raw PIN never reaches the browser.

The static itinerary (days, trains, hotel, plans, map pins) lives in `src/data/trip.ts`. Only **expenses** and **PNR cache** live in the database.

---

## Project layout

```
.
├── index.html                    Vite entry
├── src/
│   ├── App.tsx                   composes Hero + Timeline + ExpenseTracker
│   ├── components/               Hero, Timeline, TrainCard, HotelCard, PlanCard, PnrPanel, ExpenseTracker, PinModal, MapPin
│   ├── data/trip.ts              typed itinerary + map pin lookup + expense categories
│   ├── lib/                      supabase client, api wrappers, pin (session), maps helpers
│   └── styles/global.css         ported design tokens + all component styles
├── supabase/
│   ├── config.toml
│   ├── migrations/20260530000001_init.sql
│   └── functions/
│       ├── _shared/              cors + pin (PBKDF2 hash/verify, service client)
│       ├── pnr-status/           RapidAPI proxy with 10-min cache
│       ├── expense-write/        PIN-gated create/update/delete + verify
│       └── seed-pin/             one-shot hash of EXPENSE_PIN into app_settings
├── .env.example
└── Kukke Yatra.html              original single-file source of truth
```

---

## One-shot setup (recommended)

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, RAPIDAPI_KEY_1, RAPIDAPI_NICK_1, EXPENSE_PIN
./setup.sh
# (prompts once for your service_role key — never written to disk)
```

That runs every step below in order, idempotently: installs the Supabase CLI (via Homebrew if missing), links the project, pushes the migration, sets secrets, deploys all three functions, seeds the PIN hash, and runs a smoke test against the expenses table and pnr-status function. Pass `--force-pin` to overwrite the seeded PIN.

The manual steps that follow are useful for understanding what `setup.sh` does, or for re-running individual pieces.

---

## 1. Local prerequisites

- Node 18+ (you have 25 — fine).
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`).

## 2. Create the Supabase project

1. Sign in at https://supabase.com → **New Project**.
2. Copy `Project URL`, `anon` key, and `service_role` key from **Project Settings → API**.
3. Link the CLI:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

## 3. Run the migration

```bash
supabase db push
```

This creates `expenses`, `pnr_cache`, `app_settings`, enables RLS, seeds the default expense rows, and adds the `updated_at` trigger.

## 4. Set Edge Function secrets

You can configure **one or many RapidAPI keys**. Numbered env vars are tried in order; on `429 / 401 / 403` the function falls through to the next. The nickname (`RAPIDAPI_NICK_<n>`) is recorded in `pnr_cache.source` and shown in the UI so you can see which key served each row.

```bash
# Required: one or more RapidAPI keys
supabase secrets set RAPIDAPI_KEY_1=<your_first_key>
supabase secrets set RAPIDAPI_NICK_1=primary       # optional nickname
supabase secrets set RAPIDAPI_KEY_2=<your_second_key>
supabase secrets set RAPIDAPI_NICK_2=backup

# Required: the 4-digit PIN that gates expense writes
supabase secrets set EXPENSE_PIN=<4-digit-pin>
```

Adding a new key later is just `supabase secrets set RAPIDAPI_KEY_3=…` + redeploy. A legacy single `RAPIDAPI_KEY` is also accepted as a fallback if no numbered keys are set.

> **Security:** these are server-only — they never get a `VITE_` prefix and are not bundled into the client. Rotate any RapidAPI key that's ever been pasted publicly; the value in this repo's `.env.example` should be considered compromised.

## 5. Deploy the Edge Functions

```bash
supabase functions deploy pnr-status
supabase functions deploy expense-write
supabase functions deploy seed-pin
```

## 6. Seed the PIN (one shot)

Run this **once** after `seed-pin` is deployed to hash the PIN you set in step 4 into `app_settings`:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/seed-pin" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response: `{"ok":true,"status":"seeded"}`. To rotate later, change `EXPENSE_PIN`, redeploy, and call again with `{"force":true}`.

## 7. Frontend env

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# (RAPIDAPI_KEY and EXPENSE_PIN are NOT used by the browser)
```

## 8. Dev / build

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks then bundles into ./dist
```

## 9. Deploy the frontend

The `dist/` folder is fully static. Drop it on Vercel, Netlify, Cloudflare Pages, or any CDN. Set the same two `VITE_…` env vars on the host.

---

## How the features work

### PNR status (`POST /functions/v1/pnr-status`)

Body `{ "pnr": "4438870715", "refresh": false }`. Logic:

1. **Cache-first.** If a `pnr_cache` row exists *and* `refresh !== true`, return it immediately with `cached: true` — no API call. The UI renders this instantly.
2. **Refresh on demand.** When the user clicks the **↻ Refresh** button in the panel, the frontend re-calls the function with `refresh: true`. The function walks through the configured keys (`RAPIDAPI_KEY_1`, `_2`, …) in order, retrying on `429 / 401 / 403`, upserts the row with `source = <nickname>`, and returns `cached: false`.
3. **Graceful failure.** If every key fails *and* a cached row exists, the function returns the cache with `stale: true` and the error in `error`. If no cache and no keys, returns 502.

Response shape:
```ts
{
  status_json: any;          // raw RapidAPI payload (or whatever was cached)
  summary: string | null;    // "CNF / WL1" style summary used for badges
  source: string | null;     // nickname of the key that fetched the row
  fetched_at: string;        // ISO timestamp
  cached: boolean;           // false only when we just hit RapidAPI
  stale?: boolean;           // true when returning cache because refresh failed
  error?: string;
  attempts?: Array<{ nick: string; ok: boolean; status?: number; error?: string }>;
}
```

The `PnrPanel` component renders defensive field parsing (matches the original HTML's `field()` fallback list), color-codes CNF/RAC/WL, and shows a `Cached` / `Fresh` / `Stale` tag, the `source` nickname, and a relative "last checked".

### Attachments (`POST /functions/v1/attachments`)

Each train card, hotel card, and expense row supports multi-file attachments — PhonePe screenshots, IRCTC ticket PDFs, hotel invoices, taxi bills, etc.

- **Storage:** files live in a **private** Supabase Storage bucket called `attachments`. The browser never gets a direct read URL; the function mints a 60-second signed URL each time the user views a file.
- **Limits:** up to **10 MB per file**; `image/*` or `application/pdf` only. Enforced server-side; client gates pre-upload too.
- **PIN gating:**
  - `list` is open (so previews load without unlocking)
  - `create` and `delete` require the PIN — same shared session as expense writes
- **Targets:**
  - `expense` → `target_id` = expense UUID. Click the paperclip icon on any row to expand the attachments panel.
  - `train` → `target_id` = PNR string. Always-visible strip at the bottom of each train card.
  - `hotel` → `target_id` = booking number from the booking chip. Always-visible at the bottom of the hotel card.

The `attachments` table is RLS-locked (no anon access); all access goes through the Edge Function using the service-role client. The private bucket is created idempotently by the migration.

### Expenses + PIN

- Reads are direct `supabase.from('expenses').select(...)`, allowed by RLS (anon `select` policy).
- Every write (`create | update | delete | verify`) calls `expense-write` with `{ pin, action, payload }`. The function:
  1. Constant-time verifies the PIN against the PBKDF2 hash in `app_settings`.
  2. On mismatch returns `401 unauthorized`.
  3. On match performs the mutation with the service-role client (RLS bypassed).
- The browser caches a 15-minute unlock token in `sessionStorage` so the user isn't re-prompted between edits. Re-lock on expiry or page reload.
- The `PinModal` does 4 numeric inputs, auto-advance, paste-friendly (4-digit paste fills all), Esc to cancel, and shakes on wrong PIN.

### Map pins

All `mapln` links open in a real top-level tab via `window.open(url, '_blank')` with `w.opener = null` — never framed. URLs use `https://www.google.com/maps/search/?api=1&query=<encoded>`.

---

## RLS summary

| Table | anon select | anon writes | service role |
|---|---|---|---|
| `expenses` | ✅ | ❌ (via `expense-write`) | full |
| `pnr_cache` | ✅ | ❌ (via `pnr-status`) | full |
| `attachments` | ❌ (via `attachments` list) | ❌ (via `attachments` create/delete) | full |
| `app_settings` | ❌ | ❌ | full |
| Storage `attachments` bucket (private) | ❌ direct (signed URLs only) | ❌ (via `attachments`) | full |

The anon key in `.env` is a public client identifier (that's the Supabase model) — RLS is what actually protects the data.
