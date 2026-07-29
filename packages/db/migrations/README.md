# Cara apply migration ini

Ditulis untuk **Supabase (Postgres)**. Jalankan file `.sql` di folder ini **berurutan sesuai nomornya** (0001 → 0006) — jangan diacak, karena tiap file bergantung pada tabel/fungsi dari file sebelumnya.

## Opsi A — Supabase SQL Editor (paling gampang, tanpa install apa-apa)

1. Buka project Supabase Anda → menu **SQL Editor** di sidebar kiri.
2. Klik **New query**.
3. Buka `0001_enums_and_users.sql` di sini, copy semua isinya, paste ke SQL Editor, klik **Run**.
4. Kalau sukses (tidak ada error merah), ulangi untuk `0002`, `0003`, `0004`, `0005`, `0006` — satu per satu, tunggu masing-masing sukses dulu sebelum lanjut ke nomor berikutnya.
5. Kalau ada error di salah satu file, **stop di situ**, jangan lanjut ke file berikutnya — screenshot error-nya dan kirim ke saya, biasanya cuma perlu 1 baris diperbaiki.

## Opsi B — Supabase CLI (kalau nanti sudah setup CLI + local dev)

```bash
supabase db push
```

CLI akan otomatis jalankan semua file di `migrations/` sesuai urutan nama file, asal foldernya memang folder migration resmi project Supabase Anda (biasanya perlu `supabase init` dan pindahkan file-file ini ke `supabase/migrations/` dengan format nama yang CLI harapkan — kalau mau pakai jalur ini nanti, bilang saja, saya bantu sesuaikan).

## Apa isinya, singkatnya

| File | Isi |
|---|---|
| `0001` | Extension, helper `set_updated_at()`, semua enum, tabel `users` |
| `0002` | `clients`, `services`, `portfolio` + `portfolio_categories` + `portfolio_tags` |
| `0003` | `orders`, `order_files`, `projects`, `project_updates` (timeline otomatis via trigger) |
| `0004` | `messages`, `project_files`, `notifications`, `email_logs` |
| `0005` | `invoices`, `invoice_items`, `payments`, `receipts` + nomor otomatis `INV-YYYYMMDD-####` / `RCT-YYYYMMDD-####` |
| `0006` | Trigger auto-buat profil `users` saat signup, **aktifkan Row Level Security + semua policy** di semua tabel |

Jangan skip `0006` — tanpa itu, RLS tidak aktif dan semua data bisa diakses siapa saja yang punya API key (anon key publik). Ini yang bikin client A tidak bisa lihat data client B.

## Setelah semua migration jalan

1. Ambil `Project URL` dan `anon public key` dari **Settings → API** di dashboard Supabase Anda.
2. Isi ke `apps/studio/.env.example` (copy jadi `.env.local`, isi nilainya):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   (dari Settings -> API juga, JANGAN pernah expose ke client)
   ```
3. Generate TypeScript types dari schema (opsional tapi sangat disarankan, biar query ke Supabase type-safe):
   ```bash
   npx supabase gen types typescript --project-id <project-ref> > packages/db/src/types.ts
   ```
   (`<project-ref>` ada di URL dashboard project Anda, atau di Settings → General.)

Kalau semua di atas sudah, kabari saya — lanjut ke **Tahap 4** (UI dasar studio: shadcn/ui, halaman login/register, form Order Service) yang bakal mulai benar-benar konek ke database ini.
