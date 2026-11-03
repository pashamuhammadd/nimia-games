# Log progres

## 3 Nov 2026 — Tahap 0: audit dan rencana

**Dikerjakan**
- Membaca seluruh paket `nimia-studio-claude-kit` (00–07, MANIFEST, briefing asli, dua PNG di `assets`). Hash SHA-256 kedua PNG cocok dengan MANIFEST. Salinan PNG disimpan di `reference/`.
- Memeriksa status git lewat salinan `.git` lokal + clone GitHub (detail metode dan batasnya di `02-AUDIT-KODE.md` §0).
- Audit stack, routes, packages, skema order/penawaran/cicilan/receipt/pembayaran, Telegram, homepage studio.
- Menulis `README.md`, `01-KEPUTUSAN.md`, `02-AUDIT-KODE.md`, `03-RENCANA-IMPLEMENTASI.md`, file ini.

**Pengujian yang benar-benar dijalankan (container Linux, Node 22)**
- `npm ci`: lulus.
- `turbo run test`: 149 test lulus (validators 20, studio 19, admin 34, app 76); miniapp & portfolio exit 1 karena tidak ada file test (baseline).
- `tsc --noEmit` keenam app: 0 error.
- `next build` studio & www: gagal karena sandbox tidak bisa mengakses Google Fonts (batas lingkungan).

**Tidak dilakukan**
- Tidak ada perubahan kode aplikasi, migration, env, konfigurasi production, commit, atau deploy.
- Tidak membuka file `.env*`.

**Langkah berikutnya**
- Review dokumen, jawab pertanyaan C1 di `01-KEPUTUSAN.md`, lalu jalankan Tahap 1 dengan `07-PROMPT-IMPLEMENTASI.txt`.

---

## 3 Nov 2026 — Tahap 1: Orchid Pulse, Motion Frame, homepage (siap review)

**Keputusan C1:** Pasha memilih push manual. File ditulis langsung ke working tree; Pasha membuat branch `redesign/studio-phase-1`, commit, dan push sendiri dengan perintah yang diberikan di chat.

**File diubah**
- `apps/studio/app/page.tsx` — homepage baru (menggantikan Creative Agent hero + ToolsSection).
- `apps/studio/app/globals.css` — scope baru `.studio-orchid` (token Orchid Pulse + jembatan variabel lama), kelas komponen di `@layer components`, animasi frame dengan `prefers-reduced-motion`. Scope `.nimia-dark` tidak diubah.
- `apps/studio/app/sitemap.ts` — `/creative-agent` dikeluarkan dari sitemap (halaman sudah `noindex`, tetap bisa dibuka).

**File baru**
- `apps/studio/public/brand/motion-frame-lockup.reconstruction.svg`, `motion-frame-mark.reconstruction.svg` — **rekonstruksi** hasil trace PNG konsep (potrace + smoothing), warna di-snap ke token. Bukan master asli; komentar di dalam SVG menyatakan ini. Perbandingan: `screenshots/tahap1-logo-reconstruction.png`.
- `apps/studio/app/components/brand/MotionFrameLogo.tsx` — ukuran berbasis tinggi, rasio terkunci.
- `apps/studio/app/components/home/`: `HomeNavbar`, `HomeHero`, `SelectedWorkSection`, `ServicesSection`, `HowItWorksSection`, `FinalCtaSection`, `HomeFooter`, `selected-work.ts` (query tabel `portfolio`), `links.ts`, `contrast.ts`, `home.test.ts`.
- `apps/studio/lib/cloudinary-url.ts` — salinan kecil builder thumbnail dari apps/portfolio.

**Yang dibangun**
- Nav: logo, Work, Services, How it works, Client login (menjadi "Dashboard" bila sudah login), Start a project. Menu mobile dengan `aria-expanded`/`aria-controls`, Escape menutup dan mengembalikan fokus.
- Hero: copy preview; komposisi Motion Frame (dua potongan L pink/violet sebagai SVG stroke) yang bertemu sekali saat load. Jendela frame menampilkan still karya portfolio nyata pertama; bila tidak ada, bidang gradien abstrak. Karakter preview tidak dipakai.
- Selected work: maksimal 3 karya `published` (featured dulu, lalu `sort_order`), link ke `portfolio.nimiastudio.com/?work=<slug>`. Empty state dan error state nyata; tidak ada ilustrasi placeholder.
- Services: hanya Animation dan Development; sudut kartu memakai potongan logo (pink/violet), bukan nomor dekoratif.
- How it works: 4 langkah yang **sudah benar hari ini** (brief + budget, quote + counter-offer di dashboard, bayar crypto penuh/cicilan dengan receipt, pantau dan unduh hasil). Telegram dan invoice otomatis belum diklaim.
- CTA akhir: Start a project; "Chat on Telegram" hanya muncul bila `NEXT_PUBLIC_STUDIO_TELEGRAM_URL` berisi URL `https://t.me/...`. Saat ini tidak diset → tidak tampil.
- Footer: logo + link ke halaman studio lama (Full portfolio, Services and packages, How to start, Why Nimia) + Footer existing (Partner Program, legal ke nimiagames.com, copyright lama — tidak diubah karena identitas legal belum diputuskan).
- Semua CTA "Start a project" memakai `StartProjectButton` existing → `app.nimiastudio.com/order` (login) atau `/login?redirectedFrom=/order`.

**Pengujian yang benar-benar dijalankan (container)**
- `vitest` studio: 40/40 lulus (21 test baru: kontras token WCAG, validasi URL Telegram, mapper portfolio, kondisi env kosong). `turbo run test`: admin 34, app 76, validators 20 tetap lulus; miniapp/portfolio tetap "No test files" (baseline).
- `tsc --noEmit` studio dan www: 0 error.
- Kontras: teks utama 18.2:1, muted 10.1:1, pink di bg 6.1:1, violet di bg 5.6:1, label gelap di tombol pink 6.1:1, error coral 9.4:1, success 12.3:1. Teks putih di pink 3.0:1 → tidak dipakai.
- Preview `next dev` + Playwright di 320, 375, 768, 1280, 1440 px: tidak ada scroll horizontal; semua target interaktif ≥ 44 px; urutan Tab benar dengan focus ring 3 px; menu mobile buka/tutup/Escape; mode reduced motion dirender tanpa animasi.
- Semua href homepage diverifikasi: anchor `#work/#services/#how-it-works/#main`, `/services`, `/how-to-start`, `/why-nimia`, `/partners`, app login/order, portfolio, legal nimiagames.com.
- `git diff`: hanya `apps/studio/**` dan `docs/nimia-studio-redesign/**`. `apps/www`, `apps/app`, `apps/admin`, packages, dan migration tidak tersentuh.

**Batas verifikasi**
- Data portfolio di screenshot adalah **dummy** dari stub lokal (Supabase/Cloudinary produksi tidak bisa diakses dari container); gambar "DUMMY IMAGE" bukan karya nyata. Tampilan dengan data asli perlu dicek di `npm run dev:studio` dengan `.env.local` Anda atau Vercel preview.
- `next build` tetap tidak bisa dijalankan di container (Google Fonts diblokir); screenshot memakai Sora dari paket npm @fontsource yang disuntikkan hanya untuk preview. Build harus diverifikasi di mesin Anda/Vercel preview.
- Studio tidak punya konfigurasi ESLint (baseline), jadi lint tidak dijalankan.
- Belum dites di Safari/iOS nyata.

**Masalah tersisa / catatan**
- `app/components/home/ToolsSection.tsx` tidak dipakai lagi tetapi belum dihapus (tunggu konfirmasi).
- Sitemap masih memuat `/order` yang di-redirect 308 ke app (masalah lama, belum diubah).
- Halaman studio lain masih memakai tema crimson + `PublicNavbar` lama (Tahap 5). Favicon/OG image belum diganti.
- Env baru opsional: `NEXT_PUBLIC_STUDIO_TELEGRAM_URL` (set di Vercel setelah username layanan diputuskan). `CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` sudah dipakai studio sebelumnya.

**Rollback:** murni tampilan di `apps/studio`; revert commit atau redeploy deployment Vercel sebelumnya.

**Langkah berikutnya:** review di Vercel preview dengan data asli → putuskan C2 (Telegram, legal, portfolio) → Tahap 2 (intake order).

Screenshot: `screenshots/` (desktop 1440 & mobile 375/320 dengan data dummy, desktop 1280 saat portfolio tidak tersedia + reduced motion, logo rekonstruksi).

---

## 3 Nov 2026 — Tahap 2: intake order (siap review)

**Keputusan Pasha (AskUserQuestion):** login sebelum mengisi; wizard lama disembunyikan sepenuhnya; digital assets tidak ditawarkan; penanda `order_flow_type = 'brief'` lewat migration. Interpretasi teknis tambahan (status `negotiating`) dicatat di `01-KEPUTUSAN.md`.

**File baru**
- `packages/db/migrations/0056_brief_intake_order_flow_type.sql` — `alter type public.order_flow_type add value if not exists 'brief'`. Additive, idempotent, tidak menyentuh baris lama. **Harus dijalankan di Supabase sebelum deploy app.**
- `apps/app/modules/brief-intake/`:
  - `schema.ts` — skema Zod bersama (Animation/Development, jenis proyek per layanan, judul, deskripsi ≥ 30 karakter, rentang budget, deadline opsional ≥ hari ini, link referensi http(s), maks 8 file, setuju syarat). `isOwnCloudinaryUpload` hanya menerima file dari folder upload bertanda tangan milik user itu sendiri (`orders/<user id>`).
  - `format.ts` — label tampilan (`Animation brief: <judul>` di `package_name`, sehingga list/receipt/email/Discord yang sudah ada langsung menampilkan nama yang benar), teks budget, deskripsi, kode order, URL Telegram.
  - `state/submit-brief-order-action.ts` — server action: validasi ulang, cek sesi, insert order (`status 'negotiating'`, `order_flow_type 'brief'`, tanpa harga, tanpa `payment_method`), tautkan file, email konfirmasi Resend dan notifikasi Discord yang sudah ada.
  - `components/BriefIntakeForm.tsx` — form satu halaman, draft tersimpan di browser (try/catch), ringkasan kesalahan dengan fokus otomatis dan link ke field, upload Cloudinary existing.
  - `components/BriefSubmitted.tsx` — layar konfirmasi: nomor order + tombol salin, tiga langkah berikutnya yang memang sudah berjalan, "View my orders", dan "Discuss on Telegram" hanya jika `NEXT_PUBLIC_STUDIO_TELEGRAM_URL` diisi. Pesan Telegram hanya berisi nomor order dan nama proyek (tanpa budget/kontak); nomor order tidak memberi akses apa pun.
  - `brief-intake.test.ts` — 19 tes.

**File diubah**
- `apps/app/app/order/page.tsx` — wajib login (redirect ke `/login?redirectedFrom=/order`), merender intake baru, `noindex`. `OrderWizard` tidak dipakai lagi.
- `apps/admin/app/(protected)/orders/OrdersList.tsx` — union tipe `order_flow_type` ditambah `"brief"` (hanya tipe).
- `packages/db/migrations/verify_migrations_status.sql` — cek status 0056.
- `apps/studio/app/layout.tsx` — deskripsi default situs tidak lagi menjanjikan "instant estimate".
- `apps/studio/app/components/home/ServicesSection.tsx`, `HomeFooter.tsx` — label "services and packages" → "services" (paket tidak bisa dipesan lagi lewat `/order`).

**Alur yang sekarang berjalan**
Homepage "Start a project" → login (bila belum) → `/order` → pilih Animation/Development + jenis → nama, deskripsi, budget, opsional deadline/link/file → setuju syarat → order `negotiating` + nomor order → staff mengirim penawaran pertama dari hub (fitur counter-offer existing) → klien Accept/Counter di `/dashboard/negotiations` → setelah diterima, `awaiting_payment` → bayar penuh lewat panel pembayaran existing → konfirmasi admin → receipt existing.

**Pengujian yang benar-benar dijalankan (container)**
- `turbo run test`: app 95 (19 baru), studio 40, admin 34, validators 20 lulus; miniapp/portfolio tetap "No test files" (baseline).
- `tsc --noEmit` keenam app: 0 error.
- `next dev` apps/app dengan **stub Supabase lokal** (merekam request) + Playwright:
  - tanpa sesi: `/order` → 307 ke `/login?redirectedFrom=%2Forder`;
  - dengan sesi dummy: submit kosong → ringkasan 6 kesalahan berbahasa jelas, fokus pindah ke ringkasan, link putih (kontras);
  - pilih Development → jenis Website/Web app/Game/Something else; Animation → 5 jenis; kartu bisa dipilih dengan keyboard (Space) dan cincin fokus terlihat;
  - submit lengkap → baris yang dikirim ke `orders`: `status "negotiating"`, `order_flow_type "brief"`, `service_id null`, `package_name "Animation brief: …"`, `budget "$1,500 – $5,000 (client's starting budget, not a final price)"`, deadline, link, deskripsi; **tidak ada** `proposed_price_usd`/`final_price_usd`/kolom pembayaran;
  - layar konfirmasi mendapat fokus, link Telegram berisi nomor order, draft browser terhapus;
  - 375 px dan 1280 px tanpa scroll horizontal; semua kontrol ≥ 44 px (pengecualian: link "project terms" di dalam kalimat).
- Tanpa konfigurasi Discord/Resend di container, notifikasi gagal dengan log dan order tetap tersimpan (perilaku yang sama dengan action existing).

**Batas verifikasi**
- Belum diuji terhadap Supabase sungguhan: RLS insert `negotiating`, migration 0056, dan trigger notifikasi in-app perlu dicek di staging/Vercel preview setelah migration dijalankan.
- Upload Cloudinary tidak bisa diuji di container (tanpa kredensial); jalur upload memakai action existing.
- Alur staff → penawaran → klien accept tidak dijalankan end-to-end (butuh DB nyata); kode yang dipakai adalah fitur nego existing tanpa perubahan.
- `next build` tetap tidak bisa di container (Google Fonts).

**Masalah tersisa**
- Order brief hanya bisa **bayar penuh** sampai Tahap 3 (syarat pembayaran/cicilan masuk ke penawaran). Admin tidak punya UI untuk mengubah `payment_method` (action ada, UI dihapus sejak 0051).
- Persetujuan klien masih memakai RPC lama tanpa versi penawaran — perlindungan "penawaran basi" adalah Tahap 3.
- Halaman studio `/services` (paket dengan harga) dan `/how-to-start` (estimasi instan, paket) masih menjelaskan alur lama. CTA mereka tetap valid (ke `/order`), tapi isinya perlu ditulis ulang — diusulkan masuk Tahap 5 atau dipercepat.
- Tampilan `/order` masih memakai tema app lama (crimson, lockup "STUDIO / NIMIA GAMES"); rebrand app di Tahap 5.
- Mini App Telegram punya form order sendiri (tetap 4 kategori lama); tidak diubah.

**Rollback:** revert commit / redeploy app sebelumnya (wizard lama kembali). Nilai enum `brief` boleh tetap ada (tidak bisa dihapus dari enum Postgres dengan aman, dan tidak mengganggu apa pun). Order brief yang sudah dibuat tetap valid dan bisa diproses dengan alur nego existing.

Screenshot: `screenshots/tahap2-*` (data dummy ditandai di nama file).
