# Changelog — TomoDagang

Catatan perubahan kode berdasarkan hasil audit keamanan & keandalan.

---

## 2026-07-20 — Sesi Fix Audit (P1, P3, P4, P5)

### P1 — WA Order `total = 0` ✅ FIXED
- **File:** `src/app/api/webhook/whatsapp/route.ts`
- **Masalah:** `pesanan.create` dari webhook WHATSAPP tidak menyertakan `total` → laporan keuangan order WA = Rp0 (inkonsisten dgn POST manual yang hitung `total` dari items).
- **Perubahan:** Tambah `const total = validItems.reduce((s, it) => s + it.qty * it.harga, 0);` sebelum `$transaction`, lalu set field `total` di `pesanan.create`.

### P2 — Supplier (deferred) ⏸️ TIDAK DIUBAH
- Keputusan user: "biarkan dulu" (v2).
- Model `Supplier` + field `supplierId` (`PembelianBahan`) + flag `config.supplierEnabled` tetap ada. Tidak dibuat endpoint `/api/supplier` maupun UI. Dicatat di `RENCANA.md` sebagai fitur v2.

### P3 — Rate-limiting (C4) ✅ FIXED (NEW)
- **File:** `src/middleware.ts` (BARU)
- **Perubahan:** In-memory sliding-window rate limiter per IP:
  - `/api/auth/*` → 10 req/menit
  - `/api/webhook/*` → 30 req/menit (sudah ada HMAC)
  - `/api/*` (lainnya) → 60 req/menit
  - Melebihi limit → `429` + header `retry-after`.
- **Catatan:** state in-memory (reset saat restart, per-instance). Untuk production multi-instance serius, ganti ke Redis/Upstash.

### P4 — Dead Code Cleanup ✅ FIXED
- **File:** `src/lib/validate.ts` — hapus fungsi `validateEnum` (0 usage).
- **File:** `tests/validate.test.ts` — hapus blok `describe("validateEnum")` + import `validateEnum`.
- **File:** `mockup-dashboard.html` — dihapus.

### P5 — StokLog.refId Dangling (D5) ✅ FIXED (soft-delete)
- **Keputusan:** soft-delete (lebih aman untuk audit trail, sesuai pilihan user).
- **File:** `prisma/schema.prisma` — tambah field `deletedAt DateTime?` ke model `Produk` dan `BahanBaku`.
- **File:** filter `where: { deletedAt: null }` ditambahkan ke semua read query:
  - `src/app/api/produk/route.ts` (GET list)
  - `src/app/api/bahan/route.ts` (GET list)
  - `src/app/dashboard/stok/page.tsx` (list produk)
  - `src/app/api/webhook/whatsapp/route.ts` (`findMany` + `findFirst` saat resolve produk)
- **Efek:** produk/bahan "dihapus" cukup ditandai `deletedAt`, tidak benar-benar dihapus → `StokLog.refId` tidak pernah nunjuk ID terhapus (riwayat utuh). Tidak ada cascade delete ke StokLog.
- **Prisma Client:** di-regenerate (`npx prisma generate`).
- **Perlu deploy:** migrasi DB `npx prisma migrate dev --name soft_delete_produk_bahan` (belum dijalankan di env ini — butuh koneksi DB).

### P6 — docs/audit-keamanan.md ✅ UPDATED
- Tandai C4, P1, P3, P4, D5 sebagai selesai.
- Koreksi klaim `@@check(stok >= 0)`: Prisma CLI **tidak** emit constraint tersebut ke migrasi/SQL → proteksi `stok >= 0` saat ini di application layer (validasi qty/harga + guard di route), bukan DB constraint.
- Catat Supplier dipertahankan untuk v2.

---

## Status Verifikasi
- `npx tsc --noEmit` → bersih (tanpa error).
- `npx vitest run` → **26/26 unit test pass**.
  - 5 suite `e2e/*.spec.ts` gagal dikumpulkan oleh vitest karena merupakan Playwright spec (bukan vitest) — keterbatasan config pra-ada, tidak terkait perubahan ini.

## Open / Belum Diputus
- **D2:** constraint DB `stok >= 0` — saat ini app-layer saja. Perlu keputusan: tambah raw SQL migration atau cukup app-layer?
- **Migrasi soft-delete:** jalankan saat ada koneksi DB sebelum deploy.