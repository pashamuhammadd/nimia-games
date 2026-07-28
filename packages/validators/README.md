# @nimia/validators

Skema Zod bersama untuk semua form (Order Service, invoice, dll), dipakai dobel: di client lewat `react-hook-form` (`@hookform/resolvers/zod`) untuk validasi instan, dan di server action untuk validasi ulang sebelum tulis ke database — supaya tidak ada input tidak valid yang lolos hanya karena JS di client dimatikan/dimanipulasi.

Status: kosong (placeholder). Diisi mulai **Tahap 4** (form Order Service).
