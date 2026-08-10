# Cara apply migration ini

Ditulis untuk **Supabase (Postgres)**. Jalankan file `.sql` di folder ini **berurutan sesuai nomornya** (0001 → 0016 dan seterusnya) — jangan diacak, karena tiap file bergantung pada tabel/fungsi dari file sebelumnya. `0011` dan `0012` masing-masing HARUS di-Run sendiri (terpisah dari file lain) karena menambah value enum baru — lihat komentar di dalam file itu.

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
| `0007` | Trigger signup di atas diperluas: auto-buat juga row `clients` |
| `0008`–`0010` | Seed & perbaikan data katalog `services` |
| `0011` | Tambah role `staff`/`founder` (jalankan SENDIRI) |
| `0012` | Tambah value `order_status` baru untuk alur negosiasi/pembayaran (jalankan SENDIRI) |
| `0013` | Negosiasi harga, wallet crypto, kolom pembayaran di `orders`, + Ambassador Program lama (`ambassador_applications`/`ambassadors`/`referrals`/`commissions`) — **program ini SUDAH digabung ke Partner Program oleh `0016`, tabelnya di-rename jadi `*_legacy`** |
| `0014`–`0015` | Tambah network TON, konfigurasi wallet & currency |
| `0016` | **Nimia Partner Program** — tabel `partners`/`partner_referrals`/`partner_rewards`, generator kode referral, reward otomatis (trigger saat order `paid` + saat project `completed`), auto-provision partner row saat signup (extend trigger `handle_new_auth_user`), backfill user lama, MERGE data Ambassador Program (`0013`) ke sini. Prasyarat: `0011`–`0015` harus sudah jalan duluan. |
| `0017` | Tambah 4 value `service_category` baru (Animation/Digital Assets/Website Development/Game Development) untuk katalog `/order` Project Configurator |
| `0018` | Seed 32 `services` katalog `/order` dengan uuid tetap (dipakai langsung oleh kode TypeScript). Harus jalan sendiri, setelah `0017` |
| `0019` | Client bisa terima/tolak counter offer staff — `accept_negotiation_offer()`/`reject_negotiation_offer()` (SECURITY DEFINER, re-derive harga dari `order_negotiations`, bukan dari input client) |
| `0020` | **Security fix (P0.5 audit)** — tutup 3 celah RLS di alur uang: (1) trigger paksa `order_negotiations.proposed_by` dari role asli, (2) `submit_payment_transaction()` (SECURITY DEFINER) gantikan update langsung klien ke `orders` untuk submit pembayaran, (3) `orders_insert_own` diperketat supaya order baru dari client tidak bisa langsung "paid"/harga palsu |
| `0021` | **Vouchers** — tabel `vouchers`/`voucher_redemptions`, kode otomatis di-normalize uppercase, `apply_voucher_to_order()` (SECURITY DEFINER) satu-satunya cara redeem, diskon persentase pada `orders.final_price_usd` |
| `0022` | **Quests** — tabel `quest_definitions` (4 quest awal: First Order, Loyal Client, Big Spender, Bring a Friend) + `client_quest_completions`, `check_and_award_quests()` otomatis kasih Voucher reward saat order jadi `paid` (trigger terpisah dari komisi Partner Program). Harus jalan setelah `0021` (reward = Voucher) dan `0016` (referral count pakai `partner_paid_clients_count()`) |
| `0023` | **Fix bug quest tidak ke-claim** — `get_client_quest_progress()` sekarang juga menjalankan `check_and_award_quests()` setiap kali halaman Quests dibuka (bukan cuma saat order baru saja jadi `paid`), supaya quest yang progress-nya sudah tercapai SEBELUM fitur ini ada (mis. order lama yang sudah `paid`) tetap otomatis dapat voucher reward begitu halaman dibuka, tanpa perlu tombol "klaim" manual |
| `0024` | **Invoice/PDF — Receipt** — tabel baru `order_receipts` (nomor otomatis `RCT-YYYYMMDD-####`, reuse fungsi `next_document_number()` dari `0005`, BUKAN reuse tabel `invoices`/`payments`/`receipts` lama di `0005` yang memang sudah tidak dipakai kode manapun), trigger otomatis bikin receipt saat order jadi `paid`, + `get_or_create_order_receipt()` (SECURITY DEFINER, self-healing sama seperti fix `0023` — jalan juga saat halaman/PDF dibuka, bukan cuma andalkan trigger) yang dipakai route `GET /api/orders/[id]/receipt` di `apps/studio` & `apps/admin` untuk generate PDF-nya (`@nimia/pdf`, pakai `@react-pdf/renderer`). Independen dari `0021`–`0023`, tapi harus jalan setelah `0005` (butuh `next_document_number`) dan `0006` (butuh `is_owner_client`/`is_admin`) |
| `0025` | **Discord — account linking** — kolom `clients.discord_user_id`/`discord_username`/`discord_avatar_url`/`discord_connected_at` (partial unique index), `connect_discord_account()`/`disconnect_discord_account()` (SECURITY DEFINER) dipakai route OAuth `apps/studio/app/api/discord/callback/route.ts`. Lihat `docs/DISCORD.md` untuk spec lengkap integrasi Discord-nya |
| `0026` | **Discord — auto-thread per order** — kolom `orders.discord_thread_id`, `set_order_discord_thread_id()` (SECURITY DEFINER, dipakai `submitOrderAction` di `apps/studio` buat nyimpen thread ID yang baru dibuat `notifyNewOrder`, karena `orders_update_admin_only` blokir client update langsung ke `orders`). Harus jalan setelah `0006` (butuh `is_admin()`) |
| `0027` | **Discord — support tickets** — enum `support_ticket_status`, tabel baru `support_tickets` (snapshot nama/email client, sama pola dengan `orders`), RLS `select_own_or_admin`/`insert_own`/`update_admin_only`, `set_support_ticket_discord_thread_id()` (SECURITY DEFINER). Dipakai halaman baru `apps/studio/app/dashboard/support/` (client bikin ticket) dan `apps/admin/app/(protected)/tickets/` (staff lihat & close). Harus jalan setelah `0006` |

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
