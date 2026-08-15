# Migrasi admin.nimiagames.com → hub.nimiastudio.com

Migrasi ini jauh lebih ringan dibanding split dashboard kemarin — `apps/admin`
TIDAK pindah/dipecah, cuma ganti domain. Nggak ada cookie cross-subdomain yang
perlu diatur (admin punya sesi staff sendiri, terpisah dari studio/app), dan
login admin pakai email+password biasa (bukan magic link/OTP), jadi Supabase
Redirect URLs juga TIDAK wajib diupdate untuk auth tetap jalan — tapi tetap
disarankan ditambah untuk jaga-jaga kalau nanti ada fitur reset password.

## 1. File yang berubah (6 file, semua cuma teks/komentar/config)

- `apps/admin/.env.example` — `NEXT_PUBLIC_SITE_URL` diganti dari
  `https://admin.nimiagames.com` ke `https://hub.nimiastudio.com`. Sekalian
  saya perbaiki `RESEND_FROM_EMAIL` yang masih `studio@nimiagames.com` di
  file ini (harusnya sudah `contact@nimiastudio.com` sejak patch dashboard
  split kemarin — kelihatannya baris ini belum sempat ke-apply).
- `apps/admin/middleware.ts`, `apps/admin/app/not-found.tsx`,
  `apps/admin/app/layout.tsx` — cuma komentar kosmetik, disebutkan domain
  baru.
- `packages/discord/README.md`, `docs/DISCORD.md` — dokumentasi, referensi
  "halaman Tickets admin.nimiagames.com" diganti ke hub.nimiastudio.com.

**Tidak ada bug fungsional yang diperbaiki di sini** (beda dengan migrasi
studio→nimiastudio.com yang punya beberapa fallback URL yang benar-benar
dipakai kode) — `NEXT_PUBLIC_SITE_URL` ternyata tidak dibaca di mana pun oleh
kode apps/admin saat ini, jadi migrasi ini murni domain/config, aman &
berisiko rendah.

## 2. Terapkan filenya

Copy 6 file ini ke lokasi yang sama persis di repo kamu (`apps/admin/...`,
`packages/discord/README.md`, `docs/DISCORD.md`), timpa yang lama.

## 3. Isi env vars

- `apps/admin/.env.local` — cek baris `NEXT_PUBLIC_SITE_URL`. **Ada bug lama
  yang belum diperbaiki**: baris ini kemungkinan besar masih salah isi
  (`https://studio.nimiagames.com`, ketinggalan dari copy-paste sebelum
  migrasi nimiastudio.com) — ganti jadi `http://localhost:<port-dev-admin>`
  untuk lokal.
- `RESEND_FROM_EMAIL` di `.env.local` — cek juga, kalau masih
  `studio@nimiagames.com`, ganti ke alamat yang kamu mau pakai (idealnya
  `contact@nimiastudio.com`, sama seperti studio/app).

## 4. Install & build

```powershell
npm install
npm run build
```

(Nggak ada file baru/dependency baru, jadi build harusnya cepat & aman.)

## 5. Deploy

1. **Hostinger DNS**: tambah record untuk `hub.nimiastudio.com` (CNAME/A,
   ambil target persis dari tampilan Vercel pas nambahin domain di langkah
   2 — sama pola seperti nimiastudio.com & app.nimiastudio.com kemarin).
2. **Vercel**: buka project `admin` yang SUDAH ADA (bukan project baru —
   ini bukan split, cuma ganti domain) → Settings → Domains → tambah
   `hub.nimiastudio.com`.
3. **Vercel env vars**: update `NEXT_PUBLIC_SITE_URL=https://hub.nimiastudio.com`
   di production env vars project `admin`, lalu **redeploy**.
4. **(Opsional, disarankan)** Supabase Dashboard → Authentication → URL
   Configuration: tambah `https://hub.nimiastudio.com/**` ke Redirect URLs
   — jaga-jaga untuk fitur auth berbasis email link di masa depan (reset
   password, dll). Tidak wajib untuk login yang ada sekarang.
5. Test: buka `hub.nimiastudio.com`, coba login staff, klik-klik beberapa
   halaman (orders, clients, tickets, dst) pastikan semua jalan normal.
6. Setelah dikonfirmasi jalan, baru copot `admin.nimiagames.com` dari
   project Vercel (dan dari DNS Hostinger kalau mau benar-benar dimatikan) —
   sama seperti keputusan kamu soal domain lama waktu migrasi
   nimiastudio.com kemarin.
