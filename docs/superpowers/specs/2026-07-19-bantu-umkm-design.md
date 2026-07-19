# Spec: Dashboard Bantu-UMKM (v1)

Tanggal: 2026-07-19
Status: Disetujui (desain + mitigasi)

## 1. Ringkasan & Prinsip

Dashboard internal **single-tenant** untuk satu UMKM: pencatatan stok, bahan
baku, keuangan, pesanan, analitik tren + forecast, terintegrasi **WhatsApp
Business Cloud API (Meta)** untuk terima pesanan (draft) + notifikasi otomatis.

Prinsip v1 (YAGNI):
- **Single-user**: hanya pemilik, tanpa role/staff.
- **No export** (PDF/Excel/CSV) — ditunda.
- **Resep/BOM ditunda** — stok produk dikurangi manual saat pesanan selesai.
- **Supplier hidden** via feature flag — `PembelianBahan` tetap punya
  `sumber` enum + `supplierId` nullable sejak hari pertama (nol migrasi struktur).
- **Forecast**: hanya Moving Average / Weighted MA di `lib/forecast.ts`
  (fungsi murni). Holt/seasonality ditunda sampai histori ~4–8 minggu.
- **WA masuk**: di-parse via NLP ringan ke format pesanan baku, lalu jadi
  **draft** (konfirmasi manual, bukan auto-order).
- **Pembedaan pesan WA**: keyword trigger (jalur cepat) + intent detection
  ringan (fallback).

## 2. Tech Stack

- Next.js 15 (App Router) + TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS + shadcn/ui
- NextAuth (credentials, strategy jwt) — single user
- Recharts — grafik tren & proyeksi
- WhatsApp Cloud API — webhook (GET verify / POST receive) + Graph API (send)

## 3. Struktur Proyek

```
Bantu-UMKM/
├─ prisma/schema.prisma
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ dashboard/
│  │  │  ├─ stok/  bahan-baku/  keuangan/  pesanan/  analitik/
│  │  └─ api/
│  │     ├─ webhook/whatsapp/route.ts
│  │     └─ produk/  bahan/  transaksi/  pesanan/  pembelian/
│  ├─ lib/ (prisma.ts, whatsapp.ts, auth.ts, forecast.ts, nlp.ts, config.ts)
│  ├─ components/ (ui, tabel, form, charts)
├─ .env.example
├─ docs/runbook.md
```

## 4. Model Data (Prisma)

- **User** — single, seeded. `password` bcrypt. (no role field v1)
- **Produk** — nama, harga, `stok`, satuan, `minStok` (alert)
- **BahanBaku** — nama, `stok`, satuan, `minStok`
- **Transaksi** — tipe (PEMASUKAN/PENGELUARAN), jumlah, kategori, tanggal,
  `pesananId?`, `pembelianId?` (untuk dedupe sumber kebenaran)
- **Pesanan** — pelanggan, `nomorWa?`, total, status
  (BARU/DIPROSES/SELESAI/BATAL), sumber (MANUAL/WHATSAPP),
  `needsReview` (boolean, dari parsing ragu), `paid` (boolean — pisah dari SELESAI)
- **PesananItem** — `pesananId`, `produkId`, qty, harga
- **StokLog** — histori masuk/keluar stok (audit produk & bahan)
- **PembelianBahan** — tanggal, `bahanBakuId`, qty, `hargaSatuan`, `total`,
  `sumber` enum (BELANJA_SENDIRI|SUPPLIER), `supplierId?`, `catatan`
- **Supplier** — nama, kontakWA, alamat, catatan, aktif (menu gated by flag)

Catatan: `Resep` tidak ada di v1.

## 5. Alur Inti

### Order lifecycle (atomic)
`prisma.$transaction()`:
1. status → SELESAI
2. untuk tiap PesananItem: validasi `Produk.stok >= qty`, kurangi stok,
   tulis StokLog
3. (pemasukan hanya saat `paid=true`) buat Transaksi PEMASUKAN (`pesananId`)
4. (opsional) kirim WA notifikasi ke pelanggan

Aturan: **SELESAI ≠ LUNAS**. Field `paid` terpisah. Transaksi pemasukan hanya
dibuat saat `paid=true` (bukan saat SELESAI) untuk hindari pembukuan dobel
jika ada piutang.

### PembelianBahan (atomic)
`prisma.$transaction()`:
1. tambah `BahanBaku.stok`
2. buat Transaksi PENGELUARAN (`pembelianId`, `total = qty*hargaSatuan` dihitung di app, diverifikasi)
3. tulis StokLog bahan (masuk)

Disiplin: `catatan` (mis. "pasar X") wajib diisi sejak hari 1 agar saat
supplier diaktifkan, perbandingan harga punya histori.

### WhatsApp
- `GET /api/webhook/whatsapp`: verifikasi `hub.mode==subscribe` &
  `hub.verify_token == WHATSAPP_VERIFY_TOKEN`, balas `hub.challenge`.
- `POST`: verifikasi `X-Hub-Signature-256` (HMAC SHA256 dengan
  `WHATSAPP_TOKEN`). Dedupe by `message_id` (simpan di cache/DB processed set).
- Parse: `lib/nlp.ts` → (a) cek keyword trigger, (b) intent detection ringan
  (ada nama produk terdaftar + qty angka = NEW_ORDER, else INQUIRY/OTHER).
  NEW_ORDER → NLP ke PesananItem baku → simpan draft (status BARU,
  sumber WHATSAPP, `needsReview=true` jika ada item gagal dikenali).
  OTHER → balas panduan otomatis.
- `lib/whatsapp.ts`: kirim via Graph API. Notifikasi ke pelanggan hanya dalam
  24-jam window sejak chat terakhir (kebijakan Meta); di luar window pakai
  template approved. Alert internal ke pemilik aman (ke diri sendiri).

### Draft reminder
Dashboard menampilkan badge "N draft belum diproses" + halaman pesanan filter
`needsReview`. (Tidak ada push di luar WA — cukup reminder di dashboard.)

### Forecast (lib/forecast.ts)
- `movingAverage(history, window)`, `weightedMA(history, weights)`.
- Threshold: jika data < window, window disesuaikan / beri disclaimer
  "data terbatas".
- Output: estimasi qty per produk N hari + rekomendasi restock
  (forecast vs stok & bahan baku). Tampil sebagai kartu + tabel + garis
  proyeksi di grafik tren.
- Disclaimer UI: "perkiraan statistik, bukan jaminan" (buta terhadap hari
  besar/promo/stok habis).

## 6. Mitigasi Teknis

| Celah | Mitigasi |
|---|---|
| Webhook inject palsu | Verifikasi `X-Hub-Signature-256` di POST |
| Draft dobel (retry Meta) | Dedupe by `message_id` |
| Logika append vs baru ambigu | Tiap pesan NEW_ORDER = 1 draft baru (tidak append) |
| Order lifecycle tidak atomic | `prisma.$transaction()` |
| Stok negatif | Validasi `stok >= qty` sebelum kurangi |
| Pembelian double-write | `prisma.$transaction()` |
| `total` selisih | Hitung di app, simpan eksplisit, verifikasi |
| Forecast < window | Threshold + disclaimer |
| Rekomendasi restock buta bahan | Bandingkan forecast produk ke stok bahan (v1 sederhana) |
| NextAuth brute force | Rate-limit `/login` |
| Password plain | bcrypt |
| Session strategy | `strategy: "jwt"` |
| Prisma bocor (hot reload) | Singleton `lib/prisma.ts` |
| Prisma di edge | `export const runtime = "nodejs"` di route API |
| StokLog vs Transaksi dobel hitung | Filter laporan keuangan by `pembelianId`/`pesananId`, bukan gabung dua |
| Alert stok spam | Debounce: hanya kirim saat lintasi `minStok` ke bawah, reset saat restock |
| Env/webhook localhost | Dokumentasikan ngrok; webhook timeout 20s → parsing cepat |

## 7. Mitigasi Non-Teknis

| Celah | Mitigasi |
|---|---|
| Lockout pemilik | Mekanisme reset password aman (email/backup) |
| WA sebagai titik gagal | Dashboard input manual = fallback wajib (dokumentasikan) |
| Biaya WA conversation | Label biaya; alert internal ke pemilik bukan conversation berbayar ke lain |
| Draft buta | Badge "N draft" + filter needsReview di dashboard |
| Forecast salah interpretasi | Disclaimer + jangan auto-beli |
| SELESAI ≠ LUNAS | Field `paid` terpisah; pemasukan saat `paid=true` |
| Supplier histori kosong | `catatan` wajib sejak hari 1 |
| Privasi pelanggan | Kebijakan retensi sederhana; dukung hapus data pelanggan |
| 24h window Meta | Notifikasi ke pelanggan pakai template approved di luar window |
| Seed demo polusi produksi | `seed:demo` vs `seed:prod` terpisah + dokumentasi |
| Handover pemilik non-teknis | `docs/runbook.md` (ganti token, backup DB, webhook error) |

## 8. Langkah Implementasi

1. Scaffold Next.js 15 + TS + Tailwind; setup shadcn/ui + layout sidebar.
2. Prisma + PostgreSQL + `schema.prisma` (semua model di §4).
3. `lib/prisma.ts` singleton; `lib/config.ts` feature flag (`SUPPLIER_ENABLED`).
4. NextAuth credentials (jwt) + seed owner + reset password + rate-limit login.
5. Modul Stok (CRUD + StokLog + alert debounce).
6. Modul Bahan Baku (CRUD + PembelianBahan atomic + alert + link keuangan).
7. Modul Keuangan (transaksi + ringkasan + grafik, filter by sumber).
8. Modul Pesanan (CRUD + lifecycle atomic + `paid` + draft/needsReview).
9. WA: webhook verify+sign+dedupe, `lib/nlp.ts` (keyword+intent), `lib/whatsapp.ts` send.
10. Analitik & Forecast (`lib/forecast.ts` MA/WMA + UI proyeksi).
11. Seed demo terpisah + `.env.example` + `docs/runbook.md`.

## 9. Yang Perlu Disiapkan

- PostgreSQL → `DATABASE_URL`
- Meta for Developers: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
- URL publik (ngrok/deploy) untuk webhook testing

## 10. Perkiraan Biaya (v1, asumsi awal)

Asumsi: hosting gratis (Vercel free + Neon/Supabase free), volume WA kecil
(<50 pesan/hari), kurs USD→Rp 16.000.

| Komponen | Biaya v1 | Catatan |
|---|---|---|
| Hosting (Vercel free) | Rp0/bln | Naik ke Pro (~$20/bln) kalau butuh scale |
| Database (Neon/Supabase free) | Rp0/bln | Free tier cukup untuk 1 UMKM |
| WhatsApp Cloud API (Meta) | ~Rp0–24.000/bln | Free tier 1.000 conversation/bln; <50/hari ≈ 1.500/bln → lewat sedikit, charge ~$0.3–1.5. User-initiated conversation gratis dalam 24h window |
| Domain (opsional) | ~Rp150.000/tahun | Untuk webhook publik stabil; bisa pakai subdomain gratis dulu |
| ngrok (testing, optional) | Rp0 | Free tier cukup untuk dev webhook |
| **Total awal** | **~Rp0–24.000/bln** | Praktis gratis di MVP |

Catatan biaya yang perlu diwaspadai (bukan v1):
- Notifikasi ke pelanggan di luar 24h window = butuh template approved yang
  dikenakan charge conversation. Hindari kirim di luar window.
- Alert internal ke pemilik (ke diri sendiri) tidak kena charge.
- Jika volume WA naik >1.000 conversation/bln, budget Meta perlu dialokasikan
  serius (rate Asia ~$0.005–0.09 per conversation).
- Jika butuh Vercel Pro + DB berbayar, budget ~Rp350.000–500.000/bln.
