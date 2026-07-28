# Nimia Games — Monorepo

Turborepo monorepo untuk seluruh platform Nimia Games. Lihat `docs/ARCHITECTURE.md` untuk rencana lengkap & alasan desain tiap tahap.

## Struktur

```
apps/
  www/       -> nimiagames.com (landing page, sudah live)
  studio/    -> studio.nimiagames.com (order system, client dashboard, invoice) — sedang dibangun
  portfolio/ -> portfolio.nimiagames.com — belum dibuat, tahap berikutnya

packages/
  ui/         -> shared shadcn/ui components & design tokens
  db/         -> Supabase client, migration SQL, generated types
  email/      -> template React Email untuk Resend
  auth/       -> helper Supabase Auth (session, role guard)
  validators/ -> skema Zod bersama (order form, invoice, dll)
  config/     -> shared tsconfig/eslint preset
```

## Menjalankan

```bash
npm install
npm run dev:www      # jalankan situs utama (nimiagames.com) di localhost
npm run dev:studio   # jalankan studio.nimiagames.com di localhost
```

## Status

Lihat `docs/ARCHITECTURE.md` bagian "Urutan Tahap Kerja" untuk status tiap tahap (arsitektur, struktur folder, database, UI, backend, testing).
