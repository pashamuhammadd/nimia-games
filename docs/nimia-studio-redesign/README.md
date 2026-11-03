# Nimia Studio Redesign

Folder ini mencatat perombakan Nimia Studio (nimiastudio.com dan app terkait) berdasarkan paket `nimia-studio-claude-kit` (3 November 2026, pemilik: Pasha).

| File | Isi |
|---|---|
| [01-KEPUTUSAN.md](01-KEPUTUSAN.md) | Keputusan yang disetujui, usulan teknis, dan pertanyaan terbuka (dipisah tegas) |
| [02-AUDIT-KODE.md](02-AUDIT-KODE.md) | Audit kode aktual per 3 Nov 2026: git, stack, routes, skema order/penawaran/cicilan/invoice/pembayaran, Telegram, baseline test |
| [03-RENCANA-IMPLEMENTASI.md](03-RENCANA-IMPLEMENTASI.md) | Tahapan 0–6, file terdampak, pengujian, rollback, dan rencana konkret Tahap 1 |
| [04-PROGRES.md](04-PROGRES.md) | Log progres per tahap (apa yang benar-benar dikerjakan dan diuji) |
| `screenshots/` | Screenshot review per tahap (data dummy ditandai di nama file) |
| `reference/` | Salinan dua PNG konsep dari paket (logo Motion Frame, homepage preview). Raster konsep, bukan aset final. |

## Status saat ini

- **Tahap 0 (audit + rencana): selesai.**
- **Tahap 1 (Orchid Pulse, Motion Frame, homepage): selesai di working tree, menunggu review** — detail di `04-PROGRES.md`. Hanya `apps/studio` yang berubah.
- Belum ada migration, perubahan pembayaran, konfigurasi production, atau deploy. Commit dan push dilakukan manual oleh Pasha.

## Sumber kebenaran

1. Keputusan dalam paket kit (02–06) menggantikan konsep produk lama.
2. Kode di repository adalah fakta implementasi. Bila briefing lama (`reference/original-context-extracted.txt` di paket) berbeda dari kode, perbedaannya dicatat di `02-AUDIT-KODE.md` bagian 9.
