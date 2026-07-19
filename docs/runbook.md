# Runbook Bantu-UMKM

## Ganti token WhatsApp
Edit `.env`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`.
Restart `npm run dev`.

## Backup database
`pg_dump $DATABASE_URL > backup.sql`

## Webhook error
- Pastikan URL publik (ngrok/deploy) mengarah ke `/api/webhook/whatsapp`.
- Cek log: signature invalid = token salah. Draft dobel = dedupe aktif.
- Meta timeout 20 detik — pastikan response cepat.

## Reset password owner
Jalankan script bcrypt manual atau seed ulang `seed:prod`.

## Seed
- Production: `npm run seed` (jalankan `prisma/seed.ts`)
- Demo (JANGAN di prod): `npm run seed:demo` (jalankan `prisma/seed-demo.ts`)

## Menjalankan lokal
1. `npm install` (pastikan NODE_ENV bukan production agar devDeps terinstall)
2. Isi `.env` dari `.env.example`
3. `npx prisma migrate dev` (buat tabel)
4. `npm run dev`
