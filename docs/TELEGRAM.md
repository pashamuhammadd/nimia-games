# Nimia Studio × Telegram — Architecture Analysis

Status: analysis only, belum ada kode. Disusun 20 Agustus 2026 berdasarkan audit langsung ke monorepo `nimia-games` (bukan asumsi) — lihat catatan "Grounded in the actual repo" di bawah sebelum bagian analisis.

---

## 0. Grounded in the actual repo (temuan penting sebelum menjawab 20 poin)

Sebelum menjawab, ini fakta dari codebase yang mengubah beberapa asumsi di brief:

1. **`packages/telegram` SUDAH ADA** — tapi bukan untuk ini. Package ini (`@nimia/telegram`) dibangun 19–20 Agustus 2026 murni untuk **AI Prospect Hunter**: broadcast satu-arah (`sendMessage`/`sendPhoto`) ke SATU channel internal (`TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID`) tiap kali AI menemukan project crypto/web3 baru yang relevan untuk Partner Program. Tidak ada webhook, tidak ada penanganan update, tidak ada linking user — murni `fetch` satu arah dari `apps/admin`. **Ini harus dianggap sebagai titik awal (skeleton) yang perlu diperluas besar-besaran, bukan sistem yang sudah siap dipakai untuk client-facing bot.** Bot Telegram yang dipakai AI Prospect Hunter sebaiknya TETAP terpisah dari bot client-facing baru ini — beda persona (internal tool vs. produk publik), beda permission model.
2. **`packages/auth` (`@nimia/auth`) masih placeholder kosong.** Semua session/role-guard logic saat ini tersebar langsung di tiap app (Supabase SSR client + RLS), belum ada helper terpusat. Ini relevan karena Mini App butuh pola auth yang agak berbeda (lihat §7) — jangan berasumsi ada helper auth siap pakai untuk diimpor.
3. **Arsitektur inbound-webhook-dari-platform-eksternal SUDAH ADA presedennya, lengkap, dan sudah battle-tested: Discord.** `packages/discord` + `docs/DISCORD.md` adalah cetak biru yang PALING relevan untuk seluruh proyek ini — prinsip "website = single source of truth, bot cuma notification/gateway, tidak ada proses persisten, verifikasi signature di server, service-role client untuk request yang tidak punya session" itu SAMA PERSIS dengan apa yang dibutuhkan Telegram. Saya akan merujuk pola ini berkali-kali di bawah karena mengikutinya berarti jauh lebih sedikit desain baru yang harus diverifikasi dari nol.
4. **Monorepo aktual:** Turborepo + npm workspaces. `apps/www` (nimiagames.com, company site) · `apps/studio` (nimiastudio.com, marketing + funnel masuk) · `apps/app` (app.nimiastudio.com, client dashboard — order, negosiasi, pembayaran, partners, vouchers, quests, support, notifications, Discord OAuth) · `apps/admin` (hub.nimiastudio.com, staff/founder) · `apps/portfolio` (belum dibuat). `packages/db` (Supabase client + migrations SQL + service-role client), `packages/discord`, `packages/telegram`, `packages/auth`, `packages/ui`, `packages/email`, `packages/pdf`, `packages/validators`, `packages/config`.
5. **Pelajaran mahal yang sudah ada di histori proyek ini, relevan langsung:** (a) level Partner (Bronze/Silver/Gold/Platinum) dan threshold-nya ter-duplikasi manual di 3+ tempat (SQL function, 2 file TS terpisah di studio & admin) — kalau Mini App menambah tempat ke-4/5, itu akan jadi sumber bug yang sama persis. (b) Route inbound Discord (interactions endpoint) sempat dipindah dari `apps/studio` ke `apps/app` saat refactor 14 Agustus, dan dokumentasinya (`docs/DISCORD.md`) sempat basi (`stale`) menyebut app lama selama beberapa hari sampai ketahuan lewat bug produksi. Pelajaran: **tentukan SATU app pemilik semua route inbound Telegram sejak awal**, dan jangan biarkan dokumentasi menyebut lokasi kode tanpa cross-check berkala.

Sisa dokumen ini menjawab 20 poin yang diminta, dengan asumsi di atas sebagai dasar.

---

## 1. Apakah arsitektur yang diusulkan sudah tepat?

**Ya, pendekatannya benar** — dan ini bukan hal baru untuk proyek ini: bentuknya sama persis dengan yang sudah dibuktikan berjalan lewat integrasi Discord (satu backend Supabase, banyak "permukaan" di atasnya — website, admin, Discord — tanpa database atau sistem akun terpisah). Telegram tinggal jadi permukaan ke-2 dengan pola yang sama.

Ada satu koreksi kecil terhadap diagram di brief: **"Telegram" bukan satu blok tunggal di sisi yang sama dengan "Web App".** Ada dua peran yang sangat berbeda:

- **Telegram Bot** = persis seperti Discord bot sekarang: lapisan notifikasi + gateway tipis, tanpa proses persisten, tanpa UI sendiri yang kompleks.
- **Telegram Mini App** = pada dasarnya **aplikasi ke-6 di monorepo** (setelah www/studio/app/admin/portfolio), dengan UI penuh, bukan "fitur di dalam bot". Ini bagian yang paling mirip kerja pembuatan `apps/app` dari nol, hanya dengan constraint UI Telegram.

Diagram yang lebih akurat:

```
                         NIMIA STUDIO — SATU BACKEND
                    Supabase (Postgres + Auth + RLS + Storage)
                                     |
        +--------------+--------------+--------------+--------------+
        |              |              |              |              |
  apps/studio      apps/app       apps/admin     apps/telegram-bot  apps/miniapp
  (marketing,      (client        (staff/        (webhook +        (Telegram
   funnel entry)    dashboard)     founder)        deep-link         WebApp UI,
                                                    gateway, TIDAK    "app ke-6")
                                                    render UI)
```

`apps/telegram-bot` di diagram di atas TIDAK harus jadi app terpisah secara fisik — bisa berupa satu route handler yang hidup di dalam `apps/miniapp` (rekomendasi saya, lihat §13). Yang penting secara konsep dipisahkan: bot = gateway tanpa state UI, mini app = permukaan UI penuh.

**Satu risiko arsitektur yang perlu diwaspadai sejak awal (bukan alasan untuk tidak jalan, tapi harus direncanakan):** jangan sampai `apps/miniapp` menduplikasi logic yang sudah ada di `apps/app` (kalkulasi harga service, level partner, format status order, dsb — persis kasus duplikasi level partner di poin 5 atas). Faktorkan logic murni (bukan UI) itu ke package bersama (`packages/order-core`, `packages/partners` misalnya) yang diimpor KEDUA app, bukan disalin.

---

## 2. Struktur Telegram Bot

Peran bot HANYA dua hal (persis prinsip inti Discord — "bot tidak pernah membuat keputusan bisnis"):

1. **Entry point / router** ke Mini App via deep link (`/start`, tombol `web_app` / `url` yang membuka Mini App).
2. **Notification channel** satu arah dari backend ke user (lihat §9).

Command yang perlu ditangani lewat webhook:
- `/start` (tanpa payload) → welcome message + tombol menu utama.
- `/start <payload>` → deep link (lihat §10), langsung buka Mini App ke halaman spesifik.
- Tombol menu utama (🎮 Start a Project / 📦 My Orders / 🤝 Partner Program / 💬 Support / 🌐 Open Nimia Studio) — semuanya tombol `web_app` yang membuka Mini App ke rute terkait, KECUALI "🌐 Open Nimia Studio" yang tombol `url` biasa ke `nimiastudio.com`, dan "💬 Support" yang bisa jadi tombol `url` ke Discord support existing (ATAU dibuka di Mini App yang lalu deep-link ke Discord — keputusan produk kecil, bukan blocker arsitektur).

Bot **tidak perlu** menangani free-text message dari user (tidak ada chat AI di brief) — cukup command + button callback. Ini penting: artinya webhook handler-nya SEDERHANA (mirip kompleksitas Discord interactions route, bukan bot percakapan penuh).

---

## 3. Struktur Telegram Mini App

Bottom navigation 5 tab sesuai brief (Home, Services, Orders, Partner, Account) memetakan hampir 1:1 ke modul yang SUDAH ADA di `apps/app`:

| Mini App tab | Modul `apps/app` yang sudah ada & bisa jadi rujukan data/logic |
|---|---|
| 🏠 Home | `app/dashboard/page.tsx` (dashboard ringkasan) |
| 🛒 Services | katalog service — saat ini live di `apps/studio` (marketing), belum ada versi "browsable" di `apps/app` — perlu dibangun baru untuk Mini App tapi datanya (harga, kategori) sudah ada di `modules/order/data` |
| 📦 Orders | `app/dashboard/orders/`, `modules/order/` |
| 🤝 Partner | `app/dashboard/partners/`, `app/dashboard/partners/withdraw/`, `modules/partners/` (lengkap: types, repository, service, hooks) |
| 👤 Account | `app/dashboard/profile/` (termasuk pola "Connect Discord" yang tinggal ditiru untuk "Connect Telegram" kebalikannya) |

Mini App HARUS dibangun sebagai app Next.js baru (bukan halaman di dalam `apps/app` yang sudah ada) — alasannya bukan preferensi gaya, tapi teknis: Telegram WebApp punya kebutuhan viewport/theme/safe-area/back-button yang spesifik, dan membundel Telegram SDK + layout khusus itu ke `apps/app` yang sudah dioptimalkan untuk browser desktop/mobile biasa akan mengotori bundle dan layout constraint yang sudah ada.

---

## 4–6. User Flow, Order Flow, Partner Flow

**Order flow** — brief-nya sudah cocok dengan flow yang SUDAH berjalan di `apps/app` (`modules/order/state`, negosiasi 100% lewat aksi server yang sudah ada): Service → Brief → Reference → Deadline → Requirements → Price Estimate → Negotiation/Custom Price → Submit → Admin Review → Payment → In Progress. **Rekomendasi kuat: Mini App TIDAK reimplement state machine order dari nol.** `modules/order/state` dan `modules/order/pricing` di `apps/app` sudah berisi logic ini (termasuk test-nya, `modules/order/pricing/__tests__`) — faktorkan ke package bersama dan Mini App cukup memakai UI mobile-first di atasnya. Status badge (🟡 Under Review dst.) tinggal mapping dari `orders.status` yang sudah ada di skema, tidak perlu kolom baru.

**Partner flow** — SEMUA data yang diminta brief (level, referral code, referral link, total referrals, successful clients, pending/available rewards) sudah punya sumber data live: `modules/partners/repository` + `modules/partners/service` (`apps/app`) dan RPC admin yang setara (`get_all_partners_admin`, dst). Leaderboard publik JUGA sudah ada (`get_partner_leaderboard_public()`, migration `0035`, dipakai fitur gamifikasi Discord) — Mini App tinggal consume RPC yang sama, tidak perlu dibuat ulang. Aturan "reward hanya dihitung saat pembayaran benar-benar selesai, bukan sekadar signup" **sudah jadi aturan tegas di database** (ledger `partner_rewards`, status pending→available saat project completed) — tidak perlu dijaga ulang di level Mini App, cukup dibaca apa adanya.

**User flow (auth/onboarding)** — lihat §7, ini bagian paling baru secara teknis.

---

## 7. Authentication Flow

Ini bagian paling kritis dan paling berbeda dari yang sudah ada, jadi dijelaskan detail.

### Prinsip yang WAJIB dipegang (brief poin 16, dan sudah jadi standar proyek ini)
Jangan pernah percaya `window.Telegram.WebApp.initDataUnsafe` (versi ter-parse, TIDAK bertanda tangan) untuk keputusan otorisasi apa pun. Yang boleh dipercaya HANYA `initData` mentah (string) setelah diverifikasi server-side dengan algoritma HMAC-SHA256 resmi Telegram (kunci = bot token). Ini analog PERSIS dengan `verifyDiscordInteractionRequest()` yang sudah ada di `packages/discord/src/interactions.ts` (verifikasi Ed25519 pakai `DISCORD_PUBLIC_KEY`) — tinggal dibuat versi Telegram-nya (`verifyTelegramInitData()`, HMAC bukan signature asimetris, tapi prinsip "jangan pernah proses apa pun sebelum verifikasi lolos" sama persis).

### Flow yang direkomendasikan (mem-verifikasi lalu mem-bridge ke sistem auth yang SUDAH ADA, bukan bikin sistem auth baru)

1. Mini App terbuka di dalam Telegram → dapat `Telegram.WebApp.initData` (client-side).
2. Mini App kirim `initData` mentah ke endpoint baru, misal `POST /api/telegram/session`.
3. Server verifikasi HMAC + cek `auth_date` tidak kedaluwarsa (replay protection) — kalau gagal, tolak total.
4. Server cek: apakah `telegram_user_id` ini sudah tertaut ke sebuah `clients` row? (Kolom baru, migration baru — mirror PERSIS pola `clients.discord_user_id`/`discord_username`/`discord_avatar_url`/`discord_connected_at` dari migration `0025`, cukup jadi `clients.telegram_user_id`/`telegram_username`/`telegram_connected_at`.)
5. **Kalau sudah tertaut** → server (pakai `createServiceRoleClient()` dari `@nimia/db`, package yang SUDAH ADA dan sudah dipakai persis untuk kasus "request datang dari luar tanpa session website", yaitu Discord interactions route) mengeluarkan token sesi khusus Mini App — JWT pendek umur, ditandatangani server (secret baru, misal `TELEGRAM_MINIAPP_SESSION_SECRET`), berisi `user_id` + `telegram_user_id` + waktu kedaluwarsa. Token ini disimpan Mini App (misal di memory / `sessionStorage` WebView Telegram, BUKAN localStorage biasa karena WebView Telegram kadang di-reset) dan dikirim di tiap request API berikutnya.
6. **Setiap route API Mini App setelah ini WAJIB**: (a) verifikasi token sesi tadi, (b) query Supabase pakai service-role client TAPI selalu filter eksplisit `.eq("user_id", verifiedUserId)` di server — **persis pola yang sudah jadi aturan tegas di proyek ini untuk notification actions** ("RLS punya klausa `OR is_admin()`, kalau tidak difilter eksplisit akun admin akan menarik semua baris user lain" — pelajaran yang sudah didokumentasikan dari fitur Notification Center). Tidak boleh percaya `orderId` dari client tanpa re-verifikasi kepemilikan di server, sama seperti pola yang sudah dipakai untuk `support_tickets.order_id`.
7. **Kalau BELUM tertaut** (Telegram user ini belum punya akun Nimia, atau punya tapi belum connect) → tampilkan pilihan "Login dengan akun Nimia yang sudah ada" (email/password biasa, lalu server jalankan step 4 dengan `telegram_user_id` untuk menautkan) ATAU **"Continue with Telegram"**.

### Keputusan yang perlu diambil user (bukan blocker teknis, tapi keputusan produk)

**"Continue with Telegram" sebagai jalur SIGNUP BARU (bukan cuma linking akun yang sudah ada) itu secara teknis lebih rumit** dari yang terlihat, karena Supabase Auth berbasis email/phone, sedangkan identitas Telegram tidak otomatis punya email terverifikasi. Discord integration yang sudah ada di proyek ini SENGAJA TIDAK menyediakan "signup pakai Discord saja" — Discord cuma pernah dipakai untuk LINK ke akun yang sudah didaftar lewat email. Rekomendasi saya: **v1 Mini App ikuti pola yang sama (Telegram hanya untuk LINK ke akun existing)**, dan "Continue with Telegram" sebagai jalur signup penuh (misalnya pakai email sintetis + magic link verifikasi, atau custom OAuth provider di Supabase) dijadikan fitur fase lanjut — lihat §20.

---

## 8. Database Integration

**Tidak ada database baru, tidak ada Supabase project baru.** Satu migration baru (pola identik `0025_discord_account_linking.sql`):

```sql
alter table clients
  add column telegram_user_id bigint unique,
  add column telegram_username text,
  add column telegram_connected_at timestamptz;

-- RPC connect_telegram_account() / disconnect_telegram_account()
-- mirip persis connect_discord_account() / disconnect_discord_account()
```

Semua tabel lain (orders, order_negotiations, projects, project_files, partners, partner_referrals, partner_rewards, vouchers, notifications, support_tickets) **dipakai apa adanya, tanpa perubahan skema** — Mini App hanya klien baca/tulis baru terhadap tabel yang sudah ada, sama seperti `apps/app` adalah klien terhadap tabel yang sama.

---

## 9. Notification Architecture

Backend sudah punya DUA pola pengiriman notifikasi yang sudah terbukti jalan, dan Telegram sebaiknya mengikuti pola yang SUDAH dipakai Discord (bukan pola trigger-DB yang dipakai in-app Notification Center), karena alasan konkret: format pesan Telegram (teks + inline keyboard + parse_mode HTML) butuh logic presentasi per-event yang lebih mirip kebutuhan Discord (embed per event) daripada notifikasi in-app yang generik.

Pola yang direkomendasikan — perluas `packages/telegram/src/notify.ts` dengan fungsi baru per event (`notifyOrderApproved`, `notifyPaymentRequired`, `notifyPaymentConfirmed`, `notifyProjectStarted`, `notifyRevisionRequested`, `notifyProjectCompleted`, `notifyDeliveryAvailable`, `notifyReferralSuccessful`, `notifyPartnerRewardReceived`, `notifyVoucherReceived`, `notifyAnnouncement`), lalu **panggil dari TITIK PEMANGGILAN YANG SAMA PERSIS dengan `notifyDiscord*` yang sudah ada** (`apps/admin/app/(protected)/orders/actions.ts`, `apps/app/app/dashboard/negotiations/actions.ts`, `apps/app/app/dashboard/orders/payment-actions.ts`, dst). Ini meminimalkan kerja baru — titik integrasinya sudah ditemukan dan sudah terbukti aman (semua `notify*` Discord sudah "never-throwing", pola yang SAMA harus diulang untuk Telegram — kegagalan kirim Telegram tidak boleh pernah menggagalkan aksi bisnis yang memicunya).

Setiap notifikasi berisi tombol inline `url` mengarah ke deep link Mini App (lihat §10) — misalnya "View Order" → `https://t.me/NimiaStudioBot/app?startapp=order_1024`.

**Notifikasi ke admin/staff** (New Order, Payment Received) mengikuti pola yang sama seperti broadcast Prospect Hunter yang sudah ada — kirim ke satu channel/grup Telegram internal berisi staff, BUKAN ke Mini App. Tidak perlu UI baru untuk ini, murni pesan teks + tombol "View Order" (yang untuk staff bisa mengarah ke `hub.nimiastudio.com`, bukan Mini App).

---

## 10. Telegram Deep Linking Strategy

Ada dua mekanisme deep link Telegram — pilih yang mana penting untuk UX:

1. **Bot deep link klasik**: `t.me/NimiaStudioBot?start=order_1024` → membuka CHAT dengan bot, bot membalas dengan tombol `web_app` untuk masuk ke Mini App. Ekstra satu langkah (user harus tap tombol lagi).
2. **Mini App direct link (`startapp`)**: `t.me/NimiaStudioBot/app?startapp=order_1024` → **langsung** membuka Mini App (tidak mampir ke chat), dan `start_param=order_1024` tersedia DI DALAM `initData` yang sudah tertanda tangan (bisa diverifikasi server-side juga, bukan cuma versi unsafe-nya). Ini cocok untuk kasus "klik tombol notifikasi → langsung ke Order #NM-1024" yang diminta brief.

**Rekomendasi: pakai mekanisme #2 (`startapp`) untuk semua tombol "View Order"/deep link dari notifikasi**, dan mekanisme #1 hanya untuk `/start` polos dari pencarian bot manual di Telegram. Payload deep link mengikuti pola sederhana: `order_<id>`, `partner`, `service_<slug>` — di-parse di root Mini App dan langsung `router.push()` ke tab/rute terkait.

---

## 11. Admin Integration

Sesuai brief: admin TIDAK butuh dashboard Telegram terpisah. Yang dibangun hanya:
- Notifikasi Telegram untuk staff (New Order, Payment Received) — pola sudah dijelaskan di §9, gampang karena murni memperluas titik panggil `notifyDiscord*` yang sudah ada di `apps/admin/app/(protected)/orders/actions.ts`.
- (Opsional, fase lanjut) Aksi admin ringan lewat tombol inline Telegram (misal "Approve" langsung dari chat) — ini butuh webhook inbound + verifikasi identitas admin (mirip pola tombol "Open a Ticket" Discord), **direkomendasikan DITUNDA** (lihat §20) karena brief sendiri bilang "jangan pindahkan seluruh admin dashboard ke Telegram", dan approve-dari-chat menyimpan risiko keputusan bisnis dieksekusi di luar audit trail dashboard kalau tidak dirancang hati-hati.

---

## 12. Technology Stack — Rekomendasi

Konsisten dengan filosofi yang SUDAH dipakai proyek ini untuk Discord & Telegram bot yang ada sekarang ("kenapa tidak pakai SDK", `packages/discord/README.md` & `packages/telegram/README.md`):

| Layer | Pilihan | Alasan |
|---|---|---|
| Bot backend | `fetch` biasa ke Bot API, TIDAK pakai `telegraf`/`node-telegram-bot-api` | Sama seperti Discord: cuma butuh REST call satu-arah + satu webhook masuk, bukan long-polling. SDK besar tidak menambah value, cuma menambah dependency. |
| Webhook | Next.js Route Handler (serverless), verifikasi `X-Telegram-Bot-Api-Secret-Token` | Tidak ada proses persisten baru — sama prinsip "no separate hosting" yang sudah dipegang untuk Discord. |
| Mini App frontend SDK | `@telegram-apps/sdk-react` (atau `@twa-dev/sdk`) — SATU-SATUNYA tempat direkomendasikan pakai SDK pihak ketiga di seluruh proyek Telegram ini | Beda kasus dari bot: Mini App butuh state management tema/haptic/MainButton/BackButton yang berulang-ulang dipakai di banyak komponen — di sinilah SDK kecil & ter-tipe justru mengurangi kode custom, bukan menambah beban seperti `telegraf` akan lakukan ke bot. |
| Framework Mini App | Next.js App Router + TypeScript + Tailwind — SAMA seperti semua app lain di monorepo | Konsistensi tooling, bisa pakai `packages/ui`, `packages/validators`, `packages/config` apa adanya. |
| Auth bridge | HMAC verify + JWT sesi pendek + `createServiceRoleClient()` (`@nimia/db`, sudah ada) | Lihat §7 — reuse pola yang sudah dipakai Discord interactions route, tidak menciptakan mekanisme auth baru dari nol. |
| Database | Supabase project yang SAMA, migration baru saja | Tidak ada database terpisah — sesuai permintaan eksplisit brief. |
| Hosting | Vercel, project baru (mengikuti pola "tiap app = Vercel project terpisah, env var per-project" yang SUDAH jadi konvensi proyek ini) | Konsisten dan menghindari kelas bug env-var-hanya-di-satu-project yang sudah pernah terjadi di Discord integration. |

---

## 13. Cara Mengintegrasikan dengan Nimia Studio yang Sudah Ada

- Bot webhook + Mini App session route: **rekomendasikan co-locate keduanya di SATU app baru, `apps/miniapp`**, bukan disebar ke `apps/app` atau `apps/studio`. Alasan langsung dari pelajaran mahal §0.5: route inbound Discord sempat pindah app pertengahan jalan dan dokumentasinya jadi basi tanpa ketahuan sampai bug produksi. Menaruh SEMUA permukaan Telegram (bot webhook, session bridge, Mini App UI) di satu app sejak hari pertama menghindari kelas masalah itu sama sekali.
- Data & business logic: **jangan duplikasi**, impor `modules/order/pricing`, `modules/order/state`, `modules/partners/*` yang relevan — kalau modul-modul itu terlalu terikat ke `apps/app` (misal import path relatif ke app itu), langkah pertama justru **mengekstraknya jadi package baru** (`packages/order-core`, atau perluas `packages/validators`) SEBELUM menulis satu baris UI Mini App. Ini investasi kecil di depan yang mencegah drift 3-4 salinan logic seperti kasus level partner.
- Notifikasi: perluas titik panggil `notifyDiscord*` yang sudah ada (§9), bukan bikin sistem event baru.
- Auth: bridge ke Supabase Auth yang sudah ada, bukan sistem akun baru (§7).

---

## 14–17. Apa yang baru vs. reuse, estimasi kesulitan

Sudah diringkas per-bagian sepanjang dokumen. Ringkasan level kesulitan (kualitatif):

| Komponen | Kesulitan | Alasan singkat |
|---|---|---|
| Bot webhook + `/start` + deep link routing | Rendah | Pola serverless + verifikasi sudah ada presedennya persis (Discord interactions). |
| Migration linking `clients.telegram_*` | Rendah | Copy-paste pola migration `0025` Discord. |
| Auth bridge (verifikasi initData → sesi Mini App) | **Sedang–Tinggi** | Bagian paling kritis keamanan; harus dirancang & ditest hati-hati meski pola dasarnya (service-role + verifikasi manual) sudah ada presedennya. |
| Mini App shell (Next.js baru, bottom nav, dark premium UI) | Sedang | Kerja UI standar, tapi volume besar (5 tab penuh). |
| Home / Dashboard tab | Sedang | Data sudah ada semua, tinggal agregasi + layout mobile. |
| Services / Marketplace tab | Sedang | Data harga/kategori sudah ada di `modules/order/data`, tapi belum ada versi "browsable list + detail" di luar `apps/studio` — perlu dibangun. |
| My Orders + Order Detail (read-only) | Sedang | Query & status sudah ada, murni UI + read. |
| **Order creation flow penuh (brief→negosiasi→submit) di Mini App** | **Tinggi** | Permukaan fitur terbesar; kalau tidak diekstrak ke package bersama dulu (§13), risiko duplikasi state machine yang sudah ada. |
| Partner Dashboard tab | Sedang | Data & RPC (termasuk leaderboard) sudah lengkap, murni UI + share-to-Telegram. |
| Account tab + connect/disconnect Telegram | Rendah–Sedang | Pola UI sama seperti "Connect Discord" yang sudah ada. |
| Notification dispatch (bot push utk semua event lifecycle) | Sedang | Mekanis — meluaskan titik panggil yang sudah terbukti, bukan desain baru. |
| Admin notifications ke Telegram | Rendah–Sedang | Sama pola, volume kecil. |
| Keamanan end-to-end (rate limit webhook, rotasi secret, defense-in-depth query scoping) | Sedang–Tinggi | Butuh disiplin, bukan kompleksitas algoritmik — checklist §16 di bawah harus benar-benar dipatuhi tiap route baru. |

---

## 16. Security Considerations (checklist wajib)

1. Webhook Telegram **wajib** diverifikasi via `X-Telegram-Bot-Api-Secret-Token` (diset lewat parameter `secret_token` saat `setWebhook`) — tolak request tanpa header yang cocok, sebelum baris kode lain dieksekusi.
2. Mini App **wajib** verifikasi `initData` mentah (HMAC-SHA256, kunci = bot token) di server, tolak kalau `auth_date` sudah kedaluwarsa (misal >24 jam) — cegah replay.
3. **Tidak pernah** memakai `initDataUnsafe` (versi client-parsed, tidak bertanda tangan) untuk keputusan otorisasi apa pun — hanya untuk hal kosmetik non-sensitif (misal nama depan untuk sapaan UI, itu pun idealnya tetap dari initData yang sudah diverifikasi server dan dikirim balik ke client).
4. Setiap route API Mini App: filter query eksplisit berdasarkan `user_id` hasil verifikasi token sesi — jangan pernah percaya `orderId`/`clientId` dari body/query request tanpa re-cek kepemilikan di server (persis pelajaran yang sudah didokumentasikan dari bug RLS Notification Center & pola verifikasi ulang `support_tickets.order_id`).
5. Bot token, webhook secret, `TELEGRAM_MINIAPP_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` — hanya pernah ada di env server-side, tidak pernah sampai ke bundle client Mini App.
6. Karena tiap app di monorepo ini adalah Vercel project terpisah dengan env var independen (sudah pernah jadi sumber bug di Discord — env var hanya ke-set di satu project), pastikan checklist env var per-app didokumentasikan eksplisit sejak awal untuk `apps/miniapp` (dan admin project kalau butuh var untuk notifikasi staff).
7. Rate-limit webhook endpoint (proteksi dasar terhadap spam ke endpoint publik) — belum ada pola rate-limiting di proyek ini sama sekali, ini kemungkinan hal baru yang perlu ditambahkan (bisa sesederhana Vercel/Upstash rate limit).

---

## 18. Recommended Folder Structure

```
apps/
  miniapp/                        # BARU — t.me/NimiaStudioBot/app, domain misal miniapp.nimiastudio.com
    app/
      (tabs)/
        home/page.tsx
        services/page.tsx
        services/[slug]/page.tsx
        orders/page.tsx
        orders/[id]/page.tsx
        partner/page.tsx
        account/page.tsx
      order/                      # order creation flow (pakai package bersama utk logic)
      api/
        telegram/
          webhook/route.ts        # update dari Telegram (command, callback_query)
          session/route.ts        # verifikasi initData -> mint sesi Mini App
    components/
      layout/BottomNav.tsx
      layout/TelegramShell.tsx    # wrap ThemeParams, safe-area, BackButton
    lib/
      telegram-webapp.ts          # wrapper tipis di atas @telegram-apps/sdk-react

packages/
  telegram/                       # DIPERLUAS, bukan dibuat baru
    src/
      config.ts                  # + bot token utk bot client-facing (terpisah dr prospect-hunter kalau beda bot)
      rest.ts                    # + sendMessage dgn inline keyboard web_app/url, answerCallbackQuery, setWebhook
      notify.ts                  # + semua notifyOrder*/notifyPayment*/notifyPartner* baru
      webapp-auth.ts             # BARU — verifyTelegramInitData(), analog verifyDiscordInteractionRequest
      keyboards.ts               # BARU — builder tombol menu utama & deep link
  order-core/ (atau perluas existing) # BARU/EKSTRAKSI — state machine order + pricing, dipakai apps/app DAN apps/miniapp
  db/
    migrations/
      00XX_telegram_account_linking.sql   # mirror 0025 Discord
```

---

## 19. Roadmap: MVP → Production

**Fase 0 — Fondasi (bot + linking, tanpa UI Mini App dulu)**
Bot dibuat via BotFather, webhook + verifikasi secret token, `/start` dasar (welcome message + tombol placeholder), migration linking `clients.telegram_*`, RPC connect/disconnect. Bisa ditest end-to-end tanpa Mini App sama sekali.

**Fase 1 — Mini App shell + Auth bridge**
`apps/miniapp` dibuat, shell dark premium + bottom nav 5 tab (boleh masih dummy data), `verifyTelegramInitData()` + sesi Mini App, halaman "Continue with Telegram" (mode LINK ke akun existing saja, sesuai §7).

**Fase 2 — Read-only core**
Home (ringkasan real), My Orders (list + detail, read-only), Partner Dashboard (read-only, termasuk referral link + copy + share-to-Telegram), Account (profile + connect/disconnect Telegram).

**Fase 3 — Notifikasi**
Perluas `notify.ts`, wire ke titik panggil yang sudah ada (§9), test semua event lifecycle mengirim pesan + deep link yang benar ke Mini App.

**Fase 4 — Order creation flow (fitur terbesar)**
Ekstraksi `modules/order/*` ke package bersama (kalau belum di Fase 1-3), lalu bangun UI mobile-first di atasnya: Service → Brief → Negosiasi/Custom Price → Submit.

**Fase 5 — Voucher + polish pembayaran**
Terapkan voucher di Mini App (baca + apply, bukan bikin sistem voucher baru), status pembayaran read-only dengan link "lanjutkan di website" untuk submit TX hash (lihat §20 kenapa full payment flow di dalam Mini App ditunda).

**Fase 6 — Admin notifications**
Perluas notifikasi staff (New Order, Payment Received) ke channel/grup Telegram internal.

**Fase 7 — Polish & fitur lanjut**
Theme sync (dark/light ikut tema Telegram user), haptic feedback, leaderboard partner di dalam Mini App, dan evaluasi ulang fitur-fitur di §20.

---

## 20. Rekomendasi fitur yang DITUNDA (supaya MVP cepat selesai)

- **"Continue with Telegram" sebagai signup akun BARU** (bukan link ke akun existing) — kompleksitas auth (email sintetis/passwordless) tidak sepadan untuk MVP; v1 cukup mode link-only, sama seperti Discord.
- **Negosiasi (counter-offer) langsung di dalam Mini App** — v1 cukup tampilkan status negosiasi read-only + tombol "Lanjutkan di Website/App" untuk aksi negosiasi aktif. Menghindari duplikasi UI negosiasi yang cukup kompleks (accept/reject/counter) di dua tempat sekaligus.
- **Submit bukti pembayaran (TX hash) di dalam Mini App** — biarkan pembayaran tetap final-step di website/app dashboard untuk v1; Mini App cukup menunjukkan status & link lanjut. Menghindari menduplikasi UI upload/validasi pembayaran yang sensitif.
- **Aksi admin dari Telegram** (approve/reject order lewat tombol chat) — brief sendiri sudah minta "jangan pindahkan seluruh admin dashboard ke Telegram"; kalau nanti dibutuhkan, harus dirancang khusus dengan audit trail yang sama ketatnya dengan dashboard.
- **Leaderboard/gamifikasi visual di dalam Mini App** — datanya sudah ada (dipakai Discord), tapi UI-nya bisa menyusul setelah core flow order & partner dashboard selesai.
- **Telegram CloudStorage** (state tersimpan lintas device) — tidak esensial untuk MVP, semua data sudah persisten di Supabase; CloudStorage cuma buat convenience UI (draft form dsb), bisa ditambah belakangan.
- **Optimasi berat untuk Telegram Desktop** — brief sendiri sudah bilang prioritas utama mobile; desktop cukup "berfungsi", tidak perlu dioptimasi khusus di MVP.
- **Telegram Stars / metode pembayaran baru apa pun via Telegram** — di luar cakupan brief, dan berisiko memecah sistem pembayaran yang sudah ada (crypto wallet manual + verifikasi admin). Tidak direkomendasikan ditambahkan kecuali ada keputusan produk eksplisit terpisah.

---

## Ringkasan satu paragraf

Arsitektur "satu backend Supabase, banyak permukaan (web + Telegram)" yang diusulkan brief sudah benar dan sudah punya preseden yang terbukti jalan di proyek ini lewat integrasi Discord — prinsip, pola verifikasi, dan bahkan beberapa helper (`createServiceRoleClient`, pola notify never-throwing) bisa dipakai ulang langsung. Yang benar-benar baru dan butuh kerja signifikan hanya dua hal: (1) jembatan auth Telegram-initData → sesi Mini App yang aman, dan (2) UI Mini App itu sendiri (terutama order creation flow) — sisanya sebagian besar adalah "menyambungkan" data & logic yang sudah ada, bukan membangun dari nol.
