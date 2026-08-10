# @nimia/discord

Wrapper tipis di atas Discord REST API (OAuth2 account-linking + bot-token
calls). Tidak pakai `discord.js` atau SDK lain — cuma `fetch` biasa, karena
integrasi ini (lihat `docs/DISCORD.md`) tidak pernah butuh koneksi Gateway
(websocket) yang harus jalan terus-menerus; semua aksi bot itu REST call
satu-arah yang dipicu oleh sesuatu yang sudah terjadi di website (order
dibuat, client connect Discord, dst), bukan bot yang "dengerin" event dari
Discord.

## Env vars yang dibutuhkan

Taruh semua ini di `.env.local` masing-masing app yang memakainya (lihat
tabel di bawah) — JANGAN pernah commit nilai aslinya ke git (`.gitignore`
root sudah exclude semua `.env*`).

| Env var | Dipakai untuk | Dibutuhkan di |
|---|---|---|
| `DISCORD_CLIENT_ID` | OAuth2 authorize URL (bukan rahasia, boleh terlihat di URL browser) | `apps/studio` |
| `DISCORD_CLIENT_SECRET` | Tukar `code` OAuth jadi access token — **RAHASIA** | `apps/studio` |
| `DISCORD_BOT_TOKEN` | Semua REST call sebagai bot (assign role, dst) — **RAHASIA, paling sensitif dari semua** | `apps/studio` (assign role saat connect), `apps/admin` (fase notifikasi berikutnya) |
| `DISCORD_GUILD_ID` | Server Discord Nimia Studio | `apps/studio`, `apps/admin` |
| `DISCORD_ROLE_CLIENT_ID` | Role ⭐ Client yang di-assign otomatis | `apps/studio` |
| `DISCORD_ROLE_PARTNER_ID` | Role 🤝 Partner (belum dipakai di fase ini — disiapkan untuk fase berikutnya) | `apps/studio` |
| `DISCORD_CHANNEL_NEW_ORDERS_ID` | Channel #new-orders (belum dipakai — fase notifikasi) | `apps/studio` |
| `DISCORD_CHANNEL_NEGOTIATIONS_ID` | Channel #negotiations (belum dipakai) | `apps/admin` |
| `DISCORD_CHANNEL_PAYMENT_VERIFICATION_ID` | Channel #payment-verification (belum dipakai) | `apps/admin` |
| `DISCORD_CHANNEL_SYSTEM_LOG_ID` | Channel #system-log (belum dipakai) | `apps/studio`, `apps/admin` |

## Cara ambil setiap nilai

### Client ID & Client Secret (OAuth2)
1. https://discord.com/developers/applications → pilih application "Nimia Studio Bot" Anda.
2. Sidebar kiri → **OAuth2 → General**.
3. **Client ID** langsung terlihat di sana (boleh copy langsung).
4. **Client Secret** — klik **Reset Secret** kalau belum pernah di-generate, lalu copy (cuma bisa dilihat sekali, kalau hilang harus reset ulang).
5. Di halaman yang sama, bagian **Redirects**, tambahkan:
   `https://studio.nimiagames.com/api/discord/callback`
   (dan kalau mau test di local dev: `http://localhost:3000/api/discord/callback` juga, tambahkan sebagai baris terpisah, JANGAN gabung di satu baris).

### Bot Token
1. Sidebar kiri → **Bot**.
2. **Reset Token** / **Copy Token**. Simpan baik-baik, jangan pernah share (termasuk ke chat AI manapun) — siapa pun yang pegang token ini bisa mengendalikan bot Anda sepenuhnya di server Discord itu.
3. Pastikan **Server Members Intent** aktif di halaman yang sama (dibutuhkan supaya assign role jalan benar).

### Guild ID, Role ID, Channel ID
Semua ini BUKAN rahasia (cuma angka ID internal Discord, tidak bisa dipakai untuk apa pun tanpa bot token-nya juga) — aman ditaruh langsung di `.env.local`, tidak perlu hati-hati seperti Client Secret/Bot Token di atas.

1. Aktifkan **Developer Mode**: Discord app → Settings (ikon gerigi) → Advanced → **Developer Mode** (toggle ON).
2. **Guild ID**: klik kanan nama server di sidebar kiri Discord → **Copy Server ID**.
3. **Role ID**: Server Settings → Roles → klik kanan role yang dimaksud (atau buka role-nya lalu klik `...` di pojok kanan atas) → **Copy Role ID**.
4. **Channel ID**: klik kanan nama channel di sidebar → **Copy Channel ID**.

## Kenapa bot butuh posisi role tertentu

Discord tidak izinkan bot assign role yang levelnya sama atau lebih tinggi
dari role TERTINGGI bot itu sendiri di server. Setelah invite bot, Discord
otomatis bikin role terpisah untuk bot itu (bukan role manual "Bot" yang
mungkin sudah Anda buat sebelumnya) — role INI yang harus digeser ke atas
Client/Partner di Server Settings → Roles (drag-and-drop), bukan role
manual yang lama.

## Kenapa tidak pakai `discord.js`

Semua fungsi di package ini (lihat `src/oauth.ts`, `src/rest.ts`) cuma
REST call satu arah yang dipicu dari server action/route Next.js yang
sudah ada — tidak pernah perlu "dengerin" event real-time dari Discord
(pesan baru, member join, dst). `discord.js` didesain untuk itu (koneksi
Gateway/websocket yang harus jalan terus di satu proses) — memakainya di
sini berarti butuh hosting proses terpisah yang jalan 24/7 (Railway,
Render, VPS, dst), padahal semua kebutuhan integrasi ini bisa dipenuhi
dari serverless functions yang sudah ada (`apps/studio`, `apps/admin` di
Vercel), sama seperti Resend (`@nimia/email`) dan Cloudinary.
