# Nimia Games — Arsitektur Platform

Status: **Tahap 1–4 SELESAI, DI-DEPLOY, DAN TERVERIFIKASI LIVE di production** — monorepo, Supabase 20 tabel + RLS aktif, auth + dashboard shell + form Order Service jalan end-to-end di `nimiastudio.com` (kedua Vercel deployment hijau). Email profesional (Resend + custom SMTP Supabase + template branded) juga sudah aktif, dan seluruh UI `apps/studio` sudah diterjemahkan ke Bahasa Inggris (`apps/www` tetap Bahasa Indonesia, keputusan sengaja). **Tahap 5 (backend: order→project→invoice, PDF, Cloudinary) BELUM DIMULAI.** Lihat "Status Tahap 4" dan "Status Tahap 4.5" di bagian bawah dokumen ini.

## Status Tahap 2 (28 Juli 2026)

File-file baru berikut sudah ditulis ke device Anda di root repo (`C:\Users\mochn\nimia-games\`):

- `turbo.json`, `package.json.monorepo`, `README.md.monorepo`, `MIGRATE.ps1` — aktif setelah Anda jalankan script
- `packages/config`, `packages/ui`, `packages/db`, `packages/email`, `packages/auth`, `packages/validators` — masing-masing `package.json` + `README.md` + placeholder `src/index.ts` (kosong, diisi tahap berikutnya sesuai catatan di README masing-masing)
- `apps/studio/` — skeleton Next.js polos (belum Tailwind/shadcn, belum Supabase), halaman placeholder, `.env.example` untuk Supabase/Cloudinary/Resend

Yang BELUM otomatis (sengaja, karena butuh `git mv` yang cuma bisa dijalankan dari mesin Anda sendiri): memindahkan `app/`, `components/`, `data/`, `hooks/`, `lib/`, `types/`, `public/`, dan config root (`package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `next-env.d.ts`, `README.md`) yang sekarang ada di ROOT repo ke `apps/www/`. Jalankan `MIGRATE.ps1` di root repo untuk melakukan ini secara otomatis (pakai `git mv` supaya riwayat git tetap terjaga), lalu ikuti langkah manual yang dicetak di akhir script (npm install, verifikasi lokal, baru push + update Root Directory di Vercel).

**Penting:** jangan commit/push sebelum `npm run dev:www` dan `npm run dev:studio` sukses jalan lokal, dan jangan lupa ubah Root Directory project Vercel yang sudah ada (nimiagames.com) jadi `apps/www` sebelum/bersamaan dengan push, supaya deploy production tidak putus.

Dokumen ini merancang transisi dari `nimia-games` (saat ini: 1 Next.js app untuk landing page, sudah live di www.nimiagames.com) menjadi platform studio digital dengan 3 subdomain terintegrasi: `www`, `portfolio`, dan `studio`. Sesuai keputusan yang disepakati: **monorepo Turborepo**, prioritas pembangunan **nimiastudio.com** duluan, dan backend services (Supabase/Cloudinary/Resend) **belum dibuat** — jadi Tahap 1–2 akan menyiapkan struktur & kode yang siap pakai begitu akun/API key tersedia.

---

## 1. Struktur Monorepo

```
nimia-games/                     (root monorepo)
├── apps/
│   ├── www/                     # nimiagames.com — hasil migrasi repo saat ini
│   ├── portfolio/                # portfolio.nimiagames.com — dibangun setelah studio
│   └── studio/                   # nimiastudio.com — PRIORITAS SEKARANG
│
├── packages/
│   ├── ui/                       # shadcn/ui components + design tokens brand (maroon/crimson/pink)
│   ├── db/                       # Supabase client, migration SQL, generated types
│   ├── email/                    # Template React Email untuk Resend
│   ├── auth/                     # Helper Supabase Auth (session, role guard, middleware)
│   ├── validators/                # Skema Zod bersama (order form, invoice, dll)
│   └── config/                    # Shared eslint/tsconfig/tailwind preset
│
├── docs/
│   └── ARCHITECTURE.md            # dokumen ini, terus diperbarui tiap tahap
│
├── turbo.json
└── package.json                   # npm/pnpm workspaces
```

**Alasan desain:**
- Prinsip "Scalability" & "Maintainability" di project instructions eksplisit minta arsitektur modular, reusable, tidak monolitik. Monorepo dengan `packages/ui` dan `packages/db` bersama mencegah 3 subdomain punya 3 versi komponen/skema berbeda yang lama-lama divergen.
- Turborepo dipilih (bukan Nx) karena dibuat oleh Vercel, integrasi native dengan deployment Vercel yang sudah dipakai, dan cukup ringan untuk tim kecil/independen studio.
- Repo `nimia-games` yang sekarang **tidak dibuang** — kontennya dipindah jadi `apps/www` nyaris tanpa perubahan struktur internal, supaya v6/v7 yang sudah live tidak perlu di-rewrite.

**Deployment (Vercel):**
Setiap `apps/*` jadi **project Vercel terpisah** yang menunjuk ke repo Git yang sama, dengan "Root Directory" di-set ke `apps/www`, `apps/portfolio`, `apps/studio`. Masing-masing project di-assign domain: `nimiagames.com` (+ `www`), `portfolio.nimiagames.com`, `nimiastudio.com`. Ini artinya deploy salah satu subdomain tidak memicu re-deploy yang lain (Turborepo `--filter` membatasi build scope), dan tiap app bisa scale/rollback independen — penting karena `studio` (auth, dashboard, PDF) punya karakteristik beban & risiko berbeda dari `www` (statis, marketing).

---

## 2. Tech Stack Tambahan (khusus modul studio, tahap prioritas)

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| UI components | `shadcn/ui` di `packages/ui` | Belum terpasang di repo saat ini; sesuai tech stack yang diminta, dan `apps/www` bisa migrasi bertahap ke komponen yang sama |
| Auth + Database | `@supabase/supabase-js` + `@supabase/ssr` | Auth (client vs admin role) dan Postgres dalam satu layanan, RLS untuk isolasi data per-client |
| Form + validasi | `react-hook-form` + `zod` + `@hookform/resolvers` | Diminta eksplisit di tech stack; skema Zod ditaruh di `packages/validators` supaya dipakai ulang di server action (validasi ganda client+server) |
| Upload media | `Cloudinary` (`next-cloudinary` untuk widget upload, SDK server untuk signed upload lampiran order/project file) | Diminta eksplisit; juga dipakai portfolio nanti |
| Email transaksional | `Resend` + `react-email` (template disusun sebagai komponen React di `packages/email`) | Diminta eksplisit; react-email memberi preview & type-safety template |
| PDF invoice/receipt | `@react-pdf/renderer` | **Rekomendasi kunci**: dibuat murni di React tanpa headless browser, jauh lebih ringan & stabil di Vercel serverless dibanding Puppeteer/Playwright (yang butuh binary Chromium besar dan sering timeout di cold start). Cukup untuk layout A4 corporate minimalis yang diminta |
| QR pembayaran | `qrcode` (server-side, di-embed sebagai image ke PDF/invoice) | Ringan, tidak perlu service eksternal |
| Realtime status/messages | Supabase Realtime (opsional, tahap lanjut) | Timeline project & pesan client-admin bisa update tanpa refresh; bisa ditunda ke tahap backend jika ingin MVP dulu pakai polling/refresh biasa |

Catatan: repo saat ini pakai **Next.js 16.2.9 & React 19.2** (versi sangat baru, ada `AGENTS.md` yang memperingatkan API/konvensi bisa beda dari training data). Semua `apps/*` baru akan disamakan ke versi ini supaya konsisten, dan setiap kali menulis kode Next.js baru saya akan cek dulu `node_modules/next/dist/docs/` sebelum pakai API yang mungkin berubah.

---

## 3. Skema Database (Supabase/Postgres) — modul studio

Ringkasan tabel & relasi utama (detail kolom + RLS policy akan ditulis sebagai file migration SQL di Tahap 3, setelah struktur folder disetujui):

- **users** — extend `auth.users` (profile: `role` enum `admin` | `client`, nama, avatar)
- **clients** — 1:1 ke `users` (role=client): nama perusahaan, email, WhatsApp, negara
- **services** — katalog layanan (3D Animation, Game Trailer, dst) + kategori, deskripsi, base price
- **orders** — `client_id`, `service_id`, budget, deadline, deskripsi, lampiran, reference link, status awal `Pending Review`
- **projects** — dibuat dari order yang disetujui admin; status mengikuti 10 tahap (`Pending Review` → ... → `Completed`/`Cancelled`), progress %, timeline
- **project_updates** — log setiap perubahan status project → sumber data timeline otomatis
- **messages** — thread per project antara client ↔ admin, dengan lampiran & status baca
- **invoices** — nomor otomatis `INV-YYYYMMDD-####` (function Postgres untuk atomic increment per hari), item, subtotal, diskon, pajak, total, status (`Draft`…`Overdue`)
- **invoice_items** — baris item invoice (qty × harga)
- **payments** — riwayat pembayaran per invoice, bukti bayar, metode
- **receipts** — dibuat otomatis saat admin klik "Mark as Paid", nomor `RCT-YYYYMMDD-####`, link PDF
- **portfolio / portfolio_categories / portfolio_tags** — dipakai bersama oleh `apps/portfolio` (tahap berikutnya) dan preview di `apps/studio`/`apps/www` bila perlu
- **project_files** — file deliverable & referensi per project, link ke Cloudinary/Storage
- **email_logs** — audit setiap email yang dikirim Resend (event, status, timestamp)
- **notifications** — notifikasi in-app untuk admin & client

**Keamanan (Row Level Security):** setiap tabel milik client (`orders`, `projects`, `invoices`, `messages`, `project_files`, `payments`, `receipts`) akan punya policy: client hanya bisa `SELECT` baris miliknya sendiri (`client_id` cocok dengan `auth.uid()` via tabel `clients`), admin (role check) punya akses penuh. Ini krusial karena route `nimiastudio.com/client/[client_id]` akan diakses langsung oleh client — keamanan harus di level database, bukan cuma di UI.

---

## 4. Urutan Tahap Kerja (mengikuti "Cara Bekerja")

1. **Arsitektur** — dokumen ini (sedang berjalan, menunggu persetujuan Anda)
2. **Struktur folder** — scaffold monorepo, migrasi `apps/www`, skeleton `apps/studio` + semua `packages/*` (belum ada logic bisnis, baru kerangka + config)
3. **Database** — file migration SQL lengkap + RLS policy + dokumentasi cara apply ke Supabase project Anda nanti (karena akun belum ada, saya siapkan semuanya sebagai kode siap pakai + `.env.example`)
4. **UI** — shell dashboard studio, halaman auth (login/register client), form Order Service dengan semua field yang diminta
5. **Backend** — server actions: submit order → notifikasi admin, admin buat invoice → email ke client, mark as paid → generate receipt PDF otomatis, dst
6. **Testing** — alur kritis (order → invoice → payment → receipt) dan validasi RLS (client A tidak bisa lihat data client B)

Setiap tahap akan saya tutup dengan penjelasan alasan desain dan menunggu persetujuan Anda sebelum lanjut, sesuai instruksi project.

---

## 5. Yang Saya Butuhkan dari Anda (untuk tahap-tahap berikutnya, tidak mendesak sekarang)

Karena akun Supabase/Cloudinary/Resend belum ada, Tahap 2–3 akan saya siapkan sepenuhnya sebagai kode (migration files, `.env.example`, dokumentasi setup step-by-step) yang bisa langsung dipakai begitu Anda:
1. Buat project Supabase baru → isi `SUPABASE_URL` & `SUPABASE_ANON_KEY`/`SERVICE_ROLE_KEY`
2. Buat account Cloudinary → isi `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY/SECRET`
3. Buat account Resend + verifikasi domain `nimiagames.com` → isi `RESEND_API_KEY`

Saya akan tulis panduan lengkap langkah-langkahnya di README masing-masing package saat tahap tersebut tiba.

---

**Tahap 2 sedang berjalan** — jalankan `MIGRATE.ps1` sesuai instruksi di atas, verifikasi lokal, lalu kabari saya. Setelah itu saya lanjut ke Tahap 3 (skema database Supabase) begitu Anda sudah punya project Supabase, atau saya bisa siapkan dulu file migration SQL-nya sebagai kode siap pakai sambil Anda urus akunnya.

---

## Status Tahap 4 — SELESAI, DI-DEPLOY, DAN TERVERIFIKASI LIVE (29 Juli 2026)

Tahap 3 sudah selesai & terverifikasi (20 tabel + RLS aktif semua di Supabase, `.env.local` terisi). Tahap 4 membangun UI dasar `nimiastudio.com` yang **beneran konek** ke Supabase Auth (bukan placeholder lagi). **Update: seluruh isi bagian ini sudah di-commit, di-push, dan kedua Vercel deployment (`nimia-games` & `nimia-games-studio`) hijau/sukses.** User sudah test end-to-end di production: daftar → konfirmasi email → login → submit form Order Service → row masuk ke tabel `orders`.

**`packages/ui`** — komponen gaya shadcn/ui ditulis tangan (bukan lewat CLI shadcn, dan sengaja belum pakai Radix UI dulu untuk mengurangi risiko dependency yang belum diverifikasi jalan di Next.js 16 + React 19): `Button`, `Input`, `Textarea`, `Select`, `Label`/`FieldError`, `Card` (+ sub-komponen). Dibangun pakai `clsx` + `tailwind-merge` + `class-variance-authority`, pola yang sama seperti shadcn/ui asli.

**`apps/studio`** — Tailwind v4 diaktifkan (sebelumnya CSS polos). Tema dibuat **terang** (berbeda dari `apps/www` yang gelap) karena studio adalah dashboard kerja (form, tabel, invoice) yang perlu keterbacaan tinggi saat dipakai sehari-hari — tapi tetap pakai variabel warna brand (maroon/crimson/pink) yang sama persis dengan `apps/www` untuk aksen (tombol, link, focus ring), supaya dua app tetap terasa satu brand.

- `middleware.ts` — refresh session Supabase di setiap request + redirect otomatis (belum login & buka `/dashboard/*` → `/login`; sudah login & buka `/login`/`/register` → `/dashboard`).
- `app/actions.ts` — Server Actions `signInAction`/`signUpAction`/`signOutAction`, validasi Zod dari `@nimia/validators`.
- `app/login`, `app/register`, `app/register/check-email` — form asli (bukan mock), pakai `useActionState` (React 19) supaya pesan error server tampil tanpa JavaScript tambahan.
- `app/dashboard/layout.tsx` — shell terproteksi (sidebar desktop, nav bawah mobile, tombol Keluar), plus pengecekan sesi kedua di server component (defense in depth di luar middleware).
- `app/dashboard/orders` — **Form Order Service** pakai `react-hook-form` + `zod` (`@hookform/resolvers/zod`) sesuai tech stack yang diminta, submit lewat Server Action `createOrderAction` yang **validasi ulang di server** sebelum insert ke tabel `orders` (jangan pernah percaya validasi client saja). Upload lampiran file **sengaja ditunda** sampai akun Cloudinary dibuat.
- `app/dashboard/{projects,invoices,messages,profile}` — halaman placeholder "Segera hadir di Tahap 5" (kecuali profile, yang sudah menampilkan data asli dari tabel `users`/`clients`).

**Bug yang ditemukan & diperbaiki saat menulis Tahap 4:** `packages/db/src/server.ts` (ditulis di Tahap 3) memanggil `cookieStore.setAll(...)`, padahal `cookies()` dari `next/headers` tidak punya method `setAll` (cuma `get`/`getAll`/`set`/`delete`) — kalau tidak diperbaiki, sesi login tidak akan pernah benar-benar tersimpan di cookie (gagal senyap, ketutup oleh `try/catch`). Sudah diperbaiki mengikuti pola resmi dari dokumentasi Supabase (loop `cookieStore.set()` per cookie).

**2 migration SQL baru** (jalankan di SQL Editor Supabase, urutan setelah `0006`):
- `0007_auto_provision_client.sql` — perluas trigger signup supaya otomatis bikin baris `clients` juga (bukan cuma `users`), pakai metadata dari form Daftar (company_name/whatsapp/country). Tanpa ini, form Order Service tidak akan menemukan `client_id` milik user yang baru daftar.
- `0008_seed_services.sql` — isi 9 baris awal tabel `services` (satu per kategori) supaya dropdown "Layanan" di form Order Service tidak kosong. Aman dijalankan berkali-kali (skip baris yang namanya sudah ada) — silakan edit harga/nama setelah dijalankan.

**Temuan tambahan yang juga diperbaiki:** `package.json` di root repo ternyata **tidak** berisi konfigurasi monorepo (`workspaces` + `packageManager`) seperti seharusnya — isinya malah sama seperti `apps/www/package.json` (kemungkinan sempat ter-revert entah bagaimana). Sudah ditulis ulang jadi manifest monorepo yang benar. **Cek `git diff package.json` sebelum commit** untuk memastikan Anda paham perubahannya, dan kalau `npm install` di root sempat aneh setelah ini, hapus `node_modules/` + `package-lock.json` di root lalu `npm install` ulang.

### Bug yang ditemukan & diperbaiki saat commit/deploy Tahap 4 ke Vercel

Setelah kode di atas selesai ditulis dan lolos `npm run dev` lokal, proses commit → push → deploy ke Vercel memakan beberapa putaran debugging (referensi kalau ketemu gejala serupa lagi):

1. **`Type instantiation is excessively deep and possibly infinite`** di `zodResolver(orderFormSchema)` saat `next build` (lolos di `next dev` karena Turbopack dev tidak strict type-check). Skema `orderFormSchema` sempat pakai `.optional().or(z.literal(""))` di banyak field sekaligus, plus `apps/studio/package.json` sempat punya `zod` versi ganda (root override vs direct dependency) yang memperparah. **Fix yang beneran mempan:** cast argumen yang MASUK ke `zodResolver`, bukan hasilnya — `zodResolver(schema as any)`, BUKAN `zodResolver(schema) as Resolver<T>` (cast hasil tidak menolong karena TypeScript tetap harus menghitung tipe argumen dulu sebelum cast berlaku). Simplifikasi skema (buang union `.or(z.literal(""))`, pakai `.optional()` polos + `z.preprocess` khusus untuk `reference_link`) membantu tapi TIDAK cukup sendirian.
2. **`Parameter 'cookiesToSet' implicitly has an 'any' type`** di `middleware.ts` DAN `packages/db/src/server.ts` (pola sama di dua tempat) — hanya muncul di `next build`, tidak di `next dev`. Fix: kasih tipe eksplisit `{ name: string; value: string; options?: Record<string, unknown> }[]`.
3. **PALING MEMAKAN WAKTU — native binary `lightningcss`/`@tailwindcss/oxide` hilang di `package-lock.json` untuk platform Linux**, setelah lockfile di-generate ulang dari Windows saat memperbaiki bug #1. Gejala: Vercel build gagal di KEDUA app (`www` & `studio`, satu lockfile di-share) dengan `Error: Cannot find module '../lightningcss.linux-x64-gnu.node'`. Yang TIDAK mempan: clear build cache Vercel, ganti Install Command jadi `npm install` manual, `npm install --package-lock-only --os=linux --cpu=x64 --libc=glibc`. **Yang akhirnya mempan:** parsing `package-lock.json` langsung untuk menemukan versi persis `lightningcss-linux-x64-gnu` & `@tailwindcss/oxide-linux-x64-gnu` yang sudah tercatat di metadata `optionalDependencies` milik paket induknya, lalu menambahkan keduanya sebagai **`optionalDependencies` LANGSUNG di root `package.json`** (lihat root `package.json` saat ini). Verifikasi dengan mencari string `lightningcss-linux-x64-gnu` di `package-lock.json` sebelum push — harus ada baris "resolved" dengan URL tarball.
4. **Pengaturan production belum lengkap meski build sukses:** Vercel Environment Variables project `nimia-games-studio` (termasuk `NEXT_PUBLIC_SITE_URL=https://nimiastudio.com`) perlu diisi manual (tidak otomatis dari `.env.local`), begitu juga Supabase Authentication → URL Configuration (Site URL & Redirect URLs) yang defaultnya masih `localhost`. Sudah diperbaiki dan dikonfirmasi user.

**Pelajaran umum:** `next dev` (Turbopack) TIDAK strict type-check dan tidak butuh lockfile lengkap — kelihatan "aman" padahal `next build` (dipakai Vercel) bisa gagal karena hal yang tidak kelihatan di dev. Selalu jalankan `npm run build:studio`/`build:www` lokal SEBELUM push kalau ada perubahan dependency/tipe.

Yang **belum** dikerjakan (menyusul di Tahap 5): server actions untuk convert order → project, invoice/PDF (`@react-pdf/renderer`), pengiriman `OrderReceivedEmail` beneran lewat Resend di server action, upload Cloudinary, halaman admin.

---

## Status Tahap 4.5 — Email profesional (Resend) & lokalisasi Bahasa Inggris (29 Juli 2026)

Di luar 6 tahap resmi "Cara Bekerja" (karena sifatnya konfigurasi akun pihak ketiga + perbaikan bahasa, bukan fitur baru), dua pekerjaan berikut selesai setelah Tahap 4 UI live:

**Setup Resend:**
- Domain `nimiagames.com` ditambahkan & **terverifikasi** di Resend (DNS record di-manage lewat Hostinger — DKIM/SPF di subdomain `send.nimiagames.com`, tidak bentrok dengan mailbox `contact@nimiagames.com` yang sudah ada di root domain).
- `RESEND_API_KEY` sudah didapat (disimpan user, belum dipakai kode manapun — dipakai nanti di Tahap 5 untuk kirim `OrderReceivedEmail`).
- **Custom SMTP Supabase Auth** disambungkan ke Resend (Authentication → Settings → SMTP Settings): host `smtp.resend.com`, port `587`, username `resend`, password = Resend API key, sender `contact@nimiagames.com` / nama pengirim "Nimia Games Studio". Ini membuat email bawaan Supabase Auth (konfirmasi signup, reset password, dst) terkirim dari alamat brand, bukan alamat default Supabase lagi.

**`packages/email` (React Email v6, `react-email@6.5.0` + `@react-email/ui@6.5.0` — versi harus SAMA PERSIS, kalau beda CLI `email dev` akan coba auto-install lewat spawn subprocess yang bisa gagal di Windows dengan `spawn cmd.exe ENOENT`):**
- `src/components/EmailLayout.tsx` — layout bersama semua template: warna brand sebagai HEX literal (bukan CSS variable — banyak email client tidak mendukung custom property), logo + wordmark sebagai dua PNG terpisah yang di-host di `apps/www/public/` (`logo-email.png` crop rapat, `nimia-games-wordmark-dark.png` hasil rekolorasi SVG putih di web jadi maroon/crimson untuk background terang) — sengaja PNG bukan SVG karena Outlook desktop tidak render `<img src="*.svg">`.
- `src/templates/OrderReceivedEmail.tsx` — template konfirmasi pesanan, dikirim via Resend (`resend.emails.send({ react: <OrderReceivedEmail ... /> })`, tidak perlu `render()` manual). **Belum dikirim dari mana pun** — baru template-nya, pengiriman beneran menyusul di Tahap 5 saat `createOrderAction` dibangun ulang untuk itu.
- `src/templates/ConfirmSignupEmail.tsx` + `supabase-templates/confirm-signup.html` — desain yang sama untuk email "Confirm signup" bawaan Supabase Auth. Dua file terpisah karena Supabase butuh HTML mentah + Go-template variable (`{{ .ConfirmationURL }}`, `{{ .Email }}`), bukan komponen React — `.tsx`-nya cuma referensi desain/preview lokal, yang **beneran aktif** adalah `confirm-signup.html` yang di-paste manual ke Supabase Dashboard (Authentication → Email Templates → Confirm signup). Kalau desain brand berubah, dua file ini harus diupdate manual bareng-bareng, tidak ada build step yang sinkronkan otomatis.

**Lokalisasi Bahasa Inggris (keputusan user, 29 Juli 2026):** seluruh `apps/studio` (semua halaman, form, pesan error), `packages/validators` (pesan error Zod), `packages/email` (isi email + subject), dan template Supabase Auth (`confirm-signup.html`) diterjemahkan penuh ke Bahasa Inggris. **`apps/www` sengaja TIDAK diubah**, tetap Bahasa Indonesia (audiens lokal, keputusan eksplisit user). `packages/ui` sudah dicek — tidak ada teks hardcoded di sana, aman. Migration `0009_translate_service_descriptions.sql` (translate deskripsi 9 baris `services` yang di-seed migration 0008) dan `0010_fix_custom_project_description.sql` (follow-up kecil menghapus satu strip panjang yang kelewat) sudah dijalankan user di SQL Editor.

**Catatan gaya untuk konten Inggris ke depan:** user secara eksplisit minta HINDARI strip panjang (em dash "—"/`&mdash;`) di teks yang tampil ke pengguna (UI, email) karena terasa tidak natural/kelihatan seperti tulisan AI — pecah jadi kalimat pendek atau pakai kata sambung biasa ("and", "so", koma) sebagai gantinya. Berlaku untuk teks Inggris baru di `apps/studio`, `packages/email`, dan konten Inggris lain di proyek ini; tidak berlaku untuk komentar kode (tidak dilihat user) atau `apps/www` yang berbahasa Indonesia.

Yang **belum** dikerjakan: mengirim `OrderReceivedEmail` beneran (Tahap 5), template lain (penawaran harga, invoice, pembayaran — juga Tahap 5).

---

## Rancangan Arsitektur Tahap 5 (menunggu persetujuan) — 29 Juli 2026

Tahap 5 jauh lebih besar dari perkiraan awal dokumen ini (bagian 4 & 5 di atas cuma menyebut "order→project, invoice/PDF, email, Cloudinary"). Setelah diskusi detail dengan user (kuesioner tertulis + tanya jawab), scope-nya berkembang jadi: negosiasi harga, pembayaran kripto multi-jaringan dengan verifikasi manual, halaman keuangan khusus founder, dan sistem referral/ambassador dengan integrasi Discord. Bagian ini merancang semuanya sebelum satu baris kode pun ditulis, sesuai "Cara Bekerja".

### 1. Peran & akses (roles)

`user_role` enum (sekarang cuma `admin` | `client`) diperluas jadi 4 tingkat:

- **`client`** — user biasa, order & bayar (role default, tidak berubah)
- **`staff`** — kelola pesanan (approve/reject/negosiasi/konfirmasi pembayaran), TIDAK bisa lihat halaman keuangan. Menggantikan makna `admin` yang lama untuk orang selain founder.
- **`founder`** — semua kemampuan `staff`, PLUS akses halaman keuangan (`/dashboard/finance`). Untuk sekarang cuma 1 akun (milik Anda), tapi role-nya dipisah dari `staff` dari awal supaya kalau nanti ada staff lain, mereka otomatis TIDAK bisa lihat keuangan tanpa perlu migrasi ulang.
- **Ambassador BUKAN role di `users`** — status ambassador disimpan di tabel terpisah (`ambassadors`, lihat bagian 6), karena satu akun client BISA JUGA jadi ambassador sekaligus (order sendiri + referensikan orang lain), jadi tidak cocok jadi satu enum yang saling eksklusif.

Migrasi: `ALTER TYPE user_role ADD VALUE 'staff'; ALTER TYPE user_role ADD VALUE 'founder';`, lalu update akun Anda yang sekarang `admin` jadi `founder` (row `admin` lama dipertahankan di enum untuk kompatibilitas mundur, tapi tidak dipakai lagi untuk akun baru).

### 2. Skema database tambahan (migration 0011 dst.)

**Perluasan `orders`** (kolom baru):
- `proposed_price_usd numeric` — harga yang diajukan buyer saat negosiasi
- `final_price_usd numeric` — harga yang disepakati (diisi begitu admin konfirmasi)
- `payment_network text`, `payment_token text` — jaringan & token yang dipilih buyer (mis. `bsc` / `USDT`)
- `payment_wallet_address text` — snapshot alamat wallet perusahaan yang ditampilkan ke buyer (dari `payment_wallets`, disalin ke sini supaya kalau alamat perusahaan berubah nanti, histori order lama tidak ikut berubah)
- `payment_expected_amount numeric` — jumlah token yang harus dikirim (dihitung dari `final_price_usd` dikonversi ke token pada saat itu)
- `payment_tx_hash text` — hash transaksi yang disubmit buyer
- `payment_submitted_at timestamptz`
- `payment_verified_by uuid references users`, `payment_verified_at timestamptz`
- `payment_underpaid_note text` — catatan otomatis kalau ada toleransi kurang bayar (lihat bagian 5)

**`order_status` enum** (sekarang: `pending_review`, `quotation_sent`, `rejected`, `converted`) — diperluas jadi: `pending_review`, `negotiating`, `awaiting_payment`, `payment_submitted`, `paid`, `converted`, `rejected`. Alur: buyer submit → `pending_review` → buyer/admin nego → `negotiating` → admin setuju harga → `awaiting_payment` → buyer submit tx hash → `payment_submitted` → admin konfirmasi → `paid` → admin convert jadi project → `converted`.

**Tabel baru `order_negotiations`** — log setiap tawaran (bukan cuma field tunggal yang ketimpa), karena bisa bolak-balik beberapa ronde:
`id, order_id, proposed_by ('client'|'staff'), amount_usd, message, created_at`

**Tabel baru `payment_wallets`** — alamat wallet perusahaan per jaringan, dikelola admin (bukan hardcode di kode):
`id, network ('ethereum'|'bsc'|'tron'|'solana'|'cardano'), address, is_active, created_at`
Diseed cuma 3 baris dulu (`ethereum`, `bsc`, `tron`) sesuai keputusan mulai bertahap — lihat bagian 5.

**Tabel baru `ambassador_applications`** — form pendaftaran publik:
`id, full_name, email, telegram, discord_username, wallet_address, status ('pending'|'approved'|'rejected'), reviewed_by, reviewed_at, created_at`

**Tabel baru `ambassadors`** — dibuat begitu aplikasi di-approve:
`id, user_id references users, referral_code text unique, commission_rate numeric, founding_member boolean, created_at`
`commission_rate` DIKUNCI pas approve (0.10 untuk 100 ambassador pertama yang disetujui, 0.05 setelahnya) — bukan dihitung ulang tiap saat, supaya kalau kuota 100 sudah lewat, ambassador lama tetap 10% selamanya sesuai kesepakatan.

**Tabel baru `referrals`** — siapa direferensikan siapa:
`id, ambassador_id, referred_user_id, created_at`
Diisi otomatis saat orang daftar lewat link `nimiastudio.com/register?ref=KODE`.

**Tabel baru `commissions`** — ledger komisi per order:
`id, ambassador_id, order_id, amount_usd, rate_applied, status ('pending'|'paid'), paid_at, paid_tx_reference, created_at`
Baris dibuat otomatis begitu `orders.status` jadi `paid` (kalau order itu dari client yang punya baris di `referrals`).

Halaman keuangan founder (bagian 7) dan halaman referral ambassador (bagian 6) cukup dihitung on-the-fly dari tabel-tabel di atas (query agregat), tidak perlu tabel ringkasan terpisah — lebih simpel dan selalu akurat tanpa perlu sinkronisasi.

### 3. Struktur halaman & navigasi

**Halaman publik** (navbar di atas, TANPA sidebar — sesuai jawaban Anda):
- `/` — landing page: hero + wordmark "Nimia Games Studio" di navbar kiri, tombol Login di navbar kanan, section fitur singkat, showcase karya (lihat catatan di bagian "Asumsi" di bawah), teaser harga layanan dengan CTA ke `/services`
- `/services` — daftar semua layanan sebagai card, harga "mulai dari" + teks kecil "harga bisa dinego", klik card → halaman order layanan itu
- `/services/[slug]` — form order spesifik per layanan (skrip/referensi/style/deadline/pilihan pembayaran) + estimasi harga otomatis + tombol "Ajukan Negosiasi"
- `/register` — halaman penuh, form daftar akun (tetap ada, tidak dihapus)
- `/login` — halaman penuh, form login (tetap ada, tidak dihapus) — dipakai kalau user langsung ketik/navigasi ke URL ini, atau dari link internal yang eksplisit menuju halaman login
- `/ambassador/apply` — form aplikasi program ambassador (nama, email, telegram, discord, wallet address)
- **CTA "Login" di navbar** (tombol di kanan atas, muncul di semua halaman publik) membuka **modal login** langsung di tempat (tanpa pindah halaman) — ini shortcut cepat supaya user tidak perlu klik lagi buat mulai order. Modal ini punya link "Belum punya akun? Daftar" yang mengarahkan ke `/register`, dan link kecil "atau gunakan halaman login penuh" yang mengarahkan ke `/login` kalau user lebih suka itu. Jadi ADA dua jalur ke login (modal dari navbar untuk kecepatan, halaman `/login` tetap ada untuk kerapian/URL yang bisa di-share/bookmark) — bukan salah satu doang. Setelah login sukses (lewat jalur mana pun), redirect ke `/dashboard`.

**Dashboard** (sidebar di kiri, TANPA navbar atas — struktur yang sudah ada dari Tahap 4, cuma ditambah item baru + ikon + active-state):
- `/dashboard` — Overview (semua role)
- `/dashboard/orders` — untuk `client`: order milik mereka sendiri + status + tombol nego kalau masih tahap negosiasi
- `/dashboard/admin/orders` — untuk `staff`/`founder` SAJA: tabel semua order masuk, filter status, klik → detail + aksi (approve/reject/nego/konfirmasi pembayaran dengan link explorer)
- `/dashboard/projects`, `/dashboard/invoices` — dibangun penuh di Tahap 5 (bukan placeholder lagi, sesuai jawaban Anda)
- `/dashboard/finance` — untuk `founder` SAJA, redirect kalau role lain coba akses
- `/dashboard/referrals` — untuk user yang punya baris di `ambassadors` SAJA: link referral mereka, daftar orang yang direferensikan + status order, komisi pending/paid
- `/dashboard/profile` — sudah ada, tidak berubah

Sidebar menampilkan item sesuai role: `client` tidak lihat "Admin Orders"/"Finance", `staff` lihat "Admin Orders" tapi tidak "Finance", `founder` lihat semua, siapa pun yang punya baris `ambassadors` lihat "Referrals" (independen dari role).

### 4. Alur buyer lengkap (ringkasan dari jawaban Anda)

`/services/[slug]` (isi form + lihat estimasi harga) → klik "Ajukan Negosiasi" → masuk `order_negotiations` + `orders.status = negotiating` → staff/founder lihat di `/dashboard/admin/orders`, bisa langsung setuju atau counter-offer → begitu harga disepakati (`orders.status = awaiting_payment`, `final_price_usd` terisi) → buyer dapat notifikasi (email + badge) untuk lanjut bayar → halaman pembayaran tampilkan alamat wallet sesuai jaringan pilihan buyer + jumlah token yang harus dikirim → buyer kirim manual dari wallet-nya sendiri → buyer submit tx hash di form → `orders.status = payment_submitted` → staff/founder buka `/dashboard/admin/orders`, klik link otomatis ke block explorer yang sesuai (Etherscan/BscScan/Tronscan) buat cek alamat perusahaan + tx hash yang disubmit buyer → kalau valid, klik "Konfirmasi Pembayaran" (ada modal konfirmasi) → `orders.status = paid`, invoice PDF otomatis ter-generate, email konfirmasi terkirim, baris `commissions` otomatis dibuat kalau buyer itu hasil referral → staff/founder convert jadi project kapan pun siap mulai kerjain.

### 5. Sistem pembayaran kripto — Fase 1

Sesuai keputusan mulai bertahap: **Fase 1 cuma 3 jaringan — Ethereum, BNB Smart Chain, Tron** (paling likuid buat USDT/USDC, dan Tron punya biaya gas paling murah buat USDT yang paling umum dipakai). Solana & Cardano jadi Fase 2, ditambahkan sebagai baris baru di `payment_wallets` kapan pun siap tanpa perlu ubah struktur.

Harga selalu dalam USD (`final_price_usd`). Untuk stablecoin (USDT/USDC/BUSD) konversinya ~1:1, tidak perlu API harga real-time. Untuk token native (ETH, BNB) perlu kurs live — pakai CoinGecko API (gratis, tanpa API key untuk kebutuhan sederhana ini) buat hitung `payment_expected_amount` pas invoice dibuat.

Toleransi kurang bayar 1-2% dianggap lunas otomatis, dengan `payment_underpaid_note` terisi teks sopan yang muncul di invoice/email (akan saya tulis draft bahasanya pas bagian ini dikerjakan).

Verifikasi pembayaran **manual sepenuhnya** — tidak ada auto-verify lewat API blockchain di Fase 1 (sesuai keputusan Anda), cuma kemudahan link otomatis ke explorer yang benar berdasarkan `payment_network` yang tersimpan.

### 6. Sistem referral/ambassador

Alur: seseorang isi `/ambassador/apply` → masuk `ambassador_applications` status `pending` → founder review & approve manual di dashboard → sistem generate `referral_code` unik + kunci `commission_rate` (10% kalau masih di antara 100 approval pertama, 5% setelahnya, dihitung dari `count(*) where status='approved'` saat itu) → baris baru masuk `ambassadors`.

Soal Discord (dari jawaban Anda: ada channel khusus program ini, ambassador diarahkan ke situ setelah daftar) — untuk Fase 1 saya asumsikan **role Discord di-assign MANUAL oleh Anda** setelah approve (bukan bot otomatis), karena bikin Discord bot yang otomatis assign role itu pekerjaan terpisah yang cukup besar sendiri (butuh bot server yang jalan terus-menerus, bukan cuma serverless function). Yang otomatis: begitu approved, sistem kasih **link invite Discord** (statis, Anda buat sekali di server Discord) ke ambassador lewat email/halaman referral mereka. **Koreksi saya kalau maunya harus otomatis dari awal** — bisa, tapi itu scope tambahan di luar Tahap 5 ini.

Notifikasi order baru ke Discord (dari jawaban 3.2) — ini SEDERHANA, cukup Discord Webhook (bukan bot): server action kirim POST ke URL webhook channel admin setiap ada order baru/negosiasi baru. Tidak perlu bot server terpisah.

Dashboard referrer (`/dashboard/referrals`) tampilkan: link referral mereka (siap di-copy), daftar `referrals` mereka + status order masing-masing, total `commissions` status `pending` vs `paid`.

### 7. Halaman founder (`/dashboard/finance`)

Tampilkan (query agregat dari `orders` where `status='paid'` dan `commissions`):
- Total pendapatan: semua waktu, per bulan (grup by bulan), per tahun
- Total komisi harus dibayar (`commissions.status='pending'`) vs sudah dibayar (`status='paid'`)

Akses: route terpisah gated by `role='founder'`, redirect kalau role lain coba buka (tanpa re-auth tambahan, sesuai jawaban Anda).

### 8. Asumsi yang saya pakai — koreksi kalau ada yang salah

1. **Showcase karya di landing page** (jawaban 1.1: karya "yang belum dibuat") — saya asumsikan pakai ULANG aset yang SUDAH ADA dan sudah dipakai di `apps/www` (`gallery/animation-1.mp4` s.d. `animation-6.mp4`, `games/lifetopia-preview.png`), bukan bikin konten baru dari nol. Kalau ada karya lain yang belum pernah ditampilkan di web sama sekali dan mau dipakai di sini, saya perlu file asetnya dulu.
2. **Login punya DUA jalur: modal cepat dari CTA navbar DAN halaman penuh `/login`** (dikoreksi 29 Juli 2026 setelah konfirmasi Anda) — bukan salah satu doang. Register tetap cuma halaman penuh `/register`, tidak ada versi modal untuk register.
3. **Discord role assignment manual** (bukan bot otomatis) — lihat bagian 6 di atas, ini yang paling besar kemungkinan perlu dikoreksi kalau ternyata Anda mau otomatis dari awal.
4. **`messages` table (chat 2 arah) TIDAK dipakai dulu** sesuai jawaban 3.3 — diskusi lewat tiket Discord, bukan di dalam sistem.

### 9. Urutan pengerjaan (sesuai prioritas Anda)

1. Redesign visual (navbar publik, sidebar dengan ikon + active-state, landing page dengan showcase & pricing teaser)
2. Halaman admin kelola pesanan (`/dashboard/admin/orders`, alur negosiasi)
3. Sistem pembayaran kripto Fase 1 (ETH/BSC/Tron) + verifikasi manual
4. Halaman keuangan founder
5. Sistem referral/ambassador (termasuk `/ambassador/apply` + webhook Discord)
6. Invoice/PDF otomatis (`@react-pdf/renderer`)

Tiap nomor di atas akan saya kerjakan sebagai sub-tahap sendiri dengan konfirmasi sebelum lanjut ke nomor berikutnya, karena masing-masing sudah cukup besar sendiri-sendiri.

**Belum dikerjakan apa pun dari rancangan ini** — menunggu persetujuan Anda dulu sebelum saya mulai menulis migration SQL & kode.

---

## Status Tahap 5, sub-tahap 1 — Redesign visual (29 Juli 2026)

Setelah rancangan di atas disetujui (termasuk koreksi soal login: modal cepat dari navbar TETAP disertai halaman `/login` penuh, bukan salah satu doang), sub-tahap 1 (murni visual, tanpa logic negosiasi/pembayaran) sudah ditulis ke device:

- **`packages/ui`** — komponen baru `Modal` (hand-authored, portal ke `document.body`, tutup via klik luar/Escape/tombol X), diekspor dari `src/index.ts`.
- **`apps/studio/app/components/PublicNavbar.tsx`** — navbar publik (logo+wordmark kiri, link Home/Services, tombol Login+Sign up kanan, hamburger menu di mobile). Dipasang di `/`, `/services`, `/login`, `/register`, `/register/check-email`.
- **`apps/studio/app/components/LoginModal.tsx`** — modal login cepat dari navbar, isinya `LoginForm` varian `"modal"` (field & server action sama persis dengan halaman `/login`, cuma tanpa bungkus Card karena Modal sudah punya panel sendiri). Ada link kecil "Use the login page instead" di dalam modal untuk yang mau ke `/login` langsung.
- **`apps/studio/app/login/LoginForm.tsx`** — ditambah prop `variant: "page" | "modal"` supaya satu komponen dipakai baik oleh `/login` maupun modal, tidak ada logic duplikat.
- **`apps/studio/app/components/DashboardNav.tsx`** — daftar nav dashboard dipisah jadi Client Component supaya bisa pakai `usePathname()` untuk highlight item aktif; tiap item sekarang punya ikon (`lucide-react`).
- **`apps/studio/app/dashboard/layout.tsx`** — pakai `DashboardNav`, header sidebar diganti dari teks polos "Nimia Studio" jadi logo+wordmark asli (dua PNG yang sama dengan yang dipakai di email, di-copy ke `apps/studio/public/`).
- **`apps/studio/app/page.tsx`** (landing) — didesain ulang: hero baru, section showcase (3 video dari `apps/www/public/gallery/` + preview Lifetopia, direferensikan via URL absolut ke `www.nimiagames.com`, TIDAK di-duplikat ke repo studio supaya tidak menggandakan file besar), section teaser 3 layanan termurah dari tabel `services` dengan CTA ke `/services`.
- **`apps/studio/app/services/page.tsx`** (baru) — listing semua layanan aktif dari tabel `services` (baca data saja, tidak ada logic baru), tiap card punya tombol "Order this service" yang mengarah ke `/dashboard/orders?service=<id>`.
- **`apps/studio/app/dashboard/orders/page.tsx` + `OrderForm.tsx`** — sedikit ditambah (bukan sub-tahap 2, cuma pelengkap `/services`): baca query param `?service=` dan pre-select layanan itu di form, supaya klik "Order this service" tidak perlu cari lagi manual layanan yang sama.
- **`apps/studio/package.json`** — tambah dependency `lucide-react` (versi `>=0.400.0`, sengaja tanpa `^` karena mayoritas versi lucide-react masih di angka `0.x` — caret di semver `0.x` mengunci ke minor version persis, jadi `>=` lebih aman supaya `npm install` otomatis ambil versi terbaru yang tersedia).

**Belum termasuk di sub-tahap ini** (menyusul di sub-tahap 2): form order per-layanan dengan estimasi harga otomatis dan tombol "Ajukan Negosiasi" di `/services/[slug]`, serta halaman admin `/dashboard/admin/orders`. Untuk sekarang, tombol "Order this service" di `/services` mengarah ke form Order yang sudah ada di `/dashboard/orders` (Tahap 4), bukan alur negosiasi baru.

**Belum dijalankan `npm install` di device** — karena ada dependency baru (`lucide-react`), jalankan `npm install` di root repo dulu sebelum `npm run dev:studio`/`build:studio`.

**Update logo (29 Juli 2026):** atas permintaan user, logo lockup diganti dari "mark + wordmark NIMIA GAMES biasa" jadi custom: mark di kiri, teks 2 baris di kanan ("STUDIO" pakai font Ethnocentric, lebih besar, warna crimson; "NIMIA GAMES" pakai font Conthrax, lebih kecil, warna abu-abu). Font di-convert jadi vector path (bukan di-embed sebagai font hidup) pakai `fontTools`, jadi hasilnya 1 file SVG mandiri (`apps/studio/public/nimia-studio-lockup.svg`) yang tampilannya konsisten di semua browser tanpa perlu font itu ter-install. Dipasang di `PublicNavbar.tsx` dan `dashboard/layout.tsx` (gantiin 2 PNG terpisah yang lama).

Logo yang sama juga dipasang di email (Resend + template Supabase Auth), gantiin logo+wordmark lama, karena user eksplisit minta konsistensi branding di semua tempat:
- `apps/www/public/nimia-studio-lockup-email.png` — versi PNG hasil rasterisasi dari SVG di atas (dengan background transparan, resolusi 3x untuk tetap tajam di layar retina), karena Outlook desktop tidak bisa render `<img src="*.svg">`.
- `packages/email/src/components/EmailLayout.tsx` — header email disederhanakan dari 2 gambar (logo + wordmark terpisah) jadi 1 gambar (`STUDIO_LOCKUP_URL`). Export lama `LOGO_URL`/`WORDMARK_URL` dihapus dari `packages/email/src/index.ts`.
- `packages/email/supabase-templates/confirm-signup.html` — header-nya disamakan juga.

**PENTING, 2 hal yang masih perlu Anda lakukan supaya logo baru ini beneran muncul di email:**
1. **Deploy ulang `apps/www`** (commit + push) — email logo dimuat dari URL absolut `https://www.nimiagames.com/nimia-studio-lockup-email.png`, jadi selama file ini belum live di production, email yang terkirim akan menampilkan gambar rusak/kosong.
2. **Paste ulang isi `confirm-signup.html` yang baru ke Supabase Dashboard** (Authentication > Email Templates > Confirm signup) — sama seperti sebelumnya, Supabase tidak baca file ini otomatis dari repo.

---

## Update Hero & tema publik jadi dark (29 Juli 2026)

User kirim gambar referensi (mockup dibuat via AI, eksplisit cuma referensi gaya bukan aset final) dan minta hero landing page dibikin senada: dark, badge pill, heading besar dengan kata bergradasi, CTA ganda, baris statistik, visual di kanan, baris "trusted by". Juga minta CTA navbar cuma "Log in" (bukan "Sign up" terpisah).

**Keputusan desain kunci:**
- **Seluruh sisi publik jadi dark** (bukan cuma hero): navbar, landing (`/`), `/services`, `/login`, `/register`, `/register/check-email` — supaya konsisten, tidak ada navbar dark nempel di atas halaman terang. Dashboard (`/dashboard/*`) TETAP terang, tidak diubah (tetap tools kerja harian, bukan halaman marketing).
- Dark theme diimplementasikan sebagai class `.nimia-dark` (di `apps/studio/app/globals.css`) yang meng-override variable CSS yang SAMA yang sudah dipakai `packages/ui` (Button, Card, dll) — jadi semua komponen shared otomatis re-theme tanpa perlu ditulis ulang. Nilai variabelnya persis sama dengan `apps/www/app/globals.css`.
- Font `Sora` + `Rajdhani` (sama seperti `apps/www`) ditambahkan ke `apps/studio/app/layout.tsx`, tapi HANYA dipakai di halaman publik (lewat class `.nimia-dark`/`.nimia-font-display`) — dashboard tetap pakai font sistem seperti sebelumnya.
- `Modal` (dipakai untuk login cepat dari navbar) di-render lewat React portal ke `document.body`, di LUAR pohon DOM `.nimia-dark` — jadi `LoginModal.tsx` sengaja kasih `className="nimia-dark"` langsung ke `Modal` supaya modalnya tetap dark walau posisinya di luar wrapper (kalau tidak, modal akan tetap terang, keluar dari tema).
- Warna teks link/aksen di atas background gelap diganti dari `--nimia-crimson` (#c1124d, kontras cuma ~3.3:1 di atas dark, di bawah standar AA 4.5:1 untuk teks normal) ke `--nimia-pink` (#ff4d8d, kontras ~6.5:1) supaya tetap gampang dibaca. Warna solid tombol utama (background crimson) tidak berubah.

**Hero baru (`apps/studio/app/page.tsx`):**
- Badge pill "Game Development • Animation • Digital Assets" (dari deskripsi bisnis yang sudah dipakai di `apps/www`, bukan karangan baru).
- Heading "Bring Your **Game** to Life" dengan kata "Game" pakai gradient crimson→pink.
- Baris statistik (100+ Projects, 50+ Clients, 5+ Years, 24/7 Support) — **INI PLACEHOLDER**, angka dari gambar referensi, BUKAN data asli Nimia Games (dikonfirmasi ke user, mereka minta pakai persis dulu). Ganti kapan pun sudah ada angka sebenarnya.
- Baris "Trusted by innovative studios & brands" — **INI JUGA PLACEHOLDER**, isinya cuma kotak generik bertuliskan "Partner" (BUKAN logo asli Unity/Unreal Engine/Solana/Steam/AWS seperti di gambar referensi) karena logo asli itu menyiratkan partnership yang belum tentu benar. Tunggu instruksi user logo yang benar apa saja sebelum diisi.
- Visual di kanan hero: BUKAN foto karakter seperti referensi (user eksplisit bilang itu cuma referensi gaya), tapi mark Nimia sendiri (`apps/studio/public/nimia-mark-hero.png`, hasil crop resolusi tinggi dari `apps/www/public/logo.png`) dengan animasi CSS (mengambang + tilt 3D + glow). **Ini pendekatan CSS murni, BUKAN render 3D/WebGL sungguhan** — user sempat minta "kalau bisa versi 3D", tapi itu butuh sumber vector mark (belum ada, cuma raster) + dependency Three.js baru, jadi untuk sekarang dipakai pendekatan CSS yang lebih ringan dulu. Bisa diupgrade ke WebGL beneran nanti kalau user mau, sebagai pekerjaan terpisah.
- Tombol "Watch Showreel" dari referensi SENGAJA tidak dibuat — belum ada video showreel asli, daripada bikin tombol yang menjanjikan video yang tidak ada.
- Section "Recent Work" (video showcase yang sudah ada dari sebelumnya) diberi `id="work"` supaya CTA "View Our Work" dan link navbar "Work" bisa scroll ke situ.

**Navbar (`PublicNavbar.tsx`):** CTA sekarang cuma "Log in" (buka modal) + "Start a Project" (ke `/services`) — tombol "Sign up" terpisah dihapus sesuai instruksi user (masih bisa diakses lewat link di dalam modal login atau alur order). Link nav ditambah "Work" (scroll ke `#work`); "Process" dan "About" dari gambar referensi SENGAJA tidak ditambah karena belum ada halaman/section untuk itu — tanya kalau mau dibikin.

---

## Update Hero — kompaksi, copy digital-asset-first, font, CTA (29 Juli 2026)

Setelah user coba jalankan hasil update sebelumnya di device sendiri, masuk feedback koreksi (bukan bug, semua ini penyesuaian desain):

1. **Landing dibuat lebih padat vertikal** supaya section Hero + Trust ("footer" sesuai istilah user) muat dalam 1 layar tanpa scroll di ukuran desktop biasa. Padding hero (`py-20`/`lg:py-28` → `pt-8 pb-10`/`lg:pt-10 lg:pb-14`), jarak antar elemen di dalam hero (`mt-6`/`mt-8`/`mt-12` → `mt-4`/`mt-6`/`mt-8`), ukuran heading (`text-5xl sm:text-6xl` → `text-4xl sm:text-5xl lg:text-6xl`), dan padding section Trust (`py-10` → `py-6`) semua dikecilkan. Diverifikasi lewat mockup statis (HTML+CSS manual, karena Tailwind CDN diblokir jaringan sandbox jadi tidak bisa dites lewat CDN) yang di-screenshot pakai Playwright di 1440×900 dan 1280×720 — hero+trust muat penuh di kedua ukuran itu. **Catatan jujur:** ini best-effort, bukan jaminan matematis untuk SEMUA ukuran layar/zoom browser (monitor sangat pendek atau zoom besar tetap bisa butuh scroll dikit) — kalau nanti masih terasa kurang padat di monitor Anda, kasih tahu ukuran layarnya biar saya sesuaikan lagi.
2. **Badge & heading tidak lagi "kosong" di atas** — padding atas section hero yang dikecilkan (poin 1) otomatis menghilangkan jarak kosong berlebih di atas badge pill.
3. **CTA sekarang jelas keliatan seperti tombol.** Akar masalahnya: variant "outline" di `packages/ui/Button` pakai `border-[var(--nimia-border)]` yang di tema dark cuma 9% opacity putih di atas background nyaris hitam — nyaris tidak keliatan. Diperbaiki dengan override border lebih terang (`border-[var(--foreground)]/30`, makin terang lagi saat hover ke `/70`) langsung di titik pemakaian ("Log in" di navbar, "View Our Work" di hero) — bukan ubah token global `--nimia-border`, supaya card/divider lain yang masih pakai border tipis itu (memang dimaksudkan tipis) tidak ikut berubah.
4. **Ikon panah (ArrowRight) dihapus dari semua CTA** ("Start a Project" di navbar & hero) sesuai instruksi user. Ikon Play di "View Our Work" DIPERTAHANKAN (bukan panah, dan relevan sebagai isyarat "tonton karya kami").
5. **Copy hero diarahkan ke "digital asset studio" lebih dulu, bukan "game studio"** — badge pill diurutkan ulang jadi "Digital Assets • Animation • Game Development" (dari sebelumnya Game Development duluan), heading diganti dari "Bring Your **Game** to Life" jadi "**Digital Assets** That Bring Ideas to Life" (gradient sekarang di "Digital Assets"), dan paragraf deskripsi diurutkan ulang jadi digital assets → animation → game development.
6. **Font heading diganti dari Rajdhani ke Plus Jakarta Sans** (`apps/studio/app/layout.tsx`, `.nimia-font-display` di `globals.css`) — Rajdhani (kondensed, cenderung all-caps) dirasa terlalu "kaku"/techy, Plus Jakarta Sans dipilih karena tetap tegas untuk heading tapi lebih hangat dan gampang dibaca, senada dengan Sora yang sudah dipakai di body. Rajdhani sudah tidak dipakai sama sekali lagi di `apps/studio` (dicek: cuma dipakai lewat class `.nimia-font-display`, satu titik ganti).

File yang berubah: `apps/studio/app/layout.tsx`, `apps/studio/app/globals.css`, `apps/studio/app/page.tsx`, `apps/studio/app/components/PublicNavbar.tsx`.

Statistik (100+/50+/5+/24-7) dan placeholder "Trusted by" TETAP belum diganti data asli — masih menunggu instruksi user, tidak disentuh di update ini.

---

## Update Hero — hapus Recent Work/Services dari home, navbar hover crimson, stats dikecilkan lagi (29 Juli 2026)

Feedback lanjutan setelah user coba lagi di device (semua penyesuaian desain, bukan bug):

1. **Section "Recent Work" dan teaser "Services" DIHAPUS dari `apps/studio/app/page.tsx`** — user bilang kontennya akan dipindah ke halaman terpisah yang bisa diakses dari navbar (halaman itu SENDIRI BELUM DIBANGUN, ini di luar scope update ini). Efek samping yang saya perbaiki sekalian:
   - Query Supabase `services` di `page.tsx` dihapus (tidak dipakai lagi), begitu juga import `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`formatServicePrice` dan konstanta `SHOWCASE_VIDEOS` yang jadi mati kalau tidak ikut dihapus.
   - Link nav "Work" di `PublicNavbar.tsx` (yang tadinya scroll ke `id="work"` di section Recent Work) **DIHAPUS SEMENTARA** dari `NAV_LINKS` — section tujuannya sudah tidak ada, jadi kalau link ini dibiarkan akan jadi mati. Tambahkan lagi begitu halaman work/portfolio yang baru sudah dibangun, arahkan ke situ.
   - Tombol "View Our Work" di hero (sebelumnya `href="#work"`) untuk sementara diarahkan ke `/services` supaya tidak jadi link mati — **INI SEMENTARA**, kasih tahu saya rute halaman work/portfolio yang benar begitu sudah direncanakan, nanti saya arahkan ulang.
   - `/services` sendiri TIDAK terpengaruh — halaman itu sudah ada penuh dari sub-tahap 1 (`app/services/page.tsx`), cuma teaser 3-kartu di home yang dihapus, bukan halamannya.
2. **Warna teks navbar diganti dari `--nimia-pink` ke `--nimia-crimson`** untuk state aktif & hover (default/non-hover tetap putih, tidak berubah) — permintaan eksplisit user ("navbar warna teksnya harusnya putih, pas di hover warnanya jadi merah Nimia"). Berlaku di kedua tempat: nav desktop dan menu mobile di `PublicNavbar.tsx`. **Catatan kecil:** `--nimia-crimson` di atas background gelap kontrasnya ~3.35:1 (di bawah standar AA 4.5:1 untuk teks statis, itu sebabnya link/teks LAIN di halaman ini sengaja pakai pink, lihat update sebelumnya) — tapi untuk state hover yang sifatnya sementara/interaktif ini longgar diikuti sesuai permintaan eksplisit Anda; kalau nanti dirasa kurang kebaca saat hover, kasih tahu.
3. **Baris statistik dikecilkan lagi** (dari update sebelumnya yang sudah dikecilkan sekali) supaya "Trusted by" naik lebih tinggi: lingkaran ikon `h-7 w-7` (dari `h-9 w-9`), angka `text-lg` (dari `text-2xl`), label `text-xs` (dari `text-sm`), jarak antar baris `mt-5`/`gap-3` (dari `mt-8`/`gap-4`). Padding bawah hero juga dikecilkan sedikit lagi (`pb-8`/`lg:pb-10`, dari `pb-10`/`lg:pb-14`) karena kontennya sudah lebih pendek.
4. **Tombol CTA hero ("Start a Project" & "View Our Work")** sudah cocok dengan screenshot mockup yang saya kirim sebelumnya (Desktop 1440×900) — kodenya sebenarnya sudah menghasilkan tampilan yang sama sejak update sebelumnya (solid crimson tanpa ikon panah untuk "Start a Project", outline dengan border lebih terang + ikon Play untuk "View Our Work"); perubahan di titik 3 di atas (stats mengecil) otomatis membuat kedua tombol ini terlihat lebih menonjol karena ruang di sekitarnya lebih lega.

Diverifikasi ulang lewat mockup statis yang sama (Playwright, 1440×900 & 1280×720) — hero+trust makin ringkas, "Trusted by" naik jelas lebih tinggi dibanding versi sebelumnya.

File yang berubah: `apps/studio/app/page.tsx`, `apps/studio/app/components/PublicNavbar.tsx`.

---

## BUG PENTING ditemukan & diperbaiki: tombol "primary" tidak ter-style di production (29 Juli 2026)

User kirim screenshot `nimiastudio.com` yang SUDAH di-push ke production, dibandingkan dengan mockup yang saya kirim. Perbedaannya jelas: tombol **"Start a Project"** (baik di navbar maupun hero) tampil sebagai TEKS POLOS berwarna crimson, TANPA kotak/background/padding sama sekali — bukan cuma beda gaya dikit, tombolnya beneran tidak ke-style. Tombol **"Log in"** dan **"View Our Work"** (variant outline) terlihat OK karena kebetulan semua class yang membuatnya terlihat seperti tombol (border, warna border, warna hover) ditulis LANGSUNG di `page.tsx`/`PublicNavbar.tsx`, bukan diwariskan dari `packages/ui/src/components/Button.tsx`.

**Akar masalah:** `apps/studio` pakai Tailwind v4 (`@import "tailwindcss";` di `globals.css`, tanpa `tailwind.config.js` — v4 memang begitu). Tailwind v4 punya "automatic content detection" yang **otomatis MENGECUALIKAN apa pun di dalam `node_modules`**. Karena `@nimia/ui` adalah workspace package yang di-resolve npm sebagai symlink di `node_modules/@nimia/ui` → `../../packages/ui`, kemungkinan besar Tailwind tidak pernah benar-benar men-scan file asli di `packages/ui/src/components/Button.tsx` — artinya SEMUA class yang HANYA ada di dalam file itu (termasuk seluruh isi `variant.primary`: `bg-[var(--nimia-crimson)] text-white shadow-sm hover:bg-[var(--nimia-crimson-hover)]`, dan base classes `inline-flex h-11 px-6` dst.) tidak pernah masuk ke CSS yang di-compile, jadi tidak render sama sekali di production. Variant `outline` KEBETULAN "selamat" secara visual karena border/warnanya sudah saya duplikasi manual langsung di file pemanggil pada update-update sebelumnya (bukan karena Button.tsx-nya benar-benar ke-scan).

**PENTING — ini kemungkinan bukan cuma soal hero.** Kalau dugaan ini benar, SEMUA tombol `variant="primary"` (default) di SELURUH `apps/studio` — termasuk tombol submit di form login/register/order dashboard yang sudah lama ada dari Tahap 4 — kemungkinan JUGA sudah lama tidak ter-style dengan benar di production, cuma belum ketahuan/dilaporkan. Setelah fix di bawah ini dipasang, tolong cek juga tombol-tombol di dashboard (submit form order, dst) — kalau tampilannya berubah/membaik, itu tandanya dugaan ini benar dan sebelumnya memang sudah lama begini.

**Perbaikan (2 lapis):**
1. **Fix akar masalah** — tambah `@source "../../../packages/ui/src";` tepat setelah `@import "tailwindcss";` di `apps/studio/app/globals.css`, supaya Tailwind eksplisit disuruh men-scan folder itu meskipun diakses lewat symlink `node_modules`. Ini seharusnya memperbaiki SEMUA komponen `packages/ui` sekaligus, bukan cuma tombol.
2. **Safety net tambahan** (jaga-jaga kalau fix #1 belum cukup, atau untuk hasil yang jelas terlihat cepat) — di titik-titik tombol primary yang dipakai lewat `<Link>` (bukan `<Button>`, karena Link tidak lewat komponen `Button.tsx` sama sekali jadi tidak dapat manfaat dari fix manapun di `Button.tsx` itu sendiri kalau ada masalah lain), saya tambahkan literal class `bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]` LANGSUNG di file pemanggil (yang sudah terbukti ke-scan Tailwind dengan benar): "Start a Project" (hero, navbar desktop, navbar mobile), "Go to dashboard" (navbar desktop, navbar mobile — belum pernah terlihat karena `isAuthenticated` masih hardcode `false`, tapi diperbaiki sekalian), "Order this service" (`app/services/page.tsx`).

File yang berubah: `apps/studio/app/globals.css`, `apps/studio/app/page.tsx`, `apps/studio/app/components/PublicNavbar.tsx`, `apps/studio/app/services/page.tsx`.

**Belum bisa saya verifikasi langsung** — sandbox saya tidak punya akses jaringan buat install Tailwind CLI/jalankan build asli, dan `page.tsx` butuh koneksi Supabase asli buat jalan penuh, jadi saya tidak bisa compile CSS beneran dan screenshot hasilnya sendiri. **Mohon push perubahan ini dan cek langsung di production** — kalau tombol "Start a Project" masih belum solid crimson dengan teks putih setelah ini, kirim screenshot lagi, kemungkinan ada lapisan masalah lain yang perlu digali.

### Lanjutan bug ini — root cause SEBENARNYA ditemukan (29 Juli 2026, sama hari)

Setelah fix di atas dipasang, user push & cek lagi: background "Start a Project" SUDAH solid crimson (fix #2/safety-net di atas berhasil), tapi **teksnya sama sekali tidak kelihatan** (kosong), dan teks "View Our Work" tampil crimson padahal harusnya putih. Ini mengarah ke masalah LAIN yang lebih mendasar, ketemu setelah re-baca ulang `globals.css` baris demi baris:

```css
a {
  color: var(--nimia-crimson);
}
```

Baris ini ada di paling bawah `globals.css`, ditulis polos TANPA dibungkus `@layer` apa pun. **Tailwind v4 membungkus SEMUA utility class-nya sendiri di dalam named layer (`@layer theme, base, components, utilities;`)** — dan menurut spesifikasi CSS Cascade Layers, **rule yang TIDAK ada di dalam layer manapun SELALU menang melawan rule yang ada di dalam layer, terlepas dari specificity atau urutan penulisan**. Karena `a { color: ... }` ini ditulis polos (unlayered), rule ini SELALU mengalahkan class Tailwind apa pun yang mengatur warna teks pada elemen `<a>`/`<Link>` — termasuk `text-white` di tombol "Start a Project" (makanya teksnya jadi warna crimson-di-atas-crimson, alias tidak kelihatan sama sekali) dan `text-[var(--foreground)]` di tombol "View Our Work" (makanya tampil crimson, bukan putih). Class-nya SUDAH benar dan SUDAH ter-compile — cuma kalah prioritas di level CSS cascade layer.

**Fix:** bungkus rule itu dengan `@layer base { a { color: var(--nimia-crimson); } }` di `globals.css`, supaya rule ini ikut sistem layer Tailwind dan bisa dikalahkan dengan benar oleh utility class manapun yang eksplisit di elemen tersebut (persis seperti perilaku normal yang diharapkan). Ini juga otomatis memperbaiki warna teks link LAIN di seluruh halaman publik yang mungkin diam-diam kena masalah sama (link "Sign up"/"log in here" di form, dll — semuanya pakai `<Link>`/`<a>`).

**Pelajaran untuk ke depan:** kalau menambah CSS custom polos (bukan lewat class Tailwind) di file manapun yang di-`@import "tailwindcss"`, SELALU bungkus dengan `@layer base { ... }` (untuk reset/default seperti elemen `a`, `h1`, dst) supaya tidak diam-diam mengalahkan utility class Tailwind di elemen yang sama. Berlaku juga untuk `apps/www/app/globals.css` kalau ada pola serupa di sana — belum saya cek, tapi worth di-audit kalau ada masalah warna teks link yang aneh di situ juga.

File yang berubah (putaran ini): `apps/studio/app/globals.css`.

**KONFIRMASI USER (29 Juli 2026): fix ini benar dan sudah beres** — setelah push, user konfirmasi "memang itu ternyata masalahnya". Tombol "Start a Project" & "View Our Work" sudah tampil sesuai desain (solid crimson + teks putih / outline + teks putih). Status bug: **SELESAI**.

---

## Update font: samakan studio dengan www — balik ke Rajdhani (29 Juli 2026)

User bandingkan langsung font `studio` vs `www` dan lebih suka gaya `www`. Dicek `apps/www/app/layout.tsx` + `globals.css`: `www` pakai **Sora** (body) + **Rajdhani** (heading, lewat class `.font-display`) — persis kombinasi yang tadinya dipakai `studio` SEBELUM diganti ke Plus Jakarta Sans di update sebelumnya (yang waktu itu dilakukan atas dasar feedback "Rajdhani kesan-nya kaku").

**Dibalik hari ini juga:** `apps/studio/app/layout.tsx` (import `Rajdhani` lagi, ganti `Plus_Jakarta_Sans`) dan `apps/studio/app/globals.css` (`.nimia-font-display` kembali ke `var(--font-rajdhani), var(--font-sora), Arial, sans-serif`) — sekarang identik dengan konfigurasi `www` (font sama, weight sama, nama variable sama). Plus Jakarta Sans sudah tidak dipakai sama sekali lagi di `apps/studio`.

File yang berubah: `apps/studio/app/layout.tsx`, `apps/studio/app/globals.css`.

---

## Update navbar: dari 2 item ke 5 (Home, Why Nimia, Services, Portfolio, Contact) + halaman Contact fungsional via Resend (29 Juli 2026)

User minta navbar publik `nimiastudio.com` dilengkapi dari 2 item (Home, Services) jadi 5: **Home, Why Nimia, Services, Portfolio, Contact**. Karena 3 dari 5 item ini butuh halaman baru yang belum pernah dibahas isinya, saya tanya dulu lewat 4 pertanyaan (menghindari kebiasaan lama proyek ini: jangan bikin konten bisnis/scope halaman baru tanpa konfirmasi) — jawaban user:

1. **"Why Nimia" formatnya** → halaman sendiri (`/why-nimia`), bukan anchor section di landing page.
2. **Isi "Why Nimia"** → user akan kasih poin-poinnya sendiri (BELUM dikirim saat update ini dibuat — lihat "Masih menunggu dari user" di bawah).
3. **Halaman Contact isinya** → form kontak yang benar-benar mengirim email lewat Resend (bukan cuma info kontak statis).
4. **Halaman Portfolio isinya** → tunggu karya baru dari user; **eksplisit TIDAK boleh** pakai ulang konten Recent Work (video showcase + preview Lifetopia) yang sudah dihapus dari home page di update sebelumnya.

### Yang dibangun

1. **`apps/studio/app/components/PublicNavbar.tsx`** — `NAV_LINKS` diperluas jadi 5 item: Home (`/`), Why Nimia (`/why-nimia`), Services (`/services`), Portfolio (`/portfolio`), Contact (`/contact`). Semua link ini sekarang hidup/valid (tidak ada link mati).

2. **`/contact` — halaman kontak fungsional, pertama kali Resend BENERAN dipakai kirim email di codebase ini** (sebelumnya `OrderReceivedEmail`/`ConfirmSignupEmail` cuma template, belum pernah ada `resend.emails.send()` di mana pun):
   - `packages/validators/src/contact.ts` — schema Zod baru `contactFormSchema` (name/email/message), diekspor lewat `packages/validators/src/index.ts`. Pola sama persis dengan `order.ts`/`auth.ts`.
   - `packages/email/src/templates/ContactMessageEmail.tsx` — template email baru, dikirim KE inbox studio (`contact@nimiagames.com`) tiap ada pesan masuk dari form, bukan ke pengunjung. Diekspor lewat `packages/email/src/index.ts`.
   - `apps/studio/app/contact/actions.ts` — server action `sendContactMessageAction`, validasi ulang pakai `contactFormSchema` di server (jangan percaya validasi client saja), lalu `resend.emails.send({ from: RESEND_FROM_EMAIL, to: "contact@nimiagames.com", replyTo: <email pengirim>, react: ContactMessageEmail(...) })`. `RESEND_API_KEY`/`RESEND_FROM_EMAIL` sudah ada di `.env.example` dari setup sebelumnya, sekarang baru benar-benar dipakai. Kalau env var belum diisi, action mengembalikan error yang jelas alih-alih crash.
   - `apps/studio/app/contact/ContactForm.tsx` — client form, pola sama dengan `OrderForm.tsx` (react-hook-form + zodResolver, panggil server action langsung, bukan lewat `<form action>`).
   - `apps/studio/app/contact/page.tsx` — page shell, pola sama dengan `services/page.tsx`.
   - **Dependency baru ditambahkan**: `resend` (`^4.0.0`) dan `@nimia/email` di `apps/studio/package.json` — **tolong jalankan `npm install` di root repo setelah menarik perubahan ini**, supaya `node_modules`/`package-lock.json` ke-update. Saya tidak bisa `npm install` versi pasti dari sandbox ini (akses registry diblokir di sini), jadi cek juga versi `resend` terbaru saat install — kalau ada versi lebih baru dari `^4.0.0`, boleh disesuaikan.
   - **Belum bisa saya verifikasi langsung** (sandbox tidak ada akses Resend API asli/tidak bisa jalankan build Next.js beneran) — tolong test kirim pesan dari `/contact` setelah di-push, dan konfirmasi email masuk ke `contact@nimiagames.com` dengan benar (termasuk Reply-To ke alamat pengirim).

3. **`/why-nimia` dan `/portfolio` — halaman placeholder jujur ("coming soon"), BUKAN konten fiktif**:
   - `apps/studio/app/why-nimia/page.tsx` — copy netral yang bilang halaman ini sedang ditulis, tanpa klaim/alasan yang dikarang. Menunggu poin-poin dari user.
   - `apps/studio/app/portfolio/page.tsx` — copy netral yang bilang karya baru sedang disiapkan. **Sengaja TIDAK** memakai ulang video/gambar Recent Work yang sudah dihapus, sesuai pilihan eksplisit user.
   - Keduanya punya CTA "Get in touch in the meantime" yang mengarah ke `/contact`.

4. **`apps/studio/app/page.tsx`** — tombol hero "View Our Work" yang sebelumnya SEMENTARA mengarah ke `/services` (karena belum ada halaman work/portfolio) sekarang diarahkan ke `/portfolio` yang baru dibangun. Komentar-komentar terkait di file ini diperbarui supaya tidak lagi menyebut halaman ini "belum dibangun".

### Masih menunggu dari user

- **Poin-poin "Why Nimia"** — belum dikirim. Kirim 3-5 poin (atau lebih) tentang apa yang bikin Nimia Games layak dipilih, nanti langsung saya tulis jadi halaman aslinya.
- **Karya untuk "Portfolio"** — belum dikirim. Kirim kapan pun sudah siap (gambar/video/link), saya bangun galeri/showcase-nya.
- **Verifikasi Resend** — tolong test form `/contact` di production setelah `npm install` + push, pastikan email benar-benar sampai.

File yang berubah/ditambah: `apps/studio/app/components/PublicNavbar.tsx`, `apps/studio/app/page.tsx`, `apps/studio/app/contact/{page.tsx,ContactForm.tsx,actions.ts}` (baru), `apps/studio/app/why-nimia/page.tsx` (baru), `apps/studio/app/portfolio/page.tsx` (baru), `apps/studio/package.json`, `packages/validators/src/{contact.ts,index.ts}`, `packages/email/src/{index.ts,templates/ContactMessageEmail.tsx}` (template baru).
