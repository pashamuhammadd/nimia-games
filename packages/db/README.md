# @nimia/db

Supabase client + database schema for the studio platform (orders, projects, invoices, receipts, portfolio, and everything else — see `docs/ARCHITECTURE.md` section 3 for the full table list and design rationale).

## Structure

```
packages/db/
  migrations/     -> numbered SQL files, apply in order — see migrations/README.md
  src/
    client.ts     -> Supabase client for Client Components (browser)
    server.ts     -> Supabase client for Server Components / Actions / Route Handlers
    types.ts      -> placeholder for `supabase gen types typescript` output
    index.ts
```

## Status

Schema is **written** (Tahap 3), but there is no live Supabase project behind it yet — you haven't created one (per the Tahap 1 decision). Once you do:

1. Apply the migrations — see `migrations/README.md`.
2. Fill in `apps/studio/.env.example` (copy to `.env.local`) with your project's URL + keys.
3. Run `npm install` at the repo root so `@supabase/supabase-js` and `@supabase/ssr` actually get installed (they're declared in this package's `package.json` but won't be in `node_modules` until you do).
4. Optionally generate real types into `src/types.ts` (command in `migrations/README.md`).

`apps/studio` doesn't import anything from this package yet — that wiring happens in **Tahap 4** (auth pages, dashboard shell) and **Tahap 5** (order/invoice server actions).
