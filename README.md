# Nimia Games — Monorepo

Turborepo monorepo untuk seluruh platform Nimia Games. Lihat `docs/ARCHITECTURE.md` untuk rencana lengkap & alasan desain tiap tahap.

## Struktur

```
apps/
  www/       -> nimiagames.com (landing page, company site)
  studio/    -> nimiastudio.com (marketing + order funnel entry)
  app/       -> app.nimiastudio.com (client dashboard, order wizard, negotiations)
  admin/     -> hub.nimiastudio.com (staff/founder back office)
  portfolio/ -> portfolio.nimiastudio.com — belum dibuat, tahap berikutnya

packages/
  ui/         -> shared shadcn/ui components & design tokens
  db/         -> Supabase client, migration SQL, generated types
  email/      -> template React Email untuk Resend
  discord/    -> Discord bot helpers (notifications, OAuth, tickets)
  pdf/        -> receipt/invoice PDF generation
  auth/       -> helper Supabase Auth (session, role guard)
  validators/ -> skema Zod bersama (order form, auth, contact)
  config/     -> shared tsconfig/eslint preset
```

## Menjalankan

```bash
npm install
npm run dev:www      # nimiagames.com
npm run dev:studio   # nimiastudio.com (marketing)
npm run dev:app      # app.nimiastudio.com (client dashboard)
npm run dev:admin    # hub.nimiastudio.com (staff back office)
```

## Testing

```bash
npm test             # runs every workspace's automated tests via turbo
```

See `TESTING.md` for the full convention (how to add tests to a new
package, what's covered today, and suggested next targets).

## Status

Lihat `docs/ARCHITECTURE.md` bagian "Urutan Tahap Kerja" untuk status tiap tahap (arsitektur, struktur folder, database, UI, backend, testing). Lihat juga `packages/db/migrations/verify_migrations_status.sql` untuk cek status migrasi Supabase mana yang sudah jalan di production.
