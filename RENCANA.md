# Rencana: Dashboard Bantu-UMKM

Dokumen diskusi perencanaan dashboard UMKM. Masih draft, silakan beri masukan.

## Ringkasan
Dashboard internal **single-tenant** untuk satu UMKM: pencatatan stok, bahan baku, keuangan, dan pemesanan yang terintegrasi **WhatsApp Business Cloud API (Meta)** untuk terima pesanan + kirim notifikasi otomatis. Dilengkapi analitik tren penjualan & perkiraan pesanan.

## Tech Stack
- **Next.js 15 (App Router)** — full-stack, UI + API routes dalam satu proyek
- **TypeScript**
- **Prisma ORM + PostgreSQL**
- **Tailwind CSS** — styling (shadcn/ui direncanakan tapi belum diimplementasi)
- **NextAuth (credentials)** — login pemilik/staff
- **Recharts** — grafik tren & forecast (direncanakan tapi belum diimplementasi)
- **WhatsApp Cloud API** — webhook (terima) + Graph API (kirim)

## Struktur Proyek
```
Bantu-UMKM/
├─ prisma/schema.prisma
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ dashboard/
│  │  │  ├─ stok/
│  │  │  ├─ bahan-baku/
│  │  │  ├─ keuangan/
│  │  │  ├─ pesanan/
│  │  │  └─ analitik/
│  │  └─ api/
│  │     ├─ webhook/whatsapp/route.ts   # terima pesan WA
│  │     ├─ produk/  bahan/  transaksi/  pesanan/
│  ├─ lib/ (prisma.ts, whatsapp.ts, auth.ts, forecast.ts)
│  ├─ components/ (ui, tabel, form, charts)
├─ .env.example
```

## Model Data (Prisma)
- **User** — pemilik/staff (auth)
- **Produk** — nama, harga, `stok`, satuan, min-stok (alert)
- **BahanBaku** — nama, `stok`, satuan, min-stok
- **Resep** (opsional) — relasi Produk ↔ BahanBaku (pengurangan bahan saat produksi/jual)
- **Transaksi** — keuangan: tipe (pemasukan/pengeluaran), jumlah, kategori, tanggal, relasi ke Pesanan
- **Pesanan** — pelanggan, nomor WA, item (relasi PesananItem), total, status (baru/diproses/selesai/batal), sumber (manual/whatsapp)
- **PesananItem** — relasi Pesanan ↔ Produk, qty, harga
- **StokLog** — histori keluar/masuk stok (audit)
- **PembelianBahan** — catatan belanja bahan (lihat bagian mitigasi supplier)
- **Supplier** — opsional, dipakai saat volume besar

## Fitur per Modul
1. **Stok** — CRUD produk, penyesuaian stok, badge alert stok menipis, riwayat.
2. **Bahan Baku** — CRUD bahan, alert min-stok, catat pembelian (auto jadi Transaksi pengeluaran).
3. **Keuangan** — daftar transaksi, filter tanggal/kategori, ringkasan pemasukan/pengeluaran/laba, grafik.
4. **Pesanan** — daftar & detail, ubah status; saat selesai → kurangi stok + buat transaksi pemasukan.
5. **Analitik** — tren penjualan + perkiraan pesanan (lihat bagian khusus).
6. **Dashboard utama** — kartu ringkasan (omzet hari ini, pesanan baru, alert stok, tren 7 hari, perkiraan pesanan).

## Integrasi WhatsApp Cloud API
- **Terima pesanan**: endpoint `GET/POST /api/webhook/whatsapp`
  - `GET` verifikasi token (hub.challenge)
  - `POST` parsing pesan masuk → buat/append draft Pesanan berdasarkan nomor pengirim
- **Notifikasi otomatis** (`lib/whatsapp.ts` via Graph API):
  - Konfirmasi pesanan diterima
  - Update status (diproses/selesai)
  - Alert internal ke pemilik saat stok/bahan menipis
- **Env**: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`

## Modul Analitik & Prediksi

### Tren Penjualan
- **Grafik tren** (line/bar via Recharts) — omzet & jumlah pesanan per hari/minggu/bulan, filter rentang tanggal.
- **Produk terlaris** — ranking berdasarkan qty & pendapatan.
- **Perbandingan periode** — pertumbuhan vs periode sebelumnya (%).
- Sumber data: agregasi dari `Pesanan` + `PesananItem` (status selesai).

### Perkiraan Pesanan (Forecast)
- **Prediksi permintaan** per produk untuk N hari ke depan.
- Metode (bertahap, tanpa dependency berat):
  - **Moving Average** & **Weighted Moving Average** dari histori harian.
  - **Exponential Smoothing (Holt)** untuk menangkap tren.
  - Deteksi pola musiman sederhana (mis. weekend lebih ramai) bila data cukup.
- **Output**: estimasi pesanan/qty + rekomendasi restock (bandingkan forecast vs stok & bahan baku saat ini → saran jumlah produksi/beli).
- Ditampilkan sebagai kartu "Perkiraan minggu depan" + tabel per produk + garis proyeksi pada grafik tren.
- **Lib**: `lib/forecast.ts` (fungsi murni, bisa di-unit test).
- **Catatan**: kualitas forecast bergantung jumlah histori. Awal pakai Moving Average, naik ke Exponential Smoothing setelah data ~4–8 minggu.
- **[DISKUSI]** Mulai dari Moving Average saja, atau langsung sertakan Exponential Smoothing?

## Mitigasi: Belanja Sendiri → Supplier

### Prinsip
Modelkan **pembelian (procurement)** sebagai konsep inti, bukan supplier. Supplier hanya atribut opsional dari pembelian, sehingga transisi mulus tanpa migrasi struktur.

### Model Data
- **PembelianBahan**
  - `tanggal`, `bahanBakuId`, `qty`, `hargaSatuan`, `total`
  - `sumber`: enum `BELANJA_SENDIRI | SUPPLIER` (default `BELANJA_SENDIRI`)
  - `supplierId`: **nullable** (kosong saat belanja sendiri)
  - `catatan` (mis. "beli di pasar X")
  - Setiap pembelian → auto buat `Transaksi` pengeluaran + tambah `StokLog` bahan.
- **Supplier** (nullable relasi, dipakai belakangan)
  - `nama`, `kontakWA`, `alamat`, `catatan`, `aktif`
  - Menu supplier disembunyikan lewat feature flag sampai dibutuhkan.

### Tahapan Transisi (tanpa migrasi struktur)
1. **Fase awal (belanja sendiri)**: isi bahan + qty + harga. `sumber=BELANJA_SENDIRI`, `supplierId=null`. Menu Supplier tersembunyi.
2. **Fase tumbuh**: aktifkan menu Supplier (feature flag on), daftar supplier, pilih supplier saat mencatat pembelian. Data lama tetap valid.
3. **Fase besar**: riwayat harga per supplier, perbandingan harga, lead time, saran restock otomatis (dari forecast) langsung ke supplier via WhatsApp.

### Sinergi dengan modul lain
- **Forecast** → saran jumlah restock; fase awal jadi reminder belanja, fase supplier jadi draft PO.
- **WhatsApp** → fase awal: alert "waktunya belanja bahan X"; fase supplier: kirim PO ke WA supplier.
- **Keuangan** → laporan pengeluaran bahan difilter per `sumber`/supplier.

### Keuntungan
- Nol migrasi struktural saat scale-up (kolom sudah nullable sejak awal).
- Data historis konsisten dari hari pertama.
- Aktivasi bertahap lewat feature flag.

### [DISKUSI] Feature flag supplier vs selalu tampil sejak awal?

> **Keputusan (2026-07-20):** Supplier **DITUNDA ke v2** ("biarkan dulu"). Model `Supplier` + field `supplierId` di `PembelianBahan` + flag `config.supplierEnabled` tetap ada di schema, tapi **belum** dibuat endpoint `/api/supplier` maupun UI. Tidak dihapus agar tidak ada migrasi struktural; diaktifkan bertahap saat v2. Lihat `docs/CHANGELOG.md` & `docs/audit-keamanan.md` (P2).

## Langkah Implementasi
1. Scaffold Next.js + TS + Tailwind di `Bantu-UMKM`.
2. Setup Prisma + koneksi PostgreSQL + `schema.prisma` (semua model).
3. Setup shadcn/ui + layout dashboard (sidebar navigasi).
4. Auth (NextAuth credentials + seed user pemilik).
5. Modul Stok (CRUD + StokLog + alert).
6. Modul Bahan Baku (CRUD + PembelianBahan + Supplier opsional + alert + link keuangan).
7. Modul Keuangan (transaksi + ringkasan + grafik).
8. Modul Pesanan (CRUD + alur status → stok & keuangan).
9. Integrasi WhatsApp: webhook terima + helper kirim notifikasi.
10. Modul Analitik & Forecast (tren + prediksi).
11. Seed data contoh + `.env.example` + README singkat.

## Yang Perlu Disiapkan Nanti
- PostgreSQL (lokal/Neon/Supabase) → `DATABASE_URL`
- Akun Meta for Developers + WhatsApp Business (token & phone number ID)
- URL publik (ngrok/deploy) untuk webhook WA saat testing

## Poin Diskusi Terbuka
- [ ] Forecast: Moving Average dulu, atau langsung Exponential Smoothing?
- [ ] Supplier: feature flag (tersembunyi awal) atau selalu tampul?
- [ ] Perlu modul supplier terpisah lebih detail?
- [ ] Perlu export laporan PDF/Excel?
- [ ] Perlu multi-user role (pemilik vs staff)?

## Pengembangan Selanjutnya (v2) — di luar scope v1

### Sinkronisasi Stok ke Marketplace (Multichannel)
Kebutuhan: sinkronisasi stok makanan jadi (frozen food) antar platform
e-commerce — Tokopedia, Shopee, GoFood, dll — dengan dashboard internal.

**Status:** DITUNDA ke v2. Tidak masuk v1. v1 tetap fokus WhatsApp + dashboard
internal (stok sebagai single source of truth, diisi hanya dari order manual,
WA draft, dan pembelian bahan).

**Catatan teknis (dikumpulkan saat diskusi v1):**
- Tiap platform punya API & aturan berbeda. Shopee/Tokopedia butuh approval
  merchant + partner API dengan rate limit ketat. GoFood/GrabFood lewat
  aggregator (Butler/Mixture/H2H) — tidak ada API publik terbuka untuk UMKM kecil.
- Sinkronisasi dua arah (stok ↔ order masuk) butuh penanganan race condition
  antar-platform (bukan lagi sekadar `prisma.$transaction()` lokal).
- Sebagian platform tidak punya webhook order → perlu polling berkala.
- Ini produk baru (OMS/multichannel), bukan fitur tambahan — bentrok dengan
  prinsip YAGNI v1.

**Arah yang disepakati untuk v2 (belum diputus final):**
- Mulai dari 1 platform dulu (kandidat: Shopee, API paling terbuka untuk UMKM).
- Satu arah dulu (stok turun otomatis saat order masuk + push stok ke marketplace),
  baru pertimbangkan dua arah (termasuk order masuk dari marketplace).
- Atau evaluasi pakai aggregator pihak ketiga (Jubelio, Woownesia, dll) yang
  sudah handle multichannel, sehingga dashboard cuma integrasi ke aggregator —
  lebih murah dari bikin integrasi sendiri per platform.

**Keputusan final (model, platform, satu/dua arah, aggregator vs bikin sendiri)
ditunda ke sesi perencanaan v2.**
