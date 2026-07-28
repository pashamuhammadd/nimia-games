# @nimia/db

Supabase client (`@supabase/supabase-js` + `@supabase/ssr`), migration SQL, dan generated types untuk seluruh 17 tabel modul studio (users, clients, orders, projects, invoices, dst — lihat `docs/ARCHITECTURE.md` bagian 3).

Struktur rencana:

```
packages/db/
  migrations/   -> file SQL migration bernomor urut, siap di-apply ke Supabase project
  src/
    client.ts   -> factory Supabase client (server & browser)
    types.ts    -> generated types dari schema
    index.ts
```

Status: kosong (placeholder). Diisi di **Tahap 3** — setelah Anda punya project Supabase, saya tulis migration SQL + RLS policy lengkap di sini. Belum ada akun Supabase per keputusan Tahap 1.
