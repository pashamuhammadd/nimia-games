# Keputusan, usulan teknis, dan pertanyaan terbuka

Tiga kategori di bawah tidak boleh dicampur. Hanya bagian A yang mengikat. Bagian B adalah usulan yang bisa ditolak saat review. Bagian C belum diputuskan dan tidak boleh diisi dengan asumsi.

---

## A. Keputusan yang disetujui (dari paket kit, 3 Nov 2026)

### Produk
- Nimia Studio adalah brand jasa independen dari Nimia Games.
- Dua kategori layanan utama: **Animation** dan **Development**. Tidak menambah cabang kategori utama.
- UI publik tetap bahasa Inggris; komunikasi kerja boleh bahasa Indonesia.
- Creative Agent **tidak** digunakan pada pengalaman pengunjung baru.
- Alur: lihat karya → Start a project → pilih Animation/Development → kebutuhan awal + anggaran → order tercatat di website → Telegram dengan referensi order → nego → admin menetapkan penawaran → klien menyetujui penawaran terbaru → invoice Unpaid otomatis → bayar → admin konfirmasi → receipt + update invoice otomatis → pantau proyek → terima hasil.
- Anggaran awal bukan harga final.
- Negosiasi dicatat di sistem; klien menyetujui versi penawaran terbaru. Perubahan penawaran membatalkan persetujuan versi lama.
- Satu invoice utama per order; satu receipt per konfirmasi pembayaran. Tx hash saja bukan konfirmasi.
- Dashboard tetap untuk pembayaran, progres, dokumen, hasil.
- Dipertahankan: Supabase + histori migration, order aktif, histori pembayaran, referral/komisi (Partner Program), akses klien, deliveries, integrasi portfolio, integrasi yang masih dipakai. Data order lama tidak diubah agar terlihat sesuai katalog baru.
- Game ditunda. Maskot belum dipilih; karakter di preview bukan maskot.

### Visual
- Identitas: Bold & Playful, tema **Orchid Pulse**, logo **Motion Frame** (dipilih Pasha).
- Token wajib: background `#100B1B`, pink utama `#FF39C8`, violet `#A26BFF`, teks `#FFF5FC`, gradasi `linear-gradient(115deg, #FF39C8, #A26BFF)`.
- Pink tidak boleh jadi satu-satunya indikator error. Tidak ada biru dominan.
- Logo: dua sudut membulat pink + violet membentuk N; wordmark `nimia`, subtitle `STUDIO`. Belum ada SVG master, font logo berlisensi, logo transparan, atau model 3D.
- Homepage: nav (logo, Work, Services, How it works, Client login, Start a project), hero (copy preview boleh dipakai), Selected Work dari data portfolio aktual, Services hanya dua, How it works ringkas, CTA akhir Start a project + Telegram sebagai bantuan tambahan.
- Preview adalah acuan, bukan halaman jadi; teks dan layout boleh disesuaikan untuk aksesibilitas dan konten nyata. Tanpa scroll hijack, ada `prefers-reduced-motion`.

### Proses
- Deploy production belum diotorisasi.
- Migration hanya additive bila perlu; tidak reset, drop, atau rewrite migration yang sudah diterapkan.
- Tidak memisahkan repo atau mengganti database otomatis.
- Uji dengan data dummy terisolasi; tidak mengonfirmasi pembayaran/order nyata.

### Keputusan Tahap 2 (dijawab Pasha, 3 Nov 2026)
- **Login sebelum mengisi brief.** Pengunjung yang belum login di `/order` diarahkan ke `/login?redirectedFrom=/order`.
- **Wizard lama disembunyikan sepenuhnya.** Project Builder, Packages, dan Custom Builder tidak lagi dirender atau ditautkan dari `/order`. Kodenya tetap ada di `modules/order` karena dipakai order lama, tes harga, upload, dan header.
- **Digital assets tidak ditawarkan** di intake baru. Data order lama tetap apa adanya.
- **Penanda database `order_flow_type = 'brief'`** lewat migration additive `0056`.

### Interpretasi teknis Tahap 2 (perlu dikonfirmasi saat review)
- Order brief disimpan dengan status **`negotiating`**, bukan `pending_review`. Di sistem sekarang hanya order `negotiating` yang bisa diberi penawaran staff lalu **disetujui klien** (accept/counter). Order `pending_review` diberi harga langsung oleh admin tanpa persetujuan klien, dan itu bertentangan dengan alur yang disetujui.
- Budget disimpan sebagai rentang teks di `orders.budget`. `proposed_price_usd` dan `final_price_usd` dibiarkan kosong, dan tidak ada baris `order_negotiations` yang dibuat dari budget.
- `payment_method` dibiarkan kosong, jadi order brief hanya bisa dibayar penuh lewat jalur existing sampai syarat pembayaran masuk ke penawaran (Tahap 3).

---

## B. Usulan teknis (perlu review, belum disetujui)

B1–B8 sudah diterapkan di Tahap 1 sebagai implementasi yang bisa direview (lihat `04-PROGRES.md`); tetap bisa ditolak saat review. B9–B11 untuk tahap berikutnya.

| # | Usulan | Alasan |
|---|---|---|
| B1 | Token Orchid Pulse dipasang di `apps/studio/app/globals.css` sebagai scope baru (mis. `.studio-orchid`) yang hanya dipakai homepage baru di Tahap 1; halaman studio lain dipindah bertahap. | Halaman /services, /why-nimia, /how-to-start, /partners, /portfolio masih memakai token crimson. Mengganti token global sekaligus akan merombak halaman yang belum didesain ulang. |
| B2 | `apps/www` tidak tersentuh. | Audit: `www` tidak bergantung ke `@nimia/ui` maupun CSS studio; tiap app punya `globals.css` sendiri. Risiko kebocoran style rendah, tetap dicek dengan diff. |
| B3 | Logo SVG **rekonstruksi** dari PNG referensi (trace vektor lalu dibersihkan), disimpan sebagai `motion-frame-mark.reconstruction.svg` dan `motion-frame-lockup.reconstruction.svg`, dengan komentar bahwa ini bukan master asli. | Paket mengizinkan rekonstruksi bila dinyatakan. Wordmark ditrace sebagai path (bukan diganti font lain) supaya tidak mengklaim identik. |
| B4 | Selected Work membaca tabel `portfolio` (status `published`, prioritas `featured`, urut `sort_order`) lewat anon client di server component studio, maksimal 3 item, link ke portfolio.nimiastudio.com. Tidak ada item → section tampil empty state, bukan placeholder ilustrasi. | RLS `portfolio_public_read_published` (0052) mengizinkan baca publik; `CLOUDINARY_CLOUD_NAME` sudah ada di studio. |
| B5 | Link Telegram di CTA akhir dirender hanya jika env `NEXT_PUBLIC_STUDIO_TELEGRAM_URL` terisi. | Username layanan belum disepakati; tidak memakai Telegram pribadi Pasha. |
| B6 | Creative Agent dilepas dari homepage saja. Route `/creative-agent`, API `/api/creative-agent`, dan modul tetap ada; dikeluarkan dari sitemap dan diberi `noindex` di Tahap 1. Penghapusan fisik ditunda sampai keputusan. | Order lama dengan `order_flow_type` dari Creative Agent tetap terbaca; admin masih punya logika terkait. |
| B7 | `ToolsSection` (logo merek Next.js/GitHub dll. yang digambar ulang dari ingatan) tidak dipakai di homepage baru. | Bukan bagian preview; logo merek pihak ketiga hasil rekonstruksi berisiko. |
| B8 | Tipografi heading memakai Sora 800 (sudah dimuat, tanpa dependensi baru) sampai font brand diputuskan. | Preview memakai sans tebal membulat; Sora 800 paling dekat dari yang tersedia. Bisa diganti di Tahap 5. |
| B9 | Tahap 3: `accept_negotiation_offer` diganti versi baru yang menerima `p_offer_id` dan menolak bila offer itu bukan yang terbaru (additive: fungsi baru, fungsi lama dipertahankan sampai UI pindah). | Saat ini klien menerima "penawaran staff terbaru" tanpa id, jadi bisa menyetujui harga yang berubah setelah halaman dibuka. |
| B10 | Tahap 3–4: invoice utama = tabel/view baru yang memakai `next_document_number('INV')` dan `get_order_payment_summary()`; receipt tetap `order_receipts`. | Fondasi receipt dan payment summary sudah idempoten dan teruji; yang belum ada hanya dokumen invoice bernomor. |
| B11 | Tahap 4: update verifikasi admin dibuat kondisional (`.eq('status','payment_submitted')`) dan email/notifikasi dikirim hanya bila baris benar-benar berubah. | Receipt sudah aman dari dobel (unique + on conflict), tetapi email/Discord bisa terkirim dua kali bila dua klik bersamaan. |

---

## C. Pertanyaan terbuka

### C1. Menghalangi Tahap 1 — terjawab
1. ~~Branch dan cara menulis ke folder~~ → **Diputuskan 3 Nov 2026:** file ditulis langsung ke working tree, Pasha membuat branch, commit, dan push secara manual dengan perintah yang diberikan setiap ada perubahan.

### C2. Tidak menghalangi Tahap 1 (default dipakai bila belum dijawab)
| Pertanyaan | Default Tahap 1 |
|---|---|
| Username/URL Telegram layanan studio | Link Telegram disembunyikan (B5) di homepage dan halaman konfirmasi order. Aktif otomatis setelah `NEXT_PUBLIC_STUDIO_TELEGRAM_URL` diisi di Vercel (studio **dan** app). |
| Identitas legal penerbit, isi Terms/Privacy/Refund | Footer mempertahankan link legal existing ke nimiagames.com dan teks copyright existing; tidak menulis klaim legal baru |
| Portfolio final, termasuk Lifetopia World / LemmiRun (IP Nimia Games) | Hanya item dari tabel `portfolio` yang `published`; IP Nimia Games tidak ditampilkan di homepage baru |
| Karya Development nyata untuk ditampilkan | Kartu Development di Services tanpa klaim karya; tidak ada thumbnail karangan |
| Nasib halaman /why-nimia, /how-to-start, /partners, /services lama | Tetap hidup dengan tema lama sampai Tahap 5; Partner Program tetap di footer |

### C3. Untuk tahap berikutnya (dari paket + temuan audit)
- Aturan biaya & jadwal cicilan untuk order baru. Nilai existing: default +20% (2x, 60/40) dan +30% (3x, 40/30/30), dapat diubah admin di `installment_settings` — nilai aktual production belum diperiksa. Tidak ada kolom jatuh tempo per termin di database.
- Revisi harga setelah persetujuan/pembayaran; kapan produksi boleh mulai.
- Scope notifikasi email/Telegram.
- Kurs crypto: token native dihitung dari kurs CoinGecko saat submit, stablecoin 1:1; nilai yang dikreditkan ke tagihan selalu `amount_usd` termin, bukan nilai crypto yang diterima. Perlu keputusan bila ingin membedakan nilai diterima vs dikreditkan.
- Overpayment, partial refund, duplicate tx hash (tidak ada constraint unik tx hash saat ini), pembayaran lama, tx ditolak.
- Apakah admin boleh langsung menetapkan harga final tanpa persetujuan klien (`sendQuotationForPaymentAction` saat ini langsung ke `awaiting_payment`).
- Pemisahan repo, nama paket `@nimia/*`, dan URL lama.
