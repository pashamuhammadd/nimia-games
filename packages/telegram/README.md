# @nimia/telegram

Wrapper tipis di atas Telegram Bot API (`https://api.telegram.org/bot<TOKEN>/...`).
Sama seperti `@nimia/discord`, tidak pakai SDK apa pun (`node-telegram-bot-api`,
`telegraf`, dst) — cuma `fetch` biasa.

Package ini sekarang berisi **TIGA bot yang terpisah total** (token, permission,
dan tujuan berbeda — lihat `src/config.ts`'s bagian "Client-facing bot + Mini
App" dan `src/business/config.ts`'s top comment untuk alasan lengkap kenapa
TIDAK digabung jadi satu bot):

1. **Bot AI Prospect Hunter** (`src/config.ts`/`src/rest.ts`/`src/notify.ts`,
   dibangun 19-20 Agustus 2026) — satu-arah, `sendMessage`/`sendPhoto` dipicu
   AI Prospect Hunter (`apps/admin/lib/ai-agent`) ke SATU channel internal.
   Tidak ada webhook, tidak ada update yang diterima sama sekali.
2. **Bot client-facing** (`src/client-bot.ts`/`src/webapp-auth.ts`/
   `src/keyboards.ts`, dibangun 20 Agustus 2026) — bot publik Nimia Studio +
   Telegram Mini App, dipakai `apps/miniapp`. PUNYA webhook (menerima
   `/start`, tombol menu) dan PUNYA Mini App auth bridge. Lihat
   `docs/TELEGRAM.md` di root repo untuk arsitektur lengkapnya.
3. **Bot Business Sales Assistant** (`src/business/*`, dibangun 21 Agustus
   2026) — connect ke akun Telegram Business PRIBADI Pasha lewat Telegram
   Business Connection, auto-qualify lead calon klien yang chat langsung ke
   Pasha, dengan human-takeover manual. PUNYA webhook sendiri
   (`apps/miniapp/app/api/telegram/business/webhook`). Lihat
   `docs/TELEGRAM_BUSINESS_BOT.md` di root repo untuk arsitektur lengkapnya.

---

## Bagian 1 — Bot AI Prospect Hunter (existing)

### Env vars yang dibutuhkan

Taruh di `.env.local` `apps/admin` — JANGAN pernah commit nilai aslinya ke
git.

| Env var | Dipakai untuk |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Semua call sebagai bot (`sendMessage`) — **RAHASIA**, siapa pun yang pegang ini bisa post sebagai bot Anda |
| `TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID` | Channel Nimia Partner Program — hasil AI Prospect Hunter yang lolos `PARTNER_NOTIFY_SCORE_THRESHOLD` (`notifyProspectFound`, 19 Agustus 2026) |

### Cara ambil setiap nilai

#### Bot Token
1. Buka chat dengan **@BotFather** di Telegram (akun resmi Telegram untuk bikin bot).
2. Kirim `/newbot`, ikuti instruksinya (kasih nama + username, username harus berakhiran `bot`, misal `NimiaProspectBot`).
3. BotFather akan membalas dengan token-nya — format `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. Simpan baik-baik, jangan pernah share (termasuk ke chat AI manapun).

#### Channel ID
1. Buat channel Telegram baru (atau pakai yang sudah ada) untuk Nimia Partner Program.
2. Tambahkan bot yang baru dibuat sebagai **Administrator** channel itu (Channel Info → Administrators → Add Admin → cari username bot-nya) — bot TIDAK BISA post ke channel kalau cuma jadi member biasa, harus admin, minimal dengan permission "Post Messages".
3. Ambil ID numeriknya (formatnya seperti `-1001234567890` untuk channel/supergroup — beda dari ID user biasa yang positif):
   - Cara termudah: post/forward SATU pesan apa saja dari channel itu ke bot **@userinfobot** atau **@RawDataBot** — balasannya akan menampilkan `chat.id` channel asal (untuk forwarded message dari channel, field-nya `forward_from_chat.id`).
   - Alternatif: kalau channel-nya PUBLIC (punya `@username`), boleh diisi langsung dengan `@username_channel` itu. Untuk channel PRIVATE (lebih disarankan), wajib pakai ID numerik dari langkah di atas.

### Format pesan

`notifyProspectFound` (`src/notify.ts`) mengirim SATU pesan per project baru
(bukan digest), pakai `parse_mode: "HTML"`, dengan logo project sebagai foto
kalau ada. Tidak pernah melempar error — kegagalan kirim cuma di-`console.error`.

### Kenapa tidak pakai SDK Telegram

Sama alasannya dengan `@nimia/discord`'s "Kenapa tidak pakai discord.js" —
semua yang dibutuhkan cuma satu REST call satu-arah dari serverless function
yang sudah ada, bukan proses long-polling/webhook yang harus jalan 24/7.

---

## Bagian 2 — Bot client-facing + Mini App (baru, 20 Agustus 2026)

Lihat `docs/TELEGRAM.md` di root repo untuk arsitektur lengkap (auth flow,
deep linking, notification architecture, dsb). Bagian ini murni checklist
setup kredensial.

### Env vars yang dibutuhkan

Taruh di `.env.local` `apps/miniapp` (lihat `apps/miniapp/.env.example`).

| Env var | Dipakai untuk |
|---|---|
| `TELEGRAM_CLIENT_BOT_TOKEN` | Bot client-facing — **RAHASIA**, terpisah total dari `TELEGRAM_BOT_TOKEN` di atas |
| `TELEGRAM_CLIENT_BOT_USERNAME` | @username bot (tanpa @) — dipakai bangun link `t.me/<username>/...` |
| `TELEGRAM_WEBHOOK_SECRET` | String random panjang — dicocokkan dengan header `X-Telegram-Bot-Api-Secret-Token` di tiap request webhook masuk |
| `TELEGRAM_MINIAPP_URL` | Origin Mini App sendiri, mis. `https://miniapp.nimiastudio.com` |
| `TELEGRAM_MINIAPP_SHORT_NAME` | Short name Mini App yang didaftarkan lewat `/newapp` di BotFather |
| `TELEGRAM_STUDIO_URL` | (opsional) URL nimiastudio.com, default sudah production |
| `TELEGRAM_WELCOME_IMAGE_URL` | (opsional) URL gambar banner untuk pesan `/start` — lihat "Welcome image" di bawah |

### Welcome image (opsional, tambahan 20 Agustus 2026)

`/start` bisa kirim gambar banner + caption yang lebih menjual (jasa apa
saja + ajakan Partner Program) daripada cuma teks polos — lihat
`keyboards.ts`'s `buildWelcomeCaption`. Ini OPSIONAL: kalau
`TELEGRAM_WELCOME_IMAGE_URL` tidak diisi, bot tetap jalan normal pakai
`buildWelcomeText` (teks polos, tanpa gambar).

Syaratnya: harus URL publik yang bisa diakses server Telegram sendiri
(bukan path file lokal, bukan localhost) — Telegram yang fetch gambarnya
dari URL itu, bukan kita yang upload file. Cara paling gampang dapat
URL ini:

1. Upload gambar banner-nya ke bucket public di Supabase Storage (project
   Supabase yang sama dengan yang lain), atau ke folder `public/` di app
   mana pun yang sudah live (mis. `apps/studio/public/telegram-welcome.png`,
   otomatis bisa diakses lewat `https://nimiastudio.com/telegram-welcome.png`
   setelah deploy).
2. Copy URL publiknya, set sebagai `TELEGRAM_WELCOME_IMAGE_URL` di env var
   `apps/miniapp` (local + Vercel production).
3. Redeploy `apps/miniapp` — TIDAK perlu jalanin `setWebhook` ulang (URL
   webhook-nya sendiri tidak berubah, cuma isi balasannya).
4. Test `/start` lagi di bot, harus muncul gambar + caption baru.

Kalau URL-nya salah/tidak bisa diakses, `sendPhoto` akan gagal dan bot
otomatis fallback ke `buildWelcomeText` (teks polos) supaya `/start`
tetap dapat balasan, bukan diam saja.

### Setup langkah demi langkah (manual, sekali)

1. **Buat bot baru** — chat @BotFather, `/newbot`, kasih nama publik (mis.
   "Nimia Studio") dan username (mis. `NimiaStudioBot`). Simpan token-nya
   sebagai `TELEGRAM_CLIENT_BOT_TOKEN`, usernamenya sebagai
   `TELEGRAM_CLIENT_BOT_USERNAME`.
2. **Daftarkan Mini App-nya** — masih di @BotFather, kirim `/newapp`, pilih
   bot yang baru dibuat, ikuti wizard (judul, deskripsi, foto, GIF demo
   opsional, lalu **Web App URL** — isi dengan `TELEGRAM_MINIAPP_URL` yang
   sudah di-deploy). BotFather akan minta "short name" — itu yang jadi
   `TELEGRAM_MINIAPP_SHORT_NAME`.
3. **Generate `TELEGRAM_WEBHOOK_SECRET`** — string random panjang apa saja
   (mis. `openssl rand -hex 32`), set di env `apps/miniapp` (local + Vercel
   production).
4. **Deploy `apps/miniapp`** dulu (Vercel project baru) — `setWebhook` di
   langkah berikutnya butuh URL yang sudah bisa diakses publik.
5. **Register webhook-nya** — jalankan sekali (skrip kecil / route
   sementara / Node REPL) yang memanggil `setWebhook` dari package ini:
   ```ts
   import { setWebhook } from "@nimia/telegram";
   await setWebhook(
     "https://miniapp.nimiastudio.com/api/telegram/webhook",
     process.env.TELEGRAM_WEBHOOK_SECRET!,
   );
   ```
6. **(Opsional) Set command list** — `setMyCommands([{ command: "start", description: "Buka Nimia Studio" }])`.
7. Test: buka `t.me/<username>`, kirim `/start` — harus dapat balasan welcome
   message + 5 tombol menu.

### Kenapa dua bot terpisah, bukan satu

Bot AI Prospect Hunter murni tool internal (broadcast satu channel admin,
tidak pernah menerima update). Bot client-facing adalah permukaan produk
publik (DM langsung dengan client, identitas Mini App). Menyatukan keduanya
berarti satu webhook harus menangani dua persona berbeda dengan model
kepercayaan berbeda — dipisah sejak awal supaya perubahan di satu sisi tidak
pernah berisiko meregresi sisi lain yang sudah production.

---

## Bagian 3 — Bot Business Sales Assistant (baru, 21 Agustus 2026)

Lihat `docs/TELEGRAM_BUSINESS_BOT.md` di root repo untuk arsitektur lengkap.
Bagian ini murni checklist setup kredensial + BotFather.

### Env vars yang dibutuhkan

Taruh di `.env.local` `apps/miniapp` (lihat `apps/miniapp/.env.example`) —
SAMA app dengan bot client-facing (§4 dokumen arsitektur menjelaskan kenapa),
tapi kredensial TOTAL TERPISAH.

| Env var | Dipakai untuk |
|---|---|
| `TELEGRAM_BUSINESS_BOT_TOKEN` | Bot Business Assistant — **RAHASIA**, terpisah total dari `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CLIENT_BOT_TOKEN` |
| `TELEGRAM_BUSINESS_WEBHOOK_SECRET` | String random panjang — dicocokkan dengan header `X-Telegram-Bot-Api-Secret-Token` di webhook `/api/telegram/business/webhook` |

TIDAK ada env var untuk "Telegram user id Pasha" — bot ini belajar siapa
pemilik Business Connection-nya langsung dari Telegram sendiri (event
`business_connection`), disimpan di tabel `telegram_business_connections`
(migration `0055`). Lihat `src/business/config.ts`'s comment untuk alasan
lengkap.

### Setup langkah demi langkah (manual, sekali)

1. **Buat bot baru** di @BotFather — `/newbot`, nama & username bebas (mis.
   `NimiaSalesBot`). JANGAN pakai bot client-facing atau bot Prospect
   Hunter yang sudah ada — ini harus bot baru (lihat alasan di bagian atas
   file ini & `docs/TELEGRAM_BUSINESS_BOT.md` §3). Simpan token-nya sebagai
   `TELEGRAM_BUSINESS_BOT_TOKEN`.
2. **Generate `TELEGRAM_BUSINESS_WEBHOOK_SECRET`** — string random (mis.
   `openssl rand -hex 32`), set di env `apps/miniapp` (local + Vercel
   production).
3. **Deploy `apps/miniapp`** dulu — `setWebhook` di langkah berikutnya butuh
   URL yang sudah bisa diakses publik.
4. **Register webhook-nya** — jalankan sekali (skrip kecil / route sementara
   / Node REPL):
   ```ts
   import { setBusinessWebhook } from "@nimia/telegram";
   await setBusinessWebhook(
     "https://miniapp.nimiastudio.com/api/telegram/business/webhook",
     process.env.TELEGRAM_BUSINESS_WEBHOOK_SECRET!,
   );
   ```
5. **Aktifkan mode Business di bot** — chat @BotFather, `/mybots` → pilih bot
   yang baru dibuat → **Bot Settings** → **Business Mode** → izinkan bot
   menerima business message ("Allow" pada opsi terkait "connected business
   accounts" — nama menu bisa sedikit berbeda tergantung versi BotFather,
   cari opsi yang menyebut "Business" secara eksplisit).
6. **Pasha sambungkan bot ini ke akun Telegram pribadinya** — di HP/desktop
   Telegram Pasha sendiri: **Settings → Telegram Business → Chatbots** (fitur
   ini butuh Telegram Premium/Business aktif di akun Pasha — prasyarat di
   luar kendali kode) → pilih bot `NimiaSalesBot` yang baru dibuat → aktifkan
   izin **"Reply to messages"** (wajib, tanpa ini bot tidak bisa membalas
   sama sekali) → pilih chat mana yang mau di-cover (rekomendasi: "All
   chats" atau "New chats" saja, sesuai preferensi Pasha) → Connect.
7. Test: minta seseorang (akun Telegram lain) kirim pesan pertama ke Pasha
   lewat link Business Chat-nya — bot harus membalas dengan welcome message +
   6 tombol menu dalam beberapa detik.
8. Test human takeover: setelah bot membalas, balas manual dari akun
   Telegram Pasha sendiri di chat yang sama — bot harus berhenti total
   membalas prospek itu setelahnya.

### Catatan implementasi — satu titik yang perlu diverifikasi di bot nyata

`app/api/telegram/business/webhook/route.ts`'s `handleMenuTap` membaca
`business_connection_id` dari CallbackQuery lewat dua kemungkinan field
(`callback_query.business_connection_id` ATAU
`callback_query.message.business_connection_id`) karena dokumentasi resmi
Telegram Bot API tidak secara eksplisit mengonfirmasi field mana yang
terisi saat prospek menekan tombol di pesan yang dikirim lewat Business
Connection. Kalau tombol menu (Animation/Game Dev/dst.) tidak merespons saat
ditest di bot nyata, ini titik pertama yang perlu dicek — lihat komentar di
fungsi tersebut untuk detail.
