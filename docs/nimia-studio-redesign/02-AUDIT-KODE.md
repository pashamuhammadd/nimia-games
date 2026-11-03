# Audit kode aktual — 3 November 2026

Audit tahap 0 untuk perombakan Nimia Studio. Tidak ada kode aplikasi, migration, konfigurasi, atau deploy yang diubah.

## 0. Cara audit ini dilakukan (dan batasnya)

- Sesi Claude ini terhubung ke `C:\Users\mochn\nimia-games` hanya lewat akses **baca daftar folder dan salin file**; tidak ada shell di komputer Anda, jadi `git status` tidak bisa dijalankan langsung di sana.
- Pengganti `git status`:
  1. `.git/HEAD`, `refs/heads/main`, `refs/remotes/origin/main`, dan `.git/index` lokal disalin dan diparse.
  2. Repo publik `github.com/pashamuhammadd/nimia-games` di-clone ke container dan dibandingkan.
  3. Semua folder sumber (`apps/*`, `packages/*`, `docs`, `scripts`, root) dilist dari komputer Anda dan dibandingkan dengan index: jumlah file per folder dan mtime terhadap waktu commit terakhir.
- Batas: perubahan isi file yang tidak mengubah mtime tidak akan terdeteksi (sangat jarang). File `.env*` tidak dibuka; hanya nama variabel dari kode yang dicatat.
- Build dan test dijalankan di container Linux (Node 22), bukan di Windows Anda.

## 1. Status git

| Item | Hasil |
|---|---|
| Branch aktif lokal | `main` |
| HEAD lokal | `8335535` "fix: trigger phrase now overrides human takeover too" (21 Agu 2026 22:21 WIB) |
| `origin/main` (lokal & GitHub) | `8335535` — sinkron, tidak ada commit belum di-push |
| Perubahan staged | Tidak ada (index identik dengan tree HEAD, 798 file) |
| Perubahan unstaged | Tidak terdeteksi (semua file sumber ber-mtime sebelum commit terakhir; jumlah file per folder cocok) |
| File untracked di sumber | Hanya yang di-ignore: `.env.local`, `.env.example` per app, `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.next`, `.turbo`, `node_modules` |
| Branch lain | `monorepo-migration` (lokal + remote, lama, 29 Jul 2026) |
| Catatan | `.env.example` ikut ter-ignore oleh pola `.env*` di `.gitignore`, jadi contoh env tidak ada di GitHub. File root `delete-old-*.ps1`, `MIGRATE.ps1`, dan dua `*-INSTRUCTIONS.md` adalah sisa migrasi Agustus dan masih ter-track. |

Kesimpulan: aman membuat branch baru dari `main`; tidak ada pekerjaan lokal yang terancam tertimpa.

## 2. Stack dan tooling

- Turborepo 2 + **npm workspaces** (`packageManager: npm@11.9.0`, lockfile `package-lock.json`). Bukan pnpm/yarn.
- Next.js **16.2.9** (App Router, Turbopack build), React 19.2.4, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/postcss`), Zod 3.24.1 (override), React Hook Form, Framer Motion 11, lucide-react, Vitest 2.
- `AGENTS.md`: versi Next ini punya breaking changes; sebelum menulis kode baca `node_modules/next/dist/docs/`.
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Resend, Cloudinary, `@react-pdf/renderer`, Discord, Telegram Bot API, Gemini (Creative Agent), CoinGecko, Upstash QStash.

## 3. Apps dan routes

| App | Domain | Routes utama |
|---|---|---|
| `apps/studio` | nimiastudio.com | `/` (Creative Agent + ToolsSection), `/creative-agent`, `/services`, `/portfolio`, `/why-nimia`, `/how-to-start`, `/partners`, `/api/creative-agent`, `/api/video/[id]`, `sitemap`, `robots`. Redirect 308 ke app: `/login`, `/register/*`, `/order`, `/dashboard/*`, `/r/:code`, `/api/discord/*`, `/api/orders/*`. |
| `apps/app` | app.nimiastudio.com | `/` , `/login`, `/register`, `/register/check-email`, `/order` (wizard; bisa dibuka tanpa login, login diminta saat submit), `/r/[code]`, `/dashboard` + `orders`, `negotiations`, `invoices`, `deliveries`, `projects`, `messages`, `notifications`, `partners` (+`withdraw`), `profile`, `quests`, `support`, `vouchers`; API `discord/{callback,connect,interactions}`, `orders/[id]/receipt`. Middleware melindungi `/dashboard*`. |
| `apps/admin` | hub.nimiastudio.com | `(protected)/` dashboard, `orders`, `clients`, `projects`, `invoices`, `finance`, `services`, `partners`, `portfolio`, `vouchers`, `quests`, `tickets`, `notifications`, `ai-prospect-hunter/*`; API `cron/prospect-hunter`, `orders/[id]/receipt`. |
| `apps/portfolio` | portfolio.nimiastudio.com | `/`, API `portfolio`, `portfolio/[slug]`, `portfolio/categories`, `video/[id]`, `cloudinary/webhook`. |
| `apps/miniapp` | miniapp.nimiastudio.com | `/`, `/services`, `/order`, `/orders`, `/orders/[orderId]`, `/partner`, `/account`; API `telegram/{webhook,session,link}`, `telegram/business/webhook`. |
| `apps/www` | nimiagames.com | Situs Nimia Games, termasuk `/privacy`, `/terms`, `/refund-policy` yang saat ini dipakai link legal studio. |

## 4. Shared packages dan dependensi antar app

| Package | Dipakai oleh | Catatan untuk redesign |
|---|---|---|
| `@nimia/ui` | studio, app, admin, portfolio, miniapp (**tidak** www) | Komponen membaca CSS variable (`--nimia-*`) dari `globals.css` tiap app, jadi tema bisa diganti per app tanpa mengubah package. |
| `@nimia/db` | semua kecuali www | 55 migration (0001–0055) + `README.md` + `verify_migrations_status.sql`. `types.ts` masih `any`. |
| `@nimia/email` | studio, app | Logo email dari `https://www.nimiagames.com/nimia-studio-lockup-email.png`; teks "Nimia Games"; template Supabase `confirm-signup.html`. |
| `@nimia/pdf` | studio, app, admin | Receipt PDF; logo dari domain nimiagames.com; footer "Nimia Games · Indie game development studio". |
| `@nimia/discord`, `@nimia/telegram` | app/admin/miniapp/studio | Notifikasi, ticket, bot. |
| `@nimia/validators`, `@nimia/auth`, `@nimia/config` | beberapa app | — |

`apps/www` hanya bergantung ke `next`, `react`, `react-dom`, `lucide-react` dan punya `globals.css` sendiri. Perubahan token di `apps/studio/app/globals.css` tidak menyentuh www.

## 5. Homepage studio saat ini

- `app/page.tsx`: `PublicNavbar` → hero `CreativeAgentSection` (modul `modules/creative-agent`, Gemini) → `ToolsSection` (9 logo merek pihak ketiga yang digambar ulang dari ingatan) → `Footer`.
- `PublicNavbar`: logo `/nimia-studio-lockup.svg` (lockup "STUDIO / NIMIA GAMES", alt "Nimia Games Studio"); link Home, Why Nimia, Services, Portfolio, How to Start, Partners; tombol "Start a Project" ke `${NEXT_PUBLIC_APP_URL}/order` (login) atau `/login?redirectedFrom=/order`.
- `Footer`: "© Nimia Games", link Partner Program, Privacy/Terms/Refund ke `NEXT_PUBLIC_WWW_URL` (nimiagames.com).
- Token CSS: `--nimia-maroon #2b0a1a`, `--nimia-crimson #c1124d`, `--nimia-pink #ff4d8d`, scope `.nimia-dark` (bg `#0a0407`), aksen emas khusus Creative Agent. Font Sora + Rajdhani via `next/font/google`.
- SEO: `layout.tsx` author/creator/publisher "Nimia Games"; `JsonLd.tsx` `sameAs: ["https://nimiagames.com"]`, logo `nimia-mark-hero.png`.
- Dependensi Creative Agent di luar modulnya: `app/page.tsx`, `app/creative-agent/page.tsx`, `app/api/creative-agent/route.ts`, `app/sitemap.ts`. Enum `order_flow_type` punya nilai `creative_agent` (0047), jadi order historis dari Creative Agent harus tetap terbaca di app/admin.
- Studio belum membaca tabel `portfolio`; halaman `/portfolio` studio memakai daftar video statis (`ticker-*`, `showcase-*`) lewat proxy `/api/video` + kartu game Lifetopia World & LemmiRun.

## 6. Order, penawaran, cicilan, invoice, pembayaran (skema aktual)

### Tabel dan status
- `orders` (0003 + 0013 + 0036 + 0038): `budget text`, `description`, `proposed_price_usd`, `final_price_usd`, `normal_price_usd`, kolom `payment_*` (network, token, wallet, expected_amount, tx_hash, submitted_at, verified_by/at, underpaid_note), `order_flow_type` (`project_builder|package|custom|creative_agent`), `payment_method` (`full_payment|installments`), `payment_plan` (`none|two_milestones|three_milestones|custom`), `package_name`, `discord_thread_id`.
- `order_status`: `pending_review`, `quotation_sent`, `rejected`, `converted`, `negotiating`, `awaiting_payment`, `payment_submitted`, `paid`.
- `order_negotiations` (0013): setiap tawaran (`proposed_by client|staff`, `amount_usd`, `message`, `created_at`). Riwayat tidak ditimpa.
- `order_installments` (0038): per termin `sequence`, `label`, `percentage`, `amount_usd`, `status` (`scheduled|pending_payment|payment_submitted|paid|overdue|cancelled`), kolom pembayaran sendiri. **Tidak ada kolom jatuh tempo.**
- `installment_settings` (0051): fee `fee_percentage_two_milestones` default 20, `fee_percentage_three_milestones` default 30 (admin bisa ubah). Split 60/40 dan 40/30/30. `derive_order_normal_price` menghitung balik harga sebelum fee untuk komisi partner.
- `order_receipts` (0024 + 0044): satu baris per termin (unique `installment_id`) atau satu per order legacy (partial unique). Nomor `next_document_number('RCT')`. Dibuat oleh trigger saat status berubah ke `paid` dengan `on conflict do nothing` — **idempoten di level DB**.
- `get_order_payment_summary(order_id)` (0043): total, paid, remaining, status `unpaid|partially_paid|paid|overdue` (overdue belum pernah diset) — dihitung dari termin berstatus `paid`.
- Tabel lama `invoices/invoice_items/payments/receipts` **sudah di-drop** (0044). Tidak ada entitas "invoice" bernomor; halaman "Invoices" klien dan admin sebenarnya menampilkan daftar receipt.
- `payment_wallets` per network (`ethereum, bsc, tron, solana, cardano, ton`), alamat dari DB, bukan dari klien.

### Alur aktual
1. Klien membuat order lewat wizard (`apps/app`) dengan intent submit atau negotiate (`proposed_price_usd` = tawaran awal klien). Juga bisa dari Creative Agent (studio) dan Mini App.
2. Nego: klien insert `order_negotiations` (RLS), admin `sendCounterOfferAction`. Klien menerima lewat RPC `accept_negotiation_offer(order_id)` → `awaiting_payment` + `final_price_usd` = **tawaran staff terbaru** (tanpa id/versi).
3. Admin juga bisa `sendQuotationForPaymentAction` dari `quotation_sent` langsung ke `awaiting_payment` dengan harga final, tanpa persetujuan klien di sistem.
4. Masuk `awaiting_payment` → trigger `materialize_order_installments` membuat baris termin.
5. Klien submit tx hash lewat RPC `submit_payment_transaction` / `submit_installment_payment` (stablecoin 1:1; native dari kurs CoinGecko yang dikirim server action). Status → `payment_submitted`. Tidak dianggap lunas.
6. Admin `verifyPaymentAction` / `verifyInstallmentPaymentAction` → `paid` → trigger receipt, project otomatis (0029/0045), reward partner; email Resend + notifikasi Discord dari server action.
7. PDF receipt dirender on-demand oleh `/api/orders/[id]/receipt` (app & admin) memakai `@nimia/pdf`, berisi total proyek, dibayar, sisa.

### Yang bisa dipakai ulang
Receipt per pembayaran (idempoten), payment summary (total/paid/remaining/status), cicilan + fee + materialisasi termin, RPC submit tx hash yang mengambil wallet dari server, verifikasi manual admin, riwayat negosiasi, notifikasi in-app/Discord/email, auto-create project, reward partner.

### Gap terhadap alur baru
| Kebutuhan baru | Kondisi | Gap |
|---|---|---|
| Kategori utama hanya Animation & Development | Katalog 4 kategori (`animation`, `digital_assets`, `website_development`, `game_development`) di `apps/app/modules/order/data` dan enum `service_category` | Pemetaan UI 2 kategori → layanan existing tanpa mengubah data lama (Tahap 2) |
| Kebutuhan awal + anggaran, anggaran bukan harga final | `budget` (text) dan `proposed_price_usd` ada; wizard mewajibkan pilih layanan detail | Form intake ringkas (Tahap 2) |
| Telegram dengan referensi order | Business bot terhubung ke akun Telegram **pribadi** Pasha, hanya bereaksi pada frase pemicu; tidak membaca nomor order. Mini App terpisah. | Deep link berisi nomor order ke username layanan yang belum ditetapkan (Tahap 2) |
| Penawaran berversi, persetujuan basi ditolak | Persetujuan tanpa id offer; admin bisa set harga final tanpa persetujuan klien | RPC baru berbasis `offer_id`, audit persetujuan (Tahap 3) |
| Invoice utama otomatis Unpaid saat harga disetujui | Tidak ada entitas invoice; hanya receipt + summary | Invoice bernomor (INV) + PDF, dibuat sekali saat persetujuan (Tahap 3–4) |
| Konfirmasi ganda tidak menggandakan | Receipt aman; update verifikasi tidak kondisional → email/Discord bisa dobel | Update kondisional (Tahap 4) |
| Retry PDF tanpa pembayaran kedua | PDF dirender on-demand, tidak menyimpan file → retry secara alami aman | Tetap dipertahankan; tambahkan penanda status dokumen bila PDF disimpan |
| Nilai crypto diterima vs dikreditkan | Hanya `payment_expected_amount` dan `amount_usd`; tidak ada nilai aktual diterima | Perlu keputusan (lihat 01-KEPUTUSAN C3) |
| Duplicate tx hash | Tidak ada constraint | Perlu aturan per chain (Tahap 4) |
| Jatuh tempo cicilan | Tidak ada kolom | Perlu keputusan |

## 7. Telegram (yang benar-benar ada)

- Client bot + Mini App (`apps/miniapp`, `packages/telegram`, migration 0054): link akun Telegram ↔ akun website, order + estimasi, negosiasi, daftar order, partner. Env: `TELEGRAM_CLIENT_BOT_TOKEN`, `TELEGRAM_CLIENT_BOT_USERNAME`, `TELEGRAM_MINIAPP_SHORT_NAME`, `TELEGRAM_MINIAPP_URL`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WELCOME_IMAGE_URL`, `TELEGRAM_STUDIO_URL`. Deep link `t.me/<bot>/<shortname>?startapp=<payload>` sudah didukung oleh `keyboards.ts`.
- Business Sales Assistant (0055): terhubung ke akun Telegram Business **pribadi Pasha**, hanya aktif untuk frase "Hi Pasha, I'm interested in Nimia Studio...". Env `TELEGRAM_BUSINESS_BOT_TOKEN`, `TELEGRAM_BUSINESS_WEBHOOK_SECRET`. Sesuai paket, ini tidak dianggap customer service studio.
- Broadcast prospek (`TELEGRAM_BOT_TOKEN`) untuk AI Prospect Hunter.
- Website studio/app tidak punya link Telegram publik untuk klien saat ini.

## 8. Baseline pemeriksaan (container, 3 Nov 2026)

| Pemeriksaan | Hasil |
|---|---|
| `npm ci` | Lulus (596 paket) |
| `turbo run test` | validators 20/20, studio 19/19, admin 34/34, app 76/76 lulus. **miniapp dan portfolio gagal karena tidak punya file test** ("No test files found", exit 1) — kegagalan baseline, bukan regresi. |
| `tsc --noEmit` per app | studio, app, admin, www, portfolio, miniapp: 0 error |
| `next build` studio & www | Gagal di container karena `next/font/google` tidak bisa mengunduh Sora/Rajdhani (jaringan sandbox memblokir fonts.googleapis.com). Ini batas lingkungan, bukan bug kode; build perlu diverifikasi di mesin Anda atau Vercel preview. |
| Lint | Belum dijalankan |

## 9. Perbedaan briefing lama vs kode

| Briefing | Kode aktual |
|---|---|
| "Invoice dan receipt PDF per pembayaran/termin" | Hanya receipt. Tabel invoice di-drop di 0044; halaman Invoices menampilkan receipt. |
| "Deadline otomatis per termin" | Yang otomatis adalah estimasi deadline proyek (`estimate-deadline.ts`). Termin tidak punya tanggal jatuh tempo di DB. |
| Cicilan "fee bertingkat" | Benar: default 20% / 30%, nilai bisa diubah admin; nilai production belum dicek. |
| "Admin no longer determines the installment plan" (0051) | Admin masih bisa `custom` via `setOrderPaymentPlanAction` dan bisa menetapkan harga final langsung (`sendQuotationForPaymentAction`). |
| Lockup "STUDIO / NIMIA GAMES" di navbar & app | Benar, `/nimia-studio-lockup.svg` dipakai di studio navbar, app navbar, order header, sidebar, mobile drawer. |
| Commit terakhir 21 Agu 2026 | Benar (`8335535`), tanpa perubahan lokal sejak itu. |

## 10. Risiko order aktif dan pembayaran

- Tahap 1 (visual) tidak menyentuh `apps/app`, `apps/admin`, packages pembayaran, atau database → risiko order/pembayaran nol selama file di luar `apps/studio` tidak diubah. Satu-satunya titik sentuh ke alur order adalah URL CTA (`/order`, `/login`), yang dipertahankan.
- Tahap 3–4 menyentuh RPC dan trigger yang dipakai order aktif. Wajib: fungsi baru berdampingan dengan yang lama, uji di project Supabase terpisah dengan data dummy, cek order existing per status (`negotiating`, `awaiting_payment`, `payment_submitted`, termin `pending_payment`) sebelum rilis.
- Cookie lintas subdomain (`NEXT_PUBLIC_COOKIE_DOMAIN`) harus tetap utuh di middleware studio; homepage memakainya untuk `isAuthenticated`.
- Jumlah order production saat ini belum diketahui (catatan 15 Agu: kosong). Perlu dicek sebelum Tahap 3.
