# TomoDagang

Dashboard internal single-tenant untuk UMKM. Kelola stok, bahan baku, keuangan, pesanan, analitik tren, forecast, dan integrasi WhatsApp Business Cloud API.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Database ORM:** Prisma + PostgreSQL
- **Gaya / UI:** Tailwind CSS
- **Testing:** Vitest
- **Bahasa:** TypeScript

## Fitur Utama
1. **Stok & Produk:** CRUD stok produk, pelacakan stok menipis (alert), histori stok.
2. **Bahan Baku:** Kelola bahan baku, transaksi belanja bahan otomatis tercatat di modul keuangan.
3. **Keuangan:** Laporan pengeluaran, pemasukan, laba rugi, dan grafik performa bisnis.
4. **Pemesanan:** CRUD pesanan, integrasi otomatis mengurangi stok & mencatat keuangan.
5. **WhatsApp Integration:** Webhook terima order otomatis dan API notifikasi status pesanan serta limit stok.
6. **Analitik & Perkiraan:** Tren grafik penjualan dan perkiraan pesanan (moving average/exponential smoothing).

## Setup
### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Environment
Salin berkas `.env.example` ke `.env` dan isi variabel berikut:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/umkm
WHATSAPP_TOKEN=your_token
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
npm run seed:demo
```

### 4. Menjalankan Server Lokal
```bash
npm run dev
```

### 5. Jalankan Unit Test
```bash
npm run test
```
