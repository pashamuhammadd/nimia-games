# Rencana implementasi

Divalidasi terhadap kode per 3 Nov 2026 (lihat `02-AUDIT-KODE.md`). Setiap tahap diakhiri catatan di `04-PROGRES.md`: file diubah, keputusan, pengujian + hasil, screenshot bila ada, masalah tersisa, checkpoint commit, langkah berikutnya. Deploy production tidak termasuk paket ini.

## Prinsip lintas tahap
- Satu branch per tahap dari `main` (`redesign/studio-phase-N`), commit kecil per sub-langkah.
- Tidak membangun ulang fitur yang sudah ada (receipt, payment summary, cicilan, nego, partner, deliveries).
- Migration hanya additive dan bernomor lanjut (`0056_...`); fungsi lama dibiarkan sampai semua pemanggil pindah.
- Uji DB di project Supabase terpisah/lokal dengan data dummy. Tidak pernah mengonfirmasi order/pembayaran nyata.
- Rollback kode ≠ rollback uang. Pembayaran yang sudah dikonfirmasi tidak di-rollback karena dokumen gagal.

---

## Tahap 0 — Audit dan rencana ✅
Dokumen di folder ini. Tidak ada perubahan kode.

## Tahap 1 — Visual marketing: Orchid Pulse, Motion Frame, homepage (selesai, menunggu review)
Detail konkret di bagian akhir dokumen ini. Hanya `apps/studio` (+ dokumen). Tanpa DB, pembayaran, atau perubahan alur order.

## Tahap 2 — Intake order (selesai, menunggu review — lihat 04-PROGRES)
- **Reuse:** wizard `apps/app/modules/order`, kolom `budget`/`proposed_price_usd`, upload Cloudinary, validasi animasi (script, referensi karakter, deadline), notifikasi order baru.
- **Bangun:** langkah awal "Animation / Development" yang memetakan ke kategori existing (Animation → `animation`; Development → `website_development`/`game_development`; `digital_assets` diputuskan), form kebutuhan + anggaran ringkas, halaman sukses dengan nomor order dan tombol Telegram (deep link berisi nomor order + brief ringkas, tanpa memberi akses privat).
- **Butuh keputusan:** timing login, username Telegram layanan, nasib `digital_assets`, apakah Package/Custom Builder tetap tampil.
- **File:** `apps/app/modules/order/*`, `apps/app/app/order/page.tsx`, CTA di studio. DB: kemungkinan tidak perlu migration.
- **Uji:** unit test mapping kategori, test order dummy end-to-end di staging, order lama (4 kategori) tetap tampil normal di dashboard & hub.
- **Rollback:** revert commit/deploy; order yang dibuat di alur baru tetap valid karena skema sama.

## Tahap 3 — Penawaran dan persetujuan
- **Reuse:** `order_negotiations` sebagai riwayat versi, UI nego klien (`dashboard/negotiations`) dan admin (`OrderDetailPanel`).
- **Bangun (additive):** RPC `accept_offer(p_offer_id)` yang menolak bila bukan offer terbaru / order bukan `negotiating`; kolom audit persetujuan (siapa, kapan, offer id) — tabel baru `order_offer_approvals` atau kolom di `order_negotiations`; scope/mata uang/ketentuan pembayaran di offer; invoice utama dibuat sekali di transaksi persetujuan (`next_document_number('INV')`, unique per order).
- **Pemanggil RPC lama yang harus ikut pindah:** `apps/app/app/dashboard/negotiations/actions.ts` dan `apps/miniapp/app/orders/[orderId]/actions.ts` (keduanya memanggil `accept_negotiation_offer`).
- **Butuh keputusan:** apakah `sendQuotationForPaymentAction` (harga final tanpa persetujuan klien) dihapus/diubah; kebijakan revisi harga setelah invoice/pembayaran.
- **Uji:** persetujuan offer basi ditolak; dua klik bersamaan menghasilkan satu invoice; RLS klien hanya melihat order miliknya.
- **Rollback:** UI kembali ke RPC lama (masih ada); tabel baru dibiarkan (tidak di-drop).

## Tahap 4 — Pembayaran, invoice saldo, receipt
- **Reuse:** RPC submit tx hash, verifikasi admin, `order_receipts` (idempoten), `get_order_payment_summary`, PDF receipt on-demand.
- **Bangun:** PDF/halaman invoice (Unpaid / Partially paid / Paid, histori pembayaran terkonfirmasi, saldo) dari summary; verifikasi admin kondisional + notifikasi hanya bila baris berubah; mekanisme retry dokumen; aturan duplicate tx hash per chain (setelah keputusan).
- **Uji (dari checklist 06):** tx hash saja tidak melunasi; termin pertama → 1 receipt, partial, saldo benar; termin akhir → 1 receipt, paid, saldo 0; konfirmasi bersamaan/retry tidak menggandakan; PDF gagal bisa diulang; fee cicilan existing tidak berubah.
- **Rollback:** fitur dokumen bisa dimatikan; data pembayaran tidak disentuh.

## Tahap 5 — Konsistensi brand
Dashboard (`apps/app` token + lockup di 5 lokasi), hub seperlunya, portfolio, email (`EmailLayout` logo dari nimiagames.com), PDF footer/logo, template Supabase Auth (repo + dashboard Supabase), halaman studio lama (/services, /why-nimia, /how-to-start, /partners FAQ domain lama, /portfolio), metadata publisher/`sameAs`/canonical, legal (menunggu identitas penerbit). Audit redirect per URL; URL yang tidak berubah tidak dipindah.

## Tahap 6 — QA dan rilis
Staging terisolasi, cek order existing per status, regression (login lintas subdomain, referral, fee cicilan, deliveries, support/Discord ticket, Mini App), rencana rilis dan rollback. Deploy production menunggu otorisasi terpisah.

---

# Rencana konkret Tahap 1

**Tujuan:** homepage nimiastudio.com baru berdasarkan preview, dengan fondasi tema Orchid Pulse dan logo Motion Frame, tanpa perubahan pembayaran, database, atau `apps/app`/`apps/admin`/`apps/www`.

## 1.1 Persiapan
- Branch `redesign/studio-phase-1` dari `main` (lihat pertanyaan C1 di `01-KEPUTUSAN.md` tentang siapa yang membuatnya).
- Baca `node_modules/next/dist/docs/` untuk API yang dipakai (metadata, `next/font`, server components) sesuai `AGENTS.md`.

## 1.2 Token tema (usulan B1)
- `apps/studio/app/globals.css`: tambah scope `.studio-orchid` berisi token wajib (`--orchid-bg #100B1B`, `--orchid-pink #FF39C8`, `--orchid-violet #A26BFF`, `--orchid-text #FFF5FC`, `--orchid-gradient`), plus token turunan yang diuji kontrasnya: surface, teks sekunder, border, focus ring, success, error (error memakai ikon + teks, bukan hanya warna pink). Scope yang sama juga me-remap `--background`, `--foreground`, `--nimia-*` agar komponen `@nimia/ui` di dalamnya ikut tema baru.
- Target kontras: teks normal ≥ 4.5:1 dan teks besar ≥ 3:1 terhadap `#100B1B`; dicek dengan skrip, hasil dicatat.
- Scope lama `.nimia-dark` tidak diubah → halaman studio lain tetap seperti sekarang.

## 1.3 Logo Motion Frame (usulan B3)
- Trace `reference/motion-frame-logo-reference.png` menjadi SVG (mark + wordmark sebagai path), bersihkan, bandingkan overlay dengan PNG, simpan di `apps/studio/public/brand/`:
  - `motion-frame-mark.reconstruction.svg`
  - `motion-frame-lockup.reconstruction.svg`
- Komentar di SVG dan dokumen: "rekonstruksi dari PNG konsep, bukan master asli". Wordmark tidak diganti font lain.
- Komponen `MotionFrameLogo` (`apps/studio/app/components/brand/`) dengan `aria-label="Nimia Studio"` dan ukuran berbasis tinggi (rasio terkunci, tidak meregang).
- Favicon/OG tidak diganti di Tahap 1 (Tahap 5).

## 1.4 Homepage (`apps/studio/app/page.tsx` + komponen baru di `app/components/home-v2/`)
| Bagian | Isi | Sumber data / tujuan link |
|---|---|---|
| Navbar baru (homepage) | Logo, Work (`#work`), Services (`#services`), How it works (`#how-it-works`), Client login (`${APP_URL}/login`), Start a project | CTA memakai `StartProjectButton` existing (`/order` atau `/login?redirectedFrom=/order`). Menu mobile dengan `aria-expanded`, fokus terkelola. |
| Hero | Eyebrow "Independent creative studio", H1 "Big ideas. Wildly alive.", sub "Animation and development for brands ready to stand out.", CTA "Explore our work" (`#work`) + "Start a project" | Visual: komposisi Motion Frame dari SVG/CSS (dua sudut pink & violet). Isi frame: poster karya portfolio nyata bila ada; jika tidak, gradien abstrak. Tidak ada karakter dari preview. |
| Selected work | Hingga 3 karya `published` dari tabel `portfolio` (featured dulu, lalu `sort_order`), poster Cloudinary statis (bukan video autoplay), judul + kategori, link "View full portfolio" | Server component + anon Supabase; error/empty state nyata. Tidak ada statistik/klien karangan. |
| Services | 01 Animation, 02 Development (copy preview) | CTA ke `/order` existing. Tidak ada kategori lain. |
| How it works | 4 langkah yang **sudah benar hari ini**: Share your idea & budget → Agree on scope and price → Pay securely (full or installments) → Track progress & receive files | Tidak mengklaim invoice otomatis/Telegram yang belum dibangun. Diperbarui di Tahap 2–4. |
| CTA akhir | "Your next big idea starts here." + Start a project; "Questions? Chat on Telegram" hanya jika env diisi (B5) | — |
| Footer | Footer existing (link legal & Partner Program tetap berfungsi) dengan styling tema baru | Teks legal tidak diubah sampai identitas penerbit diputuskan. |

- Dilepas dari homepage: `CreativeAgentSection`, `ToolsSection`. Modul, route `/creative-agent`, dan API tetap ada; `/creative-agent` dikeluarkan dari sitemap dan diberi `robots: noindex` (B6).
- Metadata homepage: description baru sesuai positioning Animation + Development. `publisher`/`sameAs` tidak diubah di Tahap 1 (Tahap 5).
- Halaman studio lain memakai `PublicNavbar` lama; link "Home" mereka tetap ke `/`.

## 1.5 Motion dan performa
- Animasi masuk singkat (CSS/Framer Motion yang sudah terpasang), hover halus, tanpa scroll hijack, tanpa parallax berat.
- `@media (prefers-reduced-motion: reduce)` mematikan animasi dekoratif.
- Hero tanpa video, tanpa chat AI, tanpa login check yang memblokir render (cek sesi tetap untuk label CTA).
- Gambar portfolio: ukuran eksplisit, `loading="lazy"` di bawah fold, srcset Cloudinary.

## 1.6 Pengujian Tahap 1
- `tsc --noEmit` dan `vitest` studio; tambah unit test untuk mapper Selected Work (empty, error, data normal) dan util kontras token.
- Pastikan `git diff --stat main` hanya berisi `apps/studio/**` dan `docs/nimia-studio-redesign/**` (bukti `apps/www`, `apps/app`, `apps/admin`, packages tidak berubah).
- Preview lokal (`npm run dev:studio`) dengan Playwright: screenshot 320, 375, 768, 1280, 1440 px; cek tidak ada scroll horizontal dan teks terpotong; navigasi keyboard (Tab order, focus ring terlihat); target sentuh ≥ 44px; mode reduced motion.
- Semua link/tombol diverifikasi tujuannya (anchor, `/order`, `/login`, portfolio, legal).
- Batas yang sudah diketahui: `next build` tidak bisa jalan di container karena Google Fonts diblokir; build final diverifikasi di mesin Anda atau Vercel preview. Data portfolio di preview lokal butuh env Supabase anon; tanpa itu empty state yang tampil.

## 1.7 Rollback Tahap 1
Murni perubahan tampilan di `apps/studio`: revert commit atau redeploy deployment Vercel sebelumnya. Tidak ada data yang perlu dipulihkan.

## 1.8 Belum termasuk Tahap 1
Intake 2 kategori, Telegram dengan nomor order, penawaran berversi, invoice, perubahan pembayaran, dashboard/hub/email/PDF rebrand, legal, halaman studio lain.
