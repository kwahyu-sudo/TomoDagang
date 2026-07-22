# TomoDagang

Dashboard internal single-tenant untuk UMKM. Kelola stok, bahan baku, keuangan, pesanan, analitik tren, forecast, dan integrasi WhatsApp Business Cloud API.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database ORM:** Prisma + PostgreSQL
- **Gaya / UI:** Tailwind CSS
- **Auth:** NextAuth (credentials)
- **Testing:** Vitest
- **Bahasa:** TypeScript

## Fitur Utama
1. **Stok & Produk:** CRUD stok produk, pelacakan stok menipis (alert), histori stok.
2. **Bahan Baku:** Kelola bahan baku, transaksi belanja bahan otomatis tercatat di modul keuangan.
3. **Keuangan:** Laporan pengeluaran, pemasukan, laba rugi.
4. **Pemesanan:** CRUD pesanan, integrasi otomatis mengurangi stok & mencatat keuangan.
5. **WhatsApp Integration:** Webhook terima order otomatis dan API notifikasi status pesanan.
6. **Analitik & Perkiraan:** Tren penjualan dan perkiraan pesanan (moving average/exponential smoothing).

## Setup

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Environment
Salin berkas `.env.example` ke `.env` dan isi variabel berikut:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db
WHATSAPP_TOKEN=your_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_PHONE_NUMBER_ID=your_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
SUPPLIER_ENABLED=false
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Setup Database & Seed
```bash
npx prisma db push
npx prisma generate
npm run seed          # user owner saja
npm run seed:demo     # data demo (jangan di production)
```

### 4. Menjalankan Server Lokal
```bash
npm run dev
```

### 5. Menjalankan Tes
```bash
npm run test
```

### 6. Build Production
```bash
npm run build
npm run start
```

## Struktur Proyek
```
TomoDagang/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ dashboard/
│  │  │  ├─ stok/
│  │  │  │  └─ log/
│  │  │  ├─ bahan-baku/
│  │  │  ├─ keuangan/
│  │  │  ├─ pesanan/
│  │  │  └─ analitik/
│  │  └─ api/
│  │     ├─ auth/[...nextauth]/
│  │     ├─ webhook/whatsapp/
│  │     ├─ produk/  bahan/  transaksi/  pesanan/  pembelian/
│  ├─ lib/ (prisma, whatsapp, auth, forecast, nlp, validate, config, format)
│  ├─ components/ (TambahProdukForm, CatatPembelianForm, Table, SummaryCard, StokBadge)
├─ tests/
├─ docs/ (runbook, audit-keamanan, CHANGELOG, RENCANA-PERBAIKAN)
├─ prisma/migrations/
├─ .env.example
```

## Lisensi
Private.
