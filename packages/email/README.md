# @nimia/email

Template email transaksional (React Email, dikirim lewat Resend dari
`studio@nimiagames.com`) untuk event-event studio. Juga menyimpan desain email
Supabase Auth (konfirmasi pendaftaran, reset password, dll) sebagai referensi
+ HTML siap-tempel, walau pengirimannya bukan lewat package ini.

Status (4 Agustus 2026): **4 template Resend aktif** — konfirmasi pesanan
(`apps/studio`), negosiasi diterima/counter offer, pembayaran diverifikasi,
dan pembayaran di-flag underpaid (3 terakhir dikirim dari `apps/admin`) —
plus **1 template Supabase Auth** (konfirmasi pendaftaran). Belum ada:
penawaran harga awal (quotation_sent), invoice, reset password, magic link —
menyusul begitu fitur terkait (invoice/PDF, dll) dibangun.

## Struktur

```
src/
  components/
    EmailLayout.tsx           # header logo+wordmark, kartu putih, footer kontak — dipakai semua template Resend
  templates/
    OrderReceivedEmail.tsx        # apps/studio: submitOrderAction
    NegotiationUpdateEmail.tsx    # apps/admin: acceptNegotiationOfferAction / sendCounterOfferAction
    PaymentVerifiedEmail.tsx      # apps/admin: verifyPaymentAction
    PaymentFlaggedEmail.tsx       # apps/admin: flagUnderpaidPaymentAction
    ContactMessageEmail.tsx       # belum ada pemanggil (apps/www belum punya form kontak yang menulis ke sini)
    ConfirmSignupEmail.tsx        # HANYA untuk preview lokal, lihat catatan di bawah
  index.ts                        # barrel export
supabase-templates/
  confirm-signup.html      # HTML statis yang di-paste ke Supabase Dashboard
```

`EmailLayout` memakai warna & logo brand yang sama dengan `apps/www` dan
`apps/studio` (maroon/crimson/pink), tapi ditulis sebagai HEX literal (bukan
CSS variable) dan logo/wordmark sebagai PNG (bukan SVG) — karena banyak
email client (Outlook desktop terutama) tidak mendukung custom property CSS
maupun `<img src="*.svg">`. Aset PNG-nya ada di `apps/www/public/`:
`logo-email.png` (crop rapat dari logo utama) dan
`nimia-games-wordmark-dark.png` (wordmark web direkolor maroon/crimson buat
kebaca di background putih — versi aslinya putih, buat background gelap
www).

## Dua jalur pengiriman email yang berbeda

Penting dibedakan karena keduanya kelihatan sama-sama "email transaksional"
tapi jalurnya beda total:

1. **Resend** (semua template di `templates/` kecuali `ConfirmSignupEmail`) —
   dikirim dari kode kita sendiri lewat helper `lib/email.tsx` di masing-masing
   app (`apps/studio/lib/email.tsx`, `apps/admin/lib/email.tsx`), lewat API
   Resend, pakai komponen React di sini langsung.
2. **Supabase Auth** (`ConfirmSignupEmail`, reset password, magic link) —
   dikirim otomatis oleh Supabase sendiri saat ada event auth (signup,
   reset password, dst). Kontennya dikonfigurasi di **Supabase Dashboard >
   Authentication > Email Templates**, bukan dari kode Next.js sama sekali.
   Supabase butuh HTML mentah + variable Go-template
   (`{{ .ConfirmationURL }}`, `{{ .Email }}`, dst), bukan komponen React —
   makanya ada dua versi: `ConfirmSignupEmail.tsx` (React, buat preview
   lokal & jadi sumber desain) dan `supabase-templates/confirm-signup.html`
   (HTML statis, ditulis manual dengan desain yang sama, ini yang beneran
   dipakai).

### Cara pasang `confirm-signup.html` ke Supabase

1. Buka Supabase Dashboard project studio → **Authentication** →
   **Email Templates** → pilih **Confirm signup**.
2. Copy seluruh isi `supabase-templates/confirm-signup.html` (dari
   `<!DOCTYPE html>`, komentar di atasnya boleh dibuang), paste ke kolom
   HTML body, Save.
3. **Catatan soal pengirim**: ganti konten template ini TIDAK mengubah
   alamat pengirim. Selama custom SMTP belum disambungkan ke Resend
   (Authentication → Settings → SMTP Settings), email tetap terkirim dari
   alamat default Supabase, bukan dari `studio@nimiagames.com` — itu
   langkah terpisah.

Kalau desain brand berubah, dua file ini (`ConfirmSignupEmail.tsx` dan
`confirm-signup.html`) perlu diupdate bareng-bareng secara manual — tidak
ada build step yang otomatis sinkronkan keduanya.

## Preview lokal

```bash
npm run dev --workspace=@nimia/email
```

Membuka React Email's dev server (`email dev`) yang me-render tiap file di
`src/templates` (termasuk `ConfirmSignupEmail`, walau itu cuma referensi
desain) dengan data contoh dari `<Template>.PreviewProps`, plus preview di
beberapa ukuran layar/klien email sekaligus.

## Cara pakai template Resend (aktif per 4 Agustus 2026)

Setiap app yang mengirim email Resend punya helper tipis sendiri di
`lib/email.tsx` (bukan di package ini — package ini sengaja tidak
depend ke `resend` supaya tetap ringan/framework-agnostic untuk preview).
Helper itu satu-satunya tempat yang tahu `RESEND_API_KEY`/`RESEND_FROM_EMAIL`
dan menelan error (log-only, tidak throw) supaya kegagalan kirim email
TIDAK PERNAH menggagalkan request yang memicunya (mis. order sudah tersimpan
di DB duluan sebelum email dicoba dikirim).

Contoh (`apps/studio/lib/email.tsx`):

```ts
import { Resend } from "resend";
import { OrderReceivedEmail } from "@nimia/email";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderReceivedEmail(to: string, props: OrderReceivedEmailProps) {
  const { error } = await resend.emails.send({
    from: `Nimia Studio <${process.env.RESEND_FROM_EMAIL}>`,
    to,
    subject: `We've received your ${props.serviceName} order`,
    react: <OrderReceivedEmail {...props} />,
  });
  // ...error handling, lihat isi file aslinya
}
```

`apps/admin` punya helper serupa (`apps/admin/lib/email.tsx`) untuk
`NegotiationUpdateEmail`, `PaymentVerifiedEmail`, dan `PaymentFlaggedEmail`
— app itu juga butuh `RESEND_API_KEY`/`RESEND_FROM_EMAIL` di env-nya sendiri
(ditambahkan ke `.env.example` per 4 Agustus 2026) karena aksi
verifikasi/negosiasi pembayaran dijalankan dari sisi admin, bukan studio.

Resend yang mengonversi komponen React ke HTML — tidak perlu memanggil
`render()` manual.
