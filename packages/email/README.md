# @nimia/email

Template email transaksional (React Email, dikirim lewat Resend dari
`contact@nimiagames.com`) untuk semua event studio: pesanan dibuat, penawaran
harga, invoice dibuat/dikirim, pembayaran diterima, receipt tersedia, project
selesai, revisi diminta, deadline mendekat. Juga menyimpan desain email
Supabase Auth (konfirmasi pendaftaran, reset password, dll) sebagai referensi
+ HTML siap-tempel, walau pengirimannya bukan lewat package ini.

Status: **1 template Resend aktif** (konfirmasi pesanan) + **1 template
Supabase Auth** (konfirmasi pendaftaran). Sisanya (penawaran harga, invoice,
pembayaran, reset password, magic link) menyusul di **Tahap 5** begitu alur
backend-nya ada.

## Struktur

```
src/
  components/
    EmailLayout.tsx        # header logo+wordmark, kartu putih, footer kontak — dipakai semua template Resend
  templates/
    OrderReceivedEmail.tsx
    ConfirmSignupEmail.tsx # HANYA untuk preview lokal, lihat catatan di bawah
  index.ts                 # barrel export
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

1. **Resend** (`OrderReceivedEmail`, dan semua template Tahap 5 nanti) —
   dikirim dari kode kita sendiri (server action di `apps/studio`), lewat
   API Resend, pakai komponen React di sini langsung.
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
   alamat default Supabase, bukan dari `contact@nimiagames.com` — itu
   langkah terpisah, dilakukan begitu domain Resend selesai verifikasi.

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

## Cara pakai template Resend di Tahap 5

Belum dikirim dari mana pun — package ini baru berisi template-nya saja.
Nanti di server action (mis. `createOrderAction`), tinggal:

```ts
import { Resend } from "resend";
import { OrderReceivedEmail } from "@nimia/email";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "Nimia Games <contact@nimiagames.com>",
  to: email,
  subject: `Pesanan ${serviceName} kamu sudah kami terima`,
  react: (
    <OrderReceivedEmail
      clientName={fullName}
      serviceName={serviceName}
      orderId={order.id}
      submittedAt={formattedDate}
      description={description}
      dashboardUrl="https://studio.nimiagames.com/dashboard/orders"
    />
  ),
});
```

Resend yang mengonversi komponen React ke HTML — tidak perlu memanggil
`render()` manual.
