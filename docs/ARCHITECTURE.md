# Nimia Games — Arsitektur Platform (Tahap 1: Perencanaan)

Status: **DRAFT — menunggu persetujuan** sebelum lanjut ke Tahap 2 (struktur folder).

Dokumen ini merancang transisi dari `nimia-games` (saat ini: 1 Next.js app untuk landing page, sudah live di www.nimiagames.com) menjadi platform studio digital dengan 3 subdomain terintegrasi: `www`, `portfolio`, dan `studio`. Sesuai keputusan yang disepakati: **monorepo Turborepo**, prioritas pembangunan **studio.nimiagames.com** duluan, dan backend services (Supabase/Cloudinary/Resend) **belum dibuat** — jadi Tahap 1–2 akan menyiapkan struktur & kode yang siap pakai begitu akun/API key tersedia.

---

## 1. Struktur Monorepo

```
nimia-games/                     (root monorepo)
├── apps/
│   ├── www/                     # nimiagames.com — hasil migrasi repo saat ini
│   ├── portfolio/                # portfolio.nimiagames.com — dibangun setelah studio
│   └── studio/                   # studio.nimiagames.com — PRIORITAS SEKARANG
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
Setiap `apps/*` jadi **project Vercel terpisah** yang menunjuk ke repo Git yang sama, dengan "Root Directory" di-set ke `apps/www`, `apps/portfolio`, `apps/studio`. Masing-masing project di-assign domain: `nimiagames.com` (+ `www`), `portfolio.nimiagames.com`, `studio.nimiagames.com`. Ini artinya deploy salah satu subdomain tidak memicu re-deploy yang lain (Turborepo `--filter` membatasi build scope), dan tiap app bisa scale/rollback independen — penting karena `studio` (auth, dashboard, PDF) punya karakteristik beban & risiko berbeda dari `www` (statis, marketing).

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

**Keamanan (Row Level Security):** setiap tabel milik client (`orders`, `projects`, `invoices`, `messages`, `project_files`, `payments`, `receipts`) akan punya policy: client hanya bisa `SELECT` baris miliknya sendiri (`client_id` cocok dengan `auth.uid()` via tabel `clients`), admin (role check) punya akses penuh. Ini krusial karena route `studio.nimiagames.com/client/[client_id]` akan diakses langsung oleh client — keamanan harus di level database, bukan cuma di UI.

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

**Menunggu persetujuan Anda untuk lanjut ke Tahap 2 (struktur folder monorepo).** Kalau ada bagian dari rencana di atas yang mau diubah (misalnya urutan tahap, pilihan library PDF, atau struktur tabel), sebutkan saja sebelum saya lanjut.
