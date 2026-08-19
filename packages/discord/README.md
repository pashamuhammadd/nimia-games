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
| `DISCORD_BOT_TOKEN` | Semua REST call sebagai bot (assign role, kirim notifikasi channel, dst) — **RAHASIA, paling sensitif dari semua** | `apps/studio`, `apps/admin` |
| `DISCORD_GUILD_ID` | Server Discord Nimia Studio | `apps/studio`, `apps/admin` |
| `DISCORD_ROLE_CLIENT_ID` | Role ⭐ Client yang di-assign otomatis | `apps/studio` |
| `DISCORD_ROLE_PARTNER_ID` | Role 🤝 Partner (belum dipakai — auto-assign masih deferred, lihat docs/DISCORD.md) | `apps/studio` |
| `DISCORD_CHANNEL_NEW_ORDERS_ID` | Channel #new-orders — notifikasi order baru (`notifyNewOrder`) | `apps/studio` |
| `DISCORD_CHANNEL_NEGOTIATIONS_ID` | Channel #negotiations — notifikasi offer/accept/reject (`notifyNegotiationUpdate`) | `apps/studio`, `apps/admin` |
| `DISCORD_CHANNEL_PAYMENT_VERIFICATION_ID` | Channel #payment-verification — notifikasi submit/verified/flagged (`notifyPaymentSubmitted`/`notifyPaymentVerified`/`notifyPaymentFlagged`) | `apps/studio`, `apps/admin` |
| `DISCORD_CHANNEL_SYSTEM_LOG_ID` | Channel #system-log — mirror ringkas dari semua notifikasi di atas | `apps/studio`, `apps/admin` |
| `DISCORD_CHANNEL_SUPPORT_ID` | Channel #create-ticket — setiap ticket support jadi PRIVATE thread baru di sini (`createSupportTicket`) | `apps/studio` (bikin ticket), `apps/admin` (link "Open in Discord" + close ticket) |
| `DISCORD_CHANNEL_PARTNER_JOINED_ID` | Channel #partner-joined — signup dengan niat partner eksplisit (`notifyPartnerJoined`, 11 Agustus 2026) | `apps/studio` |
| `DISCORD_CHANNEL_RECENT_REWARDS_ID` | Channel #recent-rewards — setiap successful paid referral (`notifyReferralReward`, 11 Agustus 2026) | `apps/admin` |
| `DISCORD_CHANNEL_PARTNER_LEADERBOARD_ID` | Channel #partner-leaderboard — satu pesan pinned, di-EDIT setiap update (`postOrUpdateLeaderboard`, 11 Agustus 2026) | `apps/admin` |
| `DISCORD_CHANNEL_PARTNER_SUCCESS_ID` | Channel #partner-success — partner naik level (`notifyPartnerLevelChanged`, 11 Agustus 2026) | `apps/admin` |
| `DISCORD_CHANNEL_PROSPECT_HUNTER_ID` | Channel #prospect-hunter (kategori **Partner**) — hasil AI Prospect Hunter yang lolos `PARTNER_NOTIFY_SCORE_THRESHOLD` (`notifyProspectFound`, 19 Agustus 2026) | `apps/admin` |
| `DISCORD_PUBLIC_KEY` | Verifikasi request Interactions HTTP endpoint (`app/api/discord/interactions/route.ts`) — bukan rahasia, tapi wajib diisi | `apps/studio` |

Catatan (fix 10 Agustus 2026, guild-join): sebelumnya OAuth cuma minta
scope `identify`, dan asumsinya client SUDAH jadi member server (join
lewat link invite biasa) sebelum connect Discord. Ternyata salah — client
yang connect Discord duluan (belum pernah join server) TIDAK otomatis
masuk server, cuma ke-link di database. Akibatnya `assignGuildRole` dan
`addThreadMember` (support ticket) diam-diam gagal (404 Unknown Member)
untuk client itu. Sekarang scope-nya `identify guilds.join`, dan route
`/api/discord/callback` panggil `addGuildMember()` (rest.ts) pakai OAuth
token client + bot token buat langsung masukkan mereka ke server saat
connect. **Ini butuh bot punya permission "Create Invite"
(CREATE_INSTANT_INVITE)** di server — cek/tambahkan di Server Settings →
Roles kalau belum ada (lihat daftar permission bot lengkap di
`docs/DISCORD.md`'s "Server setup notes"). **Akun yang sudah connect
SEBELUM fix ini (termasuk akun test Anda
sendiri) harus Disconnect lalu Connect lagi** di halaman Profile — Discord
tidak otomatis memperluas scope dari koneksi lama, jadi cuma push kode ini
saja TIDAK menambahkan akun yang sudah ke-link sebelumnya ke server.

Catatan (fase notifikasi, 9 Agustus 2026): setiap fungsi `notify*` di
`src/notify.ts` TIDAK PERNAH melempar error — kalau channel ID salah, bot
token invalid, atau Discord API sedang down, itu cuma di-`console.error`
saja, tidak pernah menggagalkan order/pembayaran/negosiasi yang memicunya.
Kalau notifikasi tidak muncul di Discord padahal aksinya di website
berhasil, cek log server (Vercel) untuk baris `[discord] Failed to send
...`, bukan periksa order/pembayarannya — itu sudah pasti tersimpan aman.

Catatan (fase gamification Partner Program, 11 Agustus 2026): 4 channel
publik baru (`partner-joined`/`recent-rewards`/`partner-leaderboard`/
`partner-success`) ada di modul TERPISAH, `src/gamification.ts` — bukan di
`src/notify.ts` — karena event-nya beda titik pemicu (signup & payment
confirmed, bukan lifecycle order). Sama seperti `notify.ts`/`tickets.ts`,
semua fungsinya TIDAK PERNAH melempar error. Channel-channel ini harus
DIBUAT DULU secara manual di Discord (lihat `docs/DISCORD.md`'s "Server
setup notes") sebelum mengisi env var-nya — package ini tidak pernah punya
kode yang membuat channel/kategori baru, cuma yang posting ke channel yang
sudah ada.

Catatan (fase tombol ticket di Discord, 12 Agustus 2026): ini SATU-SATUNYA
bagian dari integrasi ini yang menerima request MASUK dari Discord (lihat
`docs/DISCORD.md`'s bagian baru "In-Discord ticket button") — client klik
tombol "Open a Ticket" di `#create-ticket` → isi modal (Subject + Message)
→ Discord POST ke `app/api/discord/interactions/route.ts` →
`src/interactions.ts` verifikasi signature-nya, lalu route itu (bukan
package ini) yang cari client berdasarkan `discord_user_id`, insert baris
`support_tickets`, dan panggil `createSupportTicket` yang sama persis
dipakai form Support di website. Masih TIDAK BUTUH koneksi Gateway —
Discord's Interactions HTTP endpoint tetap satu route serverless biasa,
diverifikasi per-request (lihat "Kenapa tidak pakai discord.js" di bawah).
Setelah env var `DISCORD_PUBLIC_KEY` terisi dan route-nya sudah live, jalan
tombol "Post Ticket Button" di halaman Tickets `hub.nimiastudio.com`
sekali untuk memasang pesannya di `#create-ticket`.

Catatan (AI Prospect Hunter partner broadcast, 19 Agustus 2026): channel
baru `#prospect-hunter` HARUS dibuat manual dulu di Discord, di dalam
kategori baru bernama **Partner** (buat kategori itu juga kalau belum
ada) — sama seperti channel gamification di atas, package ini tidak
pernah membuat channel/kategori sendiri. Fungsinya: setiap kali AI
Prospect Hunter (`apps/admin/lib/ai-agent`) menemukan project BARU (belum
pernah tersimpan sebelumnya — lihat catatan permanent-skip di
`lib/ai-agent/README.md`) dengan skor ≥ `PARTNER_NOTIFY_SCORE_THRESHOLD`
(default 40, level "opportunity" ke atas), `notifyProspectFound`
(`src/notify.ts`) posting satu embed per project ke channel ini — bukan
digest, satu project = satu pesan. Embed-nya menyertakan tombol LINK
(bukan tombol interactive, jadi TIDAK butuh Interactions endpoint apa pun)
ke Website/Twitter/Telegram/Discord/CoinGecko milik project itu kalau
datanya ada — anggota Partner Program tinggal klik tombol yang relevan
untuk langsung menghubungi calon klien itu. Sengaja TIDAK ada tombol "mark
as contacted" di sini (keputusan eksplisit user) — tracking status contact
tetap di dashboard admin (`apps/admin`), bukan di Discord. Sama seperti
semua `notify*` lain di package ini, fungsi ini TIDAK PERNAH melempar
error — kegagalan kirim cuma di-`console.error`, tidak pernah
menggagalkan run AI Prospect Hunter itu sendiri. Bot butuh permission
**Send Messages** dan **Embed Links** di channel ini (cek Server Settings
→ Roles atau override permission per-channel kalau kategori Partner
dibatasi).

## Cara ambil setiap nilai

### Client ID & Client Secret (OAuth2)
1. https://discord.com/developers/applications → pilih application "Nimia Studio Bot" Anda.
2. Sidebar kiri → **OAuth2 → General**.
3. **Client ID** langsung terlihat di sana (boleh copy langsung).
4. **Client Secret** — klik **Reset Secret** kalau belum pernah di-generate, lalu copy (cuma bisa dilihat sekali, kalau hilang harus reset ulang).
5. Di halaman yang sama, bagian **Redirects**, tambahkan:
   `https://nimiastudio.com/api/discord/callback`
   (dan kalau mau test di local dev: `http://localhost:3000/api/discord/callback` juga, tambahkan sebagai baris terpisah, JANGAN gabung di satu baris).

### Bot Token
1. Sidebar kiri → **Bot**.
2. **Reset Token** / **Copy Token**. Simpan baik-baik, jangan pernah share (termasuk ke chat AI manapun) — siapa pun yang pegang token ini bisa mengendalikan bot Anda sepenuhnya di server Discord itu.
3. Pastikan **Server Members Intent** aktif di halaman yang sama (dibutuhkan supaya assign role jalan benar).

### Public Key & Interactions Endpoint URL (fase tombol ticket)
1. https://discord.com/developers/applications → application "Nimia Studio Bot" → **General Information** (halaman pertama, bukan OAuth2/Bot).
2. **Public Key** ada di sana — copy langsung ke `DISCORD_PUBLIC_KEY`, bukan rahasia (boleh terlihat siapa saja) tapi tetap wajib diisi supaya `verifyDiscordInteractionRequest` bisa jalan.
3. Di halaman yang sama, field **Interactions Endpoint URL** — isi dengan `https://nimiastudio.com/api/discord/interactions` lalu **Save Changes**. Discord langsung mengirim satu request PING ke URL ini saat disimpan untuk memverifikasi endpoint hidup dan signature-nya valid — kalau `DISCORD_PUBLIC_KEY` belum di-deploy dengan benar, Save akan gagal dengan error di halaman itu sendiri (jangan bingung dengan error terpisah).
4. Kalau mau test di local dev, Discord TIDAK BISA mengirim request ke `localhost` — perlu tunnel (ngrok/cloudflared) dan isi Interactions Endpoint URL dengan URL tunnel itu SEMENTARA saat testing, lalu kembalikan ke URL production setelah selesai.

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

Satu-satunya dependency non-`fetch` di package ini adalah
`discord-interactions` (dipakai di `src/interactions.ts`, fungsi
`verifyKey`) — bukan SDK Discord, cuma helper resmi dari Discord sendiri
untuk verifikasi signature Ed25519 pada request Interactions HTTP endpoint
(lihat catatan "fase tombol ticket" di atas). Tetap bukan Gateway/websocket
— alasan yang sama di atas masih berlaku penuh.
