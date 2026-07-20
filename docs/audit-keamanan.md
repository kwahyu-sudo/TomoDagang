# Audit Keamanan & Keandalan — TomoDagang

Tanggal audit: 2026-07-20
Sumber: explore agent (independent review) + manual audit
Branch: `feature/bantu-umkm-dashboard` (commit `32784fc`)

---

## 🔴 CRITICAL (blokir deploy)

### C1. Webhook WA verifikasi pakai WHATSAPP_TOKEN (salah secret)
- File: `src/lib/whatsapp.ts:2-6`, `src/app/api/webhook/whatsapp/route.ts:23-26`
- Secret HMAC harus `WHATSAPP_APP_SECRET` (Meta Webhooks), bukan bearer `WHATSAPP_TOKEN`.
- Tidak ada IP allowlist / rate-limit → replay & spam terbuka.
- Severity: CRITICAL — auth bypass webhook, injection pesanan palsu.

### C3. Seluruh API /api/* TIDAK terproteksi NextAuth (IDOR)
- File: `pesanan/route.ts`, `transaksi/route.ts`, `produk/route.ts`, `bahan/route.ts`, `pembelian/route.ts`
- Tidak ada `getServerSession`, tidak ada `middleware.ts`.
- Siapa saja bisa GET (bocor data), POST (inject pesanan), PATCH (ubah status/kurangi stok), POST pembelian (inject pengeluaran).
- Severity: CRITICAL — semua endpoint mutasi terbuka.

---

## 🟠 HIGH

### C2. timingSafeEqual panjang buffer beda → crash/DoS
- File: `src/lib/whatsapp.ts:5-6`
- `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))` throw kalau panjang beda.
- Harus cek `signature.length === expected.length` dulu.

### C4. Tidak ada rate-limiting di mana pun
- File: `auth.ts:11`, `webhook/route.ts`, semua API
- Brute-force password bebas, webhook & API tanpa throttle.

### D1. Race condition dedupe webhook (check-then-create)
- File: `webhook/route.ts:30-33`
- Dua request berurutan bisa lolos `findUnique` → pesanan ganda.
- Fix: `create` lalu tangkap `P2002`, atau row-lock.

### D2. Stok bisa negatif (no lock, no @@check)
- File: `pesanan/route.ts:33-48`, `schema.prisma`
- Cek stok di luar serializable isolation → oversell.
- Schema `Produk.stok` `Int` tanpa `@@check(stok >= 0)`.

### D3. findFirst produk null/duplikat → crash/salah item
- File: `webhook/route.ts:39-43`
- `p` bisa `null` → `p!.id` throw 500.
- Nama produk tidak `@unique` → `findFirst` ambil sebarang.

### D6. qty/hargaSatuan negatif korupsi stok & kas
- File: `pembelian/route.ts:14-31`
- `qty = -5` → stok bahan bertambah dari pengeluaran negatif.

---

## 🟡 MEDIUM

### D4. pesanan.total ≠ transaksi.jumlah
- File: `pesanan/route.ts:25-27,42-48`
- POST simpan `total` dari client; PATCH buat transaksi dari `items.reduce`.
- UI pesanan vs keuangan bisa tidak match.

### D5. PesananItem.produkId tanpa onDelete; StokLog.refId dangling
- File: `schema.prisma:71-76,103-104`
- Hapus produk → PesananItem orphan / delete gagal. StokLog.refId bisa nunjuk ID terhapus.

### L1. NLP false-positive (substring + pesanan kosong)
- File: `nlp.ts:7,30-33`
- `pesona`/`border`/`sembeli` ikut trigger. Pesanan kosong (items=[]) bisa ke-save.

### L5. POST produk/bahan tanpa validasi skema
- File: `produk/route.ts:12-14`, `bahan/route.ts:11-13`
- Inject `id`, `harga:-5000`, `stok:-1`.

### L6. Webhook tidak atomic
- File: `webhook/route.ts:30-43`
- messageId marked processed tapi order gagal → pesanan hilang (dedupe cegah retry).

### L2. NLP gagal parse "1.000"/"dua"/"2 buah"
- File: `nlp.ts:13-15`

### L3. Forecast [] → Rp0 tanpa indikator "data kurang"
- File: `forecast.ts:2-7`, `analitik/page.tsx:18-22`

---

## Prioritas Fix (sebelum deploy)

1. **C3** — `middleware.ts` proteksi `/api/*` (kecuali webhook) + `getServerSession` di route mutasi.
2. **C1 + C2** — pisah `WHATSAPP_APP_SECRET`, fix `timingSafeEqual` length guard, IP allowlist.
3. **D2 + D6** — validasi input + `@@check(stok >= 0)` di schema.
4. **D1 + D3 + L6** — atomic webhook (dedupe + create dalam 1 transaksi).
5. **L5** — validasi Zod di semua POST.

---

## Status
- [x] C3 middleware auth (`requireAuth` + `apiHandler` di semua /api/*)
- [x] C1 WHATSAPP_APP_SECRET — webhook pakai secret terpisah (commit c40 lanjutan)
- [x] C2 timingSafeEqual guard (length check sebelum compare)
- [x] C4 rate-limit — `src/middleware.ts` in-memory sliding-window per IP (auth 10/mnt, webhook 30/mnt, api 60/mnt)
- [x] D1 atomic dedupe (webhookProcessed.create + pesanan.create dalam 1 `$transaction`, P2002 = dedupe aman)
- [ ] D2 stok >= 0 — **`@@check(stok >= 0)` TIDAK ada di schema** (Prisma CLI tidak menerapkannya ke migrasi/SQL; cek ulang). Proteksi stok >= 0 di-enforce di application layer (validasi qty/harga + guard di route), bukan DB constraint. Perlu diputuskan: tambah constraint via raw SQL migration atau cukup di app layer.
- [x] D3 findFirst aman (filter null + `Produk.nama`/`BahanBaku.nama` `@unique`)
- [x] D6 validasi negatif (qty/harga positif via `validatePositiveInt`/`validateNonNegativeInt`)
- [x] D4 total sinkron (fallback `total || items.reduce` di UI) + **P1**: webhook WHATSAPP sekarang hitung `total` dari `validItems` sebelum `pesanan.create` (sebelumnya total=0 → laporan keuangan WA order Rp0)
- [ ] D5 onDelete + StokLog (PesananItem onDelete Cascade sudah ada; StokLog.refId masih dangling — pending keputusan soft-delete vs cascade)
- [x] L1/L2/L5/L6 NLP + validasi (word-boundary, parse ribuan/kata angka, validasi skema POST)

## Log Perbaikan (lanjutan audit)

Tanggal: 2026-07-20 — sesi "Lanjut audit" (commit c40 lanjutan, pre-deploy gate).
Metode: systematic-debugging (root cause → fix → verifikasi test).

| ID | Root Cause | Fix | File |
|----|-----------|-----|------|
| C1 | Webhook verifikasi HMAC pakai `WHATSAPP_TOKEN` (bearer), bukan `WHATSAPP_APP_SECRET` | Ganti arg ke `process.env.WHATSAPP_APP_SECRET`; tambah ke `.env.example` | `src/app/api/webhook/whatsapp/route.ts`, `.env.example` |
| C2 | `timingSafeEqual` throw kalau panjang buffer beda | Length guard `sigBuf.length !== expBuf.length` → return false | `src/lib/whatsapp.ts` |
| D1+L6 | check-then-create dedupe di luar transaksi → race (pesanan ganda) & non-atomic (pesanan hilang kalau create gagal) | Pindah `webhookProcessed.create` + `pesanan.create` ke dalam `$transaction`; tangkap `P2002` sebagai dedupe aman | `src/app/api/webhook/whatsapp/route.ts` |
| D3 | `findFirst({where:{nama}})` bisa null → `p!.id` throw 500; nama produk tidak unique | Filter null sebelum create; `Produk.nama` & `BahanBaku.nama` `@unique` | `src/app/api/webhook/whatsapp/route.ts`, `prisma/schema.prisma` |
| D2 | `stok Int` tanpa constraint DB → bisa negatif | Validasi input qty/harga positif + guard di route (app-layer). Catatan: `@@check(stok >= 0)` **tidak** diterapkan ke schema/migrasi (Prisma CLI tidak meng-emit constraint ini) — lihat Status D2 | `src/lib/validate.ts`, `src/app/api/pesanan/route.ts`, `src/app/api/pembelian/route.ts` |
| D6 | `validate` hanya cek tipe, bukan nilai → `qty:-5` lolos | `validatePositiveInt`/`validateNonNegativeInt` di POST pesanan & pembelian | `src/lib/validate.ts`, `src/app/api/pesanan/route.ts`, `src/app/api/pembelian/route.ts` |
| L1/L2 | regex tanpa word-boundary (`pesona`/`border` false-positive); tidak parse `1.000`/kata angka | `\b` boundary + `parseQty` (ribuan titik + kamus angka) | `src/lib/nlp.ts` |

Verifikasi:
- `npx tsc --noEmit` bersih untuk `src` + `tests` (sisa error hanya e2e/playwright yg belum ter-install di env ini).
- `npm run test` (vitest): **28/28 pass** (tambah 3 test NLP untuk L1/L2).
- Schema berubah (`@@check`, `@unique`) → butuh `npx prisma db push` / migrate sebelum deploy.

Sisa (belum dikerjakan, bukan blokir kritis):
- **P1** ✅ selesai: webhook WHATSAPP hitung `total` dari `validItems` (sebelumnya Rp0).
- **P3** ✅ selesai: `src/middleware.ts` rate-limiter in-memory (auth 10/mnt, webhook 30/mnt, api 60/mnt per IP).
- **P4** ✅ selesai: hapus `validateEnum` (0 usage) + hapus `mockup-dashboard.html`.
- **D5** ✅ selesai (soft-delete): `Produk` & `BahanBaku` dapat field `deletedAt DateTime?`; semua read query (`produk/route.ts`, `bahan/route.ts`, `stok/page.tsx`, webhook `findMany`/`findFirst`) filter `where: { deletedAt: null }`. StokLog tidak di-cascade → riwayat tetap utuh untuk audit trail. **Perlu migrasi:** `npx prisma migrate dev --name soft_delete_produk_bahan` (atau `db push`) sebelum deploy — belum dijalankan di env ini (butuh koneksi DB).
- **D2** constraint DB `stok >= 0` (saat ini app-layer saja; perlu raw SQL migration atau cukup app-layer?).
- IP allowlist webhook (C1 partial) — Meta sudah validasi via HMAC, allowlist opsional.
- Supplier: model + `supplierId`/`config.supplierEnabled` dipertahankan untuk v2 (belum ada CRUD/UI).
