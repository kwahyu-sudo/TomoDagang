# Rencana Perbaikan TomoDagang — Audit 2026-07-22

Hasil audit: konsistensi, dependensi, orphaned endpoints, security.

---

## Fase 1 🔴 — DARURAT (sebelum deploy produksi)

### 🔴 1. Bug regex NLP — template literal tidak terinterpolasi
- **Lokasi:** `src/lib/nlp.ts:48`
- **Masalah:** `const tm = t.match(/(...|${...})/i)` — pakai regex literal, `${...}` tidak diinterpolasi
- **Fix:** Ganti `/...${...}.../` jadi `new RegExp(...)`
- [x] Selesai

### 🔴 2. Filter `deletedAt: null` di dashboard home
- **Lokasi:** `src/app/dashboard/page.tsx:7`
- **Masalah:** Query produk tanpa `where: { deletedAt: null }` — produk soft-deleted ikut terhitung
- **Fix:** Tambah filter di `prisma.produk.findMany()`
- [x] Selesai

### 🔴 3. Filter `deletedAt: null` di halaman bahan-baku
- **Lokasi:** `src/app/dashboard/bahan-baku/page.tsx:6`
- **Masalah:** Sama seperti #2
- **Fix:** Tambah `where: { deletedAt: null }` di `prisma.bahanBaku.findMany()`
- [x] Selesai

### 🔴 4. Rotasi kredensial database & secret
- **Lokasi:** `.env`, `.db/db url.txt`
- **Masalah:** Password DB `npg_FvDe2IOqs3XC` terekspos; `NEXTAUTH_SECRET` terlalu lemah
- **Fix:** Rotasi password Neon, generate `openssl rand -base64 32`, update `.env`
- [x] Selesai

### 🔴 5. Tambah `WHATSAPP_APP_SECRET` ke `.env`
- **Lokasi:** `.env`
- **Masalah:** Variabel tidak ada — webhook tolak semua pesan
- **Fix:** Isi dari Meta Developers dashboard
- [x] Selesai

---

## Fase 2 🟠 — KEAMANAN

### 🟠 6. Standarisasi format respons error
- **Lokasi:** `api/pesanan/route.ts:50`, `api/pembelian/route.ts:24`, `api/webhook/whatsapp/route.ts`
- **Masalah:** Campur aduk JSON vs plain text
- **Fix:** Semua `NextResponse.json({ error: "..." }, { status: XXX })`
- [x] Selesai

### 🟠 7. Fix `sendMessage()` — cek HTTP response
- **Lokasi:** `src/lib/whatsapp.ts:16-25`
- **Masalah:** `fetch()` tanpa cek `res.ok` — error WA ditelan diam-diam
- **Fix:** `const res = await fetch(...)` + `if (!res.ok) throw new Error(...)`
- [x] Selesai

### 🟠 8. Proteksi CSRF
- **Lokasi:** Semua `api/*/route.ts` mutation endpoints
- **Masalah:** Tidak ada CSRF token
- **Opsi A:** Migrasi ke Next.js Server Actions (built-in CSRF)
- **Opsi B:** Tambah CSRF token manual
- [x] Selesai

### 🟠 9. DB constraint `CHECK (stok >= 0)`
- **Lokasi:** `prisma/schema.prisma` — model `Produk` & `BahanBaku`
- **Masalah:** Tidak ada constraint di level database, race condition bisa bikin stok minus
- **Fix:** Tambah `@@check(stok >= 0)` + migrasi SQL raw untuk data existing
- [x] Selesai

### 🟠 10. Index di foreign key & kolom filter
- **Lokasi:** `prisma/schema.prisma`
- **Butuh index:** `Pesanan.status`, `Transaksi.tipe`+`tanggal`, `Pesanan.createdAt`, semua FK
- [x] Selesai

### 🟠 11. Security headers di `next.config.ts`
- **Lokasi:** `next.config.ts`
- **Fix:** Tambah CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [x] Selesai

---

## Fase 3 🟡 — KUALITAS KODE

### 🟡 12. Ekstraksi reusable Table component
- **Masalah:** Pattern card+table yang sama diulang 6x
- **Fix:** Buat `src/components/Table.tsx` dengan header, body, empty-state
- [x] Selesai

### 🟡 13. Ekstraksi fungsi `fmt()` ke utility
- **Masalah:** `new Intl.NumberFormat("id-ID")` diulang 3x
- **Fix:** Buat `src/lib/format.ts`
- [x] Selesai

### 🟡 14. Ekstraksi SummaryCard component
- **Masalah:** Kartu ringkasan diulang 3x
- **Fix:** Buat `src/components/SummaryCard.tsx`
- [x] Selesai

### 🟡 15. Ekstraksi StokBadge component
- **Masalah:** Logic badge "Menipis"/"Stok aman" diulang 2x
- **Fix:** Buat `src/components/StokBadge.tsx`
- [x] Selesai

### 🟡 16. Ganti validasi custom dengan Zod
- **Masalah:** Validasi di `validate.ts` terlalu basic — no length/pattern/nested
- **Fix:** `npm install zod`, buat schema di `src/lib/schema.ts`, refactor validasi
- [x] Selesai

### 🟡 17. Rapikan dokumentasi
- **Masalah:** README & RENCANA.md tidak mencerminkan struktur aktual; shadcn/ui & Recharts disebut tapi belum ada
- **Fix:** Update path yang hilang, catat library yang belum diimplementasi
- [x] Selesai

### 🟡 18. Konfigurasi ESLint & Prettier
- **Fix:** `npm install -D eslint prettier eslint-config-next`, buat config file
- [x] Selesai

### 🟡 19. Hapus/tandai orphaned code
- **Lokasi:** `forecast.ts` — `weightedMA()` tidak dipakai; `api/transaksi/route.ts` — endpoint tidak dipanggil; `api/bahan/route.ts` POST — tidak ada form
- **Fix:** Hapus `weightedMA` atau beri `@deprecated`; hapus endpoint orphaned atau buat UI
- [x] Selesai

---

## Fase 4 🟢 — POLES

### 🟢 20. Ubah `StokLog.tipe` dari String jadi enum
- **Lokasi:** `prisma/schema.prisma:101`
- **Fix:** Tambah enum `TipeStokLog { PRODUK BAHAN }`
- [x] Selesai

### 🟢 21. Ubah `PembelianBahan.catatan` jadi `String?`
- **Lokasi:** `prisma/schema.prisma:117`
- [x] Selesai

### 🟢 22. Konfigurasi WhatsApp API version
- **Lokasi:** `src/lib/whatsapp.ts:16` — hardcoded `v19.0`
- **Fix:** Pindahkan ke env var atau konstanta
- [x] Selesai

### 🟢 23. Bersihkan `as any` di test mocks
- **Lokasi:** `tests/pesanan.test.ts` (4×), `tests/pembelian.test.ts` (3×)
- [x] Selesai

### 🟢 24. Konfigurasi production Next.js
- **Lokasi:** `next.config.ts` — masih kosong
- **Fix:** Tambah `images.domains`, `compression`, `logging`, dll
- [x] Selesai

### 🟢 25. Pagination di dashboard
- **Lokasi:** Semua halaman dashboard kecuali `stok/log/`
- [x] Selesai

---

## Cara Eksekusi

Fase bebas dikerjakan paralel kecuali Fase 1 wajib sebelum deploy.

Tiap checklist item partial: `[ ]` → `[x]` setelah PR/commit terkait merged.
