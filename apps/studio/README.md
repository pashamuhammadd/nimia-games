# studio.nimiagames.com

Order system, client dashboard, invoice/receipt, dan admin dashboard Nimia Games. Ini prioritas pembangunan pertama sesuai keputusan Tahap 1 (lihat `docs/ARCHITECTURE.md`).

Status saat ini: **skeleton kosong** dari Tahap 2 (struktur folder) — cuma halaman placeholder, belum Tailwind/shadcn, belum Supabase, belum ada logic bisnis apa pun. Diisi bertahap:

- Tahap 3: skema database Supabase (di `packages/db`)
- Tahap 4: UI dasar (shadcn/ui dari `packages/ui`, shell dashboard, halaman auth, form Order Service)
- Tahap 5: backend (server actions order/invoice/PDF/email)
- Tahap 6: testing alur kritis

## Menjalankan (dari root monorepo, setelah `npm install`)

```bash
npm run dev:studio
```
