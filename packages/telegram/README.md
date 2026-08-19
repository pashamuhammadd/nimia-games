# @nimia/telegram

Wrapper tipis di atas Telegram Bot API (`https://api.telegram.org/bot<TOKEN>/...`).
Sama seperti `@nimia/discord`, tidak pakai SDK apa pun (`node-telegram-bot-api`,
`telegraf`, dst) — cuma `fetch` biasa, karena satu-satunya yang package ini
lakukan adalah `sendMessage` satu-arah yang dipicu oleh AI Prospect Hunter
(`apps/admin/lib/ai-agent`) menemukan project baru, bukan bot yang
long-polling atau menerima webhook Telegram.

## Env vars yang dibutuhkan

Taruh di `.env.local` `apps/admin` — JANGAN pernah commit nilai aslinya ke
git.

| Env var | Dipakai untuk |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Semua call sebagai bot (`sendMessage`) — **RAHASIA**, siapa pun yang pegang ini bisa post sebagai bot Anda |
| `TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID` | Channel Nimia Partner Program — hasil AI Prospect Hunter yang lolos `PARTNER_NOTIFY_SCORE_THRESHOLD` (`notifyProspectFound`, 19 Agustus 2026) |

## Cara ambil setiap nilai

### Bot Token
1. Buka chat dengan **@BotFather** di Telegram (akun resmi Telegram untuk bikin bot).
2. Kirim `/newbot`, ikuti instruksinya (kasih nama + username, username harus berakhiran `bot`, misal `NimiaProspectBot`).
3. BotFather akan membalas dengan token-nya — format `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. Simpan baik-baik, jangan pernah share (termasuk ke chat AI manapun).

### Channel ID
1. Buat channel Telegram baru (atau pakai yang sudah ada) untuk Nimia Partner Program — ini yang disebutkan user di poin 5 request awal ("saya akan membuat channel telegram untuk Nimia Partner Program").
2. Tambahkan bot yang baru dibuat sebagai **Administrator** channel itu (Channel Info → Administrators → Add Admin → cari username bot-nya) — bot TIDAK BISA post ke channel kalau cuma jadi member biasa, harus admin, minimal dengan permission "Post Messages".
3. Ambil ID numeriknya (formatnya seperti `-1001234567890` untuk channel/supergroup — beda dari ID user biasa yang positif):
   - Cara termudah: post/forward SATU pesan apa saja dari channel itu ke bot **@userinfobot** atau **@RawDataBot** — balasannya akan menampilkan `chat.id` channel asal (untuk forwarded message dari channel, field-nya `forward_from_chat.id`).
   - Alternatif: kalau channel-nya PUBLIC (punya `@username`), `TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID` boleh diisi langsung dengan `@username_channel` itu (contoh: `@nimiapartnerprogram`) — Telegram menerima username sebagai pengganti chat id numerik untuk channel publik. Untuk channel PRIVATE (lebih disarankan untuk Partner Program supaya tidak sembarang orang bisa join tanpa link invite), wajib pakai ID numerik dari langkah di atas.

## Format pesan

`notifyProspectFound` (`src/notify.ts`) mengirim SATU pesan per project baru
(bukan digest), pakai `parse_mode: "HTML"` — judul, skor, kategori, market
cap, dan reasoning dalam satu pesan teks, diikuti tombol inline (`reply_markup.inline_keyboard`)
satu tombol per baris untuk Website/Twitter/Telegram/Discord/CoinGecko milik
project itu (kalau datanya ada di CoinGecko). Sengaja TIDAK ada tombol
"mark as contacted" (keputusan eksplisit user) — tombol yang ada murni link
keluar, tidak pernah memicu callback apa pun ke bot ini, jadi package ini
tidak pernah perlu menangani update/webhook dari Telegram sama sekali.

Sama seperti semua `notify*` di `@nimia/discord`, `notifyProspectFound` di
sini TIDAK PERNAH melempar error — kegagalan kirim (token salah, bot bukan
admin channel, channel id salah, dst) cuma di-`console.error`, tidak pernah
menggagalkan run AI Prospect Hunter itu sendiri. Kalau notifikasi tidak
muncul di Telegram padahal project-nya tersimpan di dashboard admin, cek log
server (Vercel) untuk baris `[telegram] Failed to send ...`.

## Kenapa tidak pakai SDK Telegram

Sama alasannya dengan `@nimia/discord`'s "Kenapa tidak pakai discord.js" —
lihat README package itu untuk penjelasan lengkap. Ringkasnya: semua yang
dibutuhkan cuma satu REST call satu-arah dari serverless function yang
sudah ada (`apps/admin` di Vercel), bukan proses long-polling/webhook yang
harus jalan 24/7.
