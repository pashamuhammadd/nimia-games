# Cara menerapkan patch ini

File ini (dan folder-folder di sekitarnya) adalah hasil kerja Claude 14 Agustus 2026:
memecah `apps/studio` menjadi `apps/studio` (marketing saja) + `apps/app`
(client dashboard baru, akan jadi `app.nimiastudio.com`). Detail lengkap ada
di project memory `studio_multi_app_split_plan.md`.

## 1. Extract ke root repo

Dari root repo (`C:\Users\mochn\nimia-games`), jalankan di PowerShell:

```powershell
Expand-Archive -Path "<path-ke-file-zip-ini>" -DestinationPath . -Force
```

Ini akan:
- Membuat folder BARU `apps\app\` (client dashboard: login, register, order,
  seluruh `/dashboard/*`, plus modules/order, modules/partners,
  modules/quests, modules/vouchers).
- MENIMPA (overwrite) beberapa file yang sudah ada:
  - `apps\studio\next.config.ts` — tambah redirect permanen dari
    `/login`, `/register`, `/order`, `/dashboard/*`, `/r/:code`,
    `/api/discord/*`, `/api/orders/*` ke `app.nimiastudio.com`.
  - `apps\studio\middleware.ts`, `apps\studio\.env.example`,
    `apps\studio\app\components\StartProjectButton.tsx`
  - `apps\admin\app\components\dashboard\Topbar.tsx`,
    `apps\admin\app\(protected)\orders\actions.ts`,
    `apps\admin\.env.example`
  - `packages\db\src\server.ts`
  - `packages\email\src\templates\{OrderReceivedEmail,NegotiationUpdateEmail,PaymentFlaggedEmail,PaymentVerifiedEmail,ConfirmSignupEmail}.tsx`
  - `packages\email\supabase-templates\confirm-signup.html`
  - `package.json` (root — tambah script `dev:app`/`build:app`)
- Menambahkan `delete-old-app-split-files.ps1` di root (script cleanup,
  BELUM otomatis dijalankan — lihat langkah 5).

Tidak ada file lain yang dihapus/disentuh. `apps/studio` masih punya salinan
lama `/dashboard`, `/login`, dll secara fisik — itu SENGAJA, karena tool
Claude tidak bisa menghapus file di komputer Anda. Salinan lama itu jadi
"mati" (tidak pernah diakses lagi) begitu `next.config.ts`'s redirects()
di atas aktif.

## 2. Isi env vars

- `apps\app\.env.local` (BARU, belum ada — copy dari `.env.example` lalu isi
  seperti biasa: Supabase, Cloudinary, Resend, Discord — nilai SAMA PERSIS
  dengan yang selama ini ada di `apps\studio\.env.local`, karena semua ini
  cuma pindah rumah, bukan berganti akun/kredensial).
- `apps\studio\.env.local` — tambahkan `NEXT_PUBLIC_APP_URL=http://localhost:3001`
  (atau port dev `apps/app` Anda) untuk dev lokal.
- `apps\admin\.env.local` — tambahkan `NEXT_PUBLIC_APP_URL=http://localhost:3001`
  juga.
- `NEXT_PUBLIC_COOKIE_DOMAIN` — biarkan KOSONG di semua `.env.local`. Ini
  HANYA diisi (`.nimiastudio.com`) di Vercel production env vars project
  `studio` dan `app` nanti — lihat catatan di `.env.example` masing-masing.

## 3. Install & jalankan lokal

```powershell
npm install
npm run dev:app     # apps/app di http://localhost:3001 (port beda dari studio)
npm run dev:studio  # apps/studio seperti biasa
```

Coba: buka `apps/app` lokal, login, cek `/dashboard` jalan. Buka
`apps/studio` lokal, klik "Start a Project" — harus redirect ke
`apps/app`'s `/order` (atau `/login` kalau belum login).

## 4. Deploy (setelah lokal OK)

1. Vercel: buat project BARU untuk `apps/app` (Root Directory =
   `apps/app`), isi semua env vars produksinya (termasuk
   `NEXT_PUBLIC_COOKIE_DOMAIN=.nimiastudio.com`).
2. Tambahkan domain `app.nimiastudio.com` ke project itu (Hostinger DNS +
   Vercel, pola sama seperti migrasi `nimiastudio.com` kemarin).
3. Update env var `NEXT_PUBLIC_COOKIE_DOMAIN=.nimiastudio.com` di project
   `studio` juga, lalu redeploy.
4. Update `NEXT_PUBLIC_APP_URL` di project `studio` DAN `admin` ke
   `https://app.nimiastudio.com`, redeploy keduanya.
5. Supabase Dashboard → Authentication → URL Configuration: tambah
   `https://app.nimiastudio.com/**` ke Redirect URLs.
6. Discord Developer Portal: OAuth2 Redirects tambah
   `https://app.nimiastudio.com/api/discord/callback`; Interactions
   Endpoint URL ganti ke `https://app.nimiastudio.com/api/discord/interactions`
   (HANYA setelah project `app` sukses redeploy — Discord langsung ping
   endpoint ini saat Save).

## 5. Setelah semua di atas dikonfirmasi jalan (opsional, kapan saja)

Jalankan `delete-old-app-split-files.ps1` dari root repo untuk menghapus
salinan lama yang sudah mati di `apps/studio`. Tidak mendesak — file yang
dihapus di sana sudah tidak pernah diakses sejak langkah 1.
