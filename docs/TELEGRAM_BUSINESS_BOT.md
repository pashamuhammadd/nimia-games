# Nimia Studio × Telegram Business — Sales Assistant Architecture

Status: analysis + proposal, belum ada kode. Disusun 20 Agustus 2026 berdasarkan
audit langsung ke monorepo `nimia-games` + riset dokumentasi resmi Telegram Bot API
untuk Business Connections (bukan asumsi — lihat sumber di §2).

**Ini FITUR YANG BERBEDA dari `docs/TELEGRAM.md` dan `apps/miniapp` yang baru selesai
dibangun hari ini.** Jangan disatukan secara konsep — lihat §0.

---

## 0. Temuan penting dari audit sebelum menjawab brief

1. **Repo sudah punya DUA sistem Telegram lain, keduanya beda tujuan dari yang
   diminta sekarang:**
   - `apps/miniapp` + webhook `/api/telegram/webhook` — **Telegram Mini App**
     (dashboard client: orders/partner/services/account, 5-tab). Ini bot PUBLIK
     (`@NimiaStudioBot` atau serupa) yang siapa saja bisa `/start`. Migration
     `0054_telegram_account_linking.sql` sudah ada untuk ini. Selesai dibangun
     hari ini juga (lihat `docs/TELEGRAM.md`).
   - `packages/telegram/src/notify.ts` — AI Prospect Hunter, broadcast satu-arah ke
     1 channel internal (`TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID`). Tidak ada webhook.
   - Brief `docs/TELEGRAM.md` yang sudah ada bahkan sudah menegaskan sendiri:
     **"beda persona → beda bot Telegram, jangan disatukan"** (bot Prospect Hunter
     vs bot client-facing). Prinsip yang sama berlaku di sini: **Business Sales
     Assistant ini adalah persona KETIGA** — bukan produk publik (Mini App), bukan
     internal notifier (Prospect Hunter), tapi asisten yang membalas ATAS NAMA akun
     pribadi Telegram Pasha. Rekomendasi: **bot Telegram baru & terpisah**, dibuat
     khusus untuk ini via BotFather — jangan pakai ulang `@NimiaStudioBot` atau bot
     Prospect Hunter. Lihat §7 untuk alasan teknis tambahan.
2. **`packages/discord` tetap jadi cetak biru pola yang paling relevan** — "website
   = single source of truth, bot cuma gateway tipis tanpa proses persisten,
   verifikasi signature di server sebelum apa pun diproses, service-role client
   untuk request tanpa session, notify* yang never-throwing." Prinsip yang sama
   dipakai di sini, plus satu pola baru dari Discord yang WAJIB ditiru: **idempotency
   berdasar update id** (security requirement eksplisit di brief, poin 20).
3. **Migration terakhir adalah `0054`** — migration baru untuk fitur ini jadi
   **`0055_telegram_business_leads.sql`**.
4. **Pelajaran mahal yang relevan langsung** (dari histori Discord & Mini App): (a)
   route inbound sempat pindah app tanpa dokumentasi ter-update, jadi bug produksi
   berhari-hari sebelum ketahuan — jangan ulangi untuk Telegram; (b) tiap app di
   monorepo ini adalah Vercel project TERPISAH dengan env var independen — env var
   yang hanya di-set di satu project sudah 2x jadi sumber bug nyata (Discord).

---

## 1. Apakah arsitektur di brief sudah tepat?

**Ya, layering 6-lapis yang diminta (Telegram / Conversation / Lead Qualification /
AI / Notification / Database) sudah benar** dan konsisten dengan pola yang sudah
terbukti di proyek ini untuk Discord & Mini App — satu backend Supabase, permukaan
baru di atasnya, tanpa proses persisten baru.

Satu hal yang brief-nya sendiri **belum bisa tahu tanpa cek dokumentasi Telegram**
(makanya poin 19 brief minta cek dulu): **Telegram TIDAK PERNAH otomatis
menghentikan bot saat Pasha membalas manual.** Tidak ada event "human replied,
pause the bot" dari Telegram. Ini harus dideteksi & diimplementasikan sendiri di
webhook handler kita — lihat §5.

---

## 2. Fakta Telegram Business Bot API (resmi, diverifikasi — bukan asumsi)

Sumber: [Telegram Bot API — Business Connection](https://core.telegram.org/bots/api#business-connection),
[Connected Business Bots (resmi)](https://core.telegram.org/api/bots/connected-business-bots),
[grammY — Telegram Business](https://grammy.dev/advanced/business).

- Update baru yang masuk lewat webhook: `business_connection` (bot
  disambungkan/diputus/hak akses diubah oleh user), `business_message`,
  `edited_business_message`, `deleted_business_messages`. Update biasa
  (`message`, `callback_query`) tetap terpisah & tidak terpengaruh.
- `Message.business_connection_id` menandai pesan itu milik chat bisnis, bukan
  chat biasa dengan bot.
- **Kirim pesan atas nama akun bisnis**: cukup tambahkan parameter
  `business_connection_id` di `sendMessage` biasa (Bot API level, REST biasa —
  konsisten dengan konvensi proyek ini: `fetch` polos, tanpa SDK pihak ketiga,
  sama seperti `packages/discord` & `packages/telegram` yang sudah ada).
- **Tidak ada auto-pause dari Telegram.** Yang perlu dideteksi sendiri: pesan
  `business_message` dari `from.id` yang SAMA dengan Telegram user id Pasha sendiri
  (didapat dari update `business_connection.user.id` saat Pasha connect bot) DAN
  BUKAN echo dari `sendMessage` yang kita panggil sendiri → berarti Pasha mengetik
  langsung dari HP/desktop Telegram-nya sendiri → human takeover.
- Bot harus diaktifkan mode "connect ke akun bisnis" lewat BotFather sebelum bisa
  disambungkan (di sisi Pasha: Settings → Telegram Business → Chatbots).
  **Fitur Telegram Business di akun Pasha sendiri butuh Telegram Premium/Business
  subscription** — ini prasyarat di sisi Pasha, di luar kendali kode.
  Bot itu sendiri tidak butuh Premium untuk BISA disambungkan.
- Hanya SATU bot bisa disambungkan ke satu akun Telegram dalam satu waktu.
  Hak akses (`can_reply`, dst.) ditentukan Pasha sendiri saat connect — jangan
  asumsikan bot otomatis dapat semua hak.

---

## 3. Bot token: baru & terpisah (rekomendasi)

Bot ini akan membalas SEBAGAI Pasha di chat pribadinya — beda kelas risiko total
dari bot publik Mini App. Rekomendasi: buat bot BotFather baru khusus (misal
`@NimiaSalesBot`), env var terpisah:

```env
TELEGRAM_BUSINESS_BOT_TOKEN=
TELEGRAM_BUSINESS_WEBHOOK_SECRET=
TELEGRAM_BUSINESS_ADMIN_USER_ID=     # Telegram user id Pasha, dipakai deteksi takeover
```

(Brief menyebut `TELEGRAM_BUSINESS_CONNECTION_ID` sebagai env — sebenarnya ini
TIDAK perlu jadi env statis, karena `business_connection_id` dikirim Telegram
sendiri di tiap update & disimpan di DB saat event `business_connection` masuk,
bukan nilai tetap yang di-hardcode.)

---

## 4. Lokasi kode — 1 keputusan terbuka

Dua opsi, konsisten dengan pelajaran "satu app pemilik semua route inbound
Telegram" dari `docs/TELEGRAM.md`:

**A. Route baru di dalam `apps/miniapp`** (mis. `/api/telegram/business/webhook`),
terpisah jelas secara modul dari handler Mini App yang sudah ada.
- (+) Satu deployment Vercel Telegram, tidak nambah kelas bug "env var hanya di
  satu project" yang sudah 2x kejadian di Discord.
- (−) `apps/miniapp` secara nama/tujuan adalah utk Mini App publik — menambah
  logic sales-assistant pribadi Pasha ke situ agak mencampur concern.

**B. `apps/telegram-bot` baru**, sesuai struktur yang diminta brief §17.
- (+) Concern benar-benar terpisah, sesuai penamaan.
- (−) Vercel project ke-7, env var ke-4 tempat yang harus disinkronkan manual —
  kelas bug yang sudah pernah menyakitkan di proyek ini.

**Rekomendasi saya: opsi A** (co-locate di `apps/miniapp`, modul terpisah jelas),
tapi ini keputusan produk/DevOps yang saya serahkan ke Pasha — saya tanyakan di
akhir dokumen ini.

---

## 5. Human takeover — mekanisme konkret

Setiap `business_message` masuk, webhook handler:

1. Verifikasi `X-Telegram-Bot-Api-Secret-Token` cocok → tolak kalau tidak.
2. Cek idempotency: `update_id` sudah pernah diproses? → skip kalau ya.
3. Ambil `business_connection_id` dari message → cari lead/conversation row-nya.
4. **Kalau `message.from.id === TELEGRAM_BUSINESS_ADMIN_USER_ID`** (Pasha sendiri)
   → set `bot_status = HUMAN_ACTIVE`, `human_takeover_at = now()`, JANGAN kirim
   apa pun otomatis. Semua pesan berikutnya di conversation ini di-skip selama
   `bot_status = HUMAN_ACTIVE`.
5. **Selain itu** (dari calon klien) → lanjut ke Conversation Layer / state machine
   sesuai 21 poin brief, TAPI hanya kalau `bot_status` masih `BOT_ACTIVE` (bukan
   `HUMAN_ACTIVE`/`WAITING_FOR_HUMAN`/`COMPLETED`).
6. `resumeBot(conversationId)` (dipanggil manual oleh Pasha lewat command/tombol)
   → `bot_status = BOT_ACTIVE` lagi.

---

## 6. Database — migration `0055_telegram_business_leads.sql`

Tidak ada Supabase project baru. Satu tabel baru (di luar `clients` — ini calon
klien yang belum tentu akan pernah jadi row `clients`):

```sql
create table telegram_business_leads (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  telegram_username text,
  first_name text,
  last_name text,
  business_connection_id text not null,

  service text,                    -- animation | game_dev | web_dev | ai_bot | custom | other
  service_subtype text,            -- meme_animation | gif | other (khusus animation)
  project_description text,
  expected_budget text,

  status text not null default 'new',        -- lead pipeline: new/qualified/won/lost
  bot_status text not null default 'BOT_ACTIVE',
  -- BOT_ACTIVE | HUMAN_ACTIVE | WAITING_FOR_HUMAN | COMPLETED
  conversation_step text,          -- state machine internal (welcome/animation_type/awaiting_budget/dst.)

  source text default 'telegram_business',
  last_message text,
  human_takeover_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index on telegram_business_leads (telegram_user_id, business_connection_id);

-- idempotency guard
create table telegram_business_processed_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);

-- RLS: admin/founder-only (pola is_admin() yang sudah ada di proyek ini),
-- tidak ada akses client sama sekali (ini prospek, bukan klien terdaftar).
```

---

## 7. Conversation Layer — pemetaan flow ke state machine

`conversation_step` per lead: `menu` → (`animation_menu` → `awaiting_brief`) |
`awaiting_brief` (langsung utk Game/Web/AI/Custom/TellMeMore) → `awaiting_budget`
(hanya kalau budget tidak terdeteksi di pesan pertama) → `completed`.

Deteksi budget dari free-text: regex sederhana (`$`, `USD`, angka + kata
"budget"/"around"/"sekitar") — cukup untuk MVP, tidak perlu NLP/AI dulu (fondasi AI
Layer disiapkan tapi TIDAK diaktifkan di v1, sesuai brief poin 10 "menyediakan
fondasi", bukan "AI harus aktif sekarang").

Setiap balasan bot WAJIB menutup dengan disclaimer italic (poin 15 brief) — taruh
sebagai satu helper `withDisclaimer(text, variant)` di `packages/telegram`, dipakai
oleh SEMUA pesan Business Assistant supaya tidak ada satu pun titik yang lupa
menambahkannya.

---

## 8. Notification ke Pasha

Saat lead lengkap (brief + budget) → kirim notifikasi **sebagai bot BIASA** (bukan
lewat `business_connection_id`) ke chat pribadi Pasha dengan bot ini — supaya tidak
nyasar masuk ke thread chat calon klien. Pasha otomatis sudah punya chat normal
dengan bot ini (wajib, karena itu prasyarat connect di Settings Telegram Business).
Tombol inline: `👤 Open Chat` (deep link `tg://user?id=<telegram_user_id>` atau
`https://t.me/<username>`), `⏸ Pause Bot`, `▶️ Resume Bot` — dua terakhir memanggil
`pauseBot()`/`resumeBot()` lewat callback_query di webhook yang sama (diverifikasi
`from.id === TELEGRAM_BUSINESS_ADMIN_USER_ID` sebelum eksekusi — poin 20 brief:
"hanya Pasha/admin yang dapat melakukan human takeover").

---

## 9. Struktur folder yang diusulkan

```
apps/miniapp/                      # jika opsi A (§4) dipilih
  app/api/telegram/business/
    webhook/route.ts               # SEMUA update business_* + callback_query admin

packages/telegram/
  src/
    business/
      config.ts                   # TELEGRAM_BUSINESS_BOT_TOKEN dst.
      rest.ts                     # sendMessage dgn business_connection_id, answerCallbackQuery
      keyboards.ts                # menu utama, animation submenu, admin action buttons
      messages.ts                 # copywriting per state (English, sesuai brief §1-9)
      conversation.service.ts     # state machine (Conversation Layer)
      lead.service.ts             # simpan/update telegram_business_leads (Leads Layer)
      lead.parser.ts              # deteksi budget dari free text
      notify.service.ts           # notifyNewLead() ke Pasha (Notification Layer)
      ai.service.ts                # STUB kosong utk AI Agent masa depan (AI Layer, poin 10 brief)

packages/db/migrations/
  0055_telegram_business_leads.sql
```

---

## 10. Security checklist (wajib, dari poin 20 brief)

1. `X-Telegram-Bot-Api-Secret-Token` diverifikasi sebelum baris kode lain jalan.
2. `TELEGRAM_BUSINESS_BOT_TOKEN` hanya di env server-side, tidak pernah ke client.
3. Idempotency via `update_id` (§6) — cegah double-response kalau Telegram
   redeliver update yang sama.
4. Hanya `from.id === TELEGRAM_BUSINESS_ADMIN_USER_ID` yang boleh trigger human
   takeover / pause / resume — user (calon klien) tidak bisa mengubah status lead
   atau bot_status miliknya sendiri.
5. Rate-limit webhook endpoint (belum ada pola rate-limiting sama sekali di
   proyek ini — perlu ditambahkan, bisa sesederhana Vercel/Upstash rate limit,
   sama seperti yang sudah dicatat sebagai gap terbuka di `docs/TELEGRAM.md`).
6. Checklist env var per-app didokumentasikan eksplisit (pelajaran Discord).

---

## 11. Roadmap MVP

**Fase 0** — migration 0055, bot dibuat di BotFather (mode business diaktifkan),
webhook + verifikasi secret token, `business_connection` handler (simpan
`business_connection_id` + Telegram user id Pasha), `/start` dasar via chat biasa
dgn Pasha (bukan business chat) utk memastikan Pasha & bot sudah "berteman" —
prasyarat connect.

**Fase 1** — Conversation Layer penuh: welcome message + 6 tombol menu utama,
submenu Animation, flow brief+budget utk 6 kategori, deteksi budget dari
free-text, pesan completion, disclaimer di semua pesan.

**Fase 2** — Human takeover + resume: deteksi `from.id` Pasha, `bot_status`
lifecycle penuh, silent saat `HUMAN_ACTIVE`.

**Fase 3** — Lead persistence lengkap + notifikasi ke Pasha dgn tombol
Open/Pause/Resume.

**Fase 4** — AI Layer stub (interface siap, belum aktif) + dokumentasi setup
(webhook registration, env var, testing tiap conversation state).

---

## 12. Pertanyaan yang perlu dijawab Pasha sebelum saya mulai coding

1. **Lokasi kode**: opsi A (`apps/miniapp`, direkomendasikan) atau opsi B
   (`apps/telegram-bot` baru, sesuai penamaan asli brief)?
2. **Bot token**: setuju bikin bot BotFather baru & terpisah (`@NimiaSalesBot`
   atau nama lain), bukan pakai ulang bot Mini App/Prospect Hunter?
3. Mulai langsung coding Fase 0-3, atau mau saya buatkan dulu dokumen rencana
   lebih detail (mirip `docs/TELEGRAM.md`) sebelum saya sentuh kode?
