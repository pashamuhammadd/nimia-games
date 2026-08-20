# @nimia/telegram

Wrapper tipis di atas Telegram Bot API (`https://api.telegram.org/bot<TOKEN>/...`).
Sama seperti `@nimia/discord`, tidak pakai SDK apa pun (`node-telegram-bot-api`,
`telegraf`, dst) — cuma `fetch` biasa.

Package ini sekarang berisi **DUA bot yang terpisah total** (token, permission,
dan tujuan berbeda — lihat `src/config.ts`'s bagian "Client-facing bot + Mini
App" untuk alasan lengkap kenapa TIDAK digabung jadi satu bot):

1. **Bot AI Prospect Hunter** (`src/config.ts`/`src/rest.ts`/`src/notify.ts`,
   dibangun 19-20 Agustus 2026) — satu-arah, `sendMessage`/`sendPhoto` dipicu
   AI Prospect Hunter (`apps/admin/lib/ai-agent`) ke SATU channel internal.
   Tidak ada webhook, tidak ada update yang diterima sama sekali.
2. **Bot client-facing** (`src/client-bot.ts`/`src/webapp-auth.ts`/
   `src/keyboards.ts`, dibangun 20 Agustus 2026) — bot publik Nimia Studio +
   Telegram Mini App, dipakai `apps/miniapp`. PUNYA webhook (menerima
   `/start`, tombol menu) dan PUNYA Mini App auth bridge. Lihat
   `docs/TELEGRAM.md` di root repo untuk arsitektur lengkapnya.

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
