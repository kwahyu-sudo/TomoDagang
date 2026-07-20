import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const password = await bcrypt.hash("demo123", 10);
  await prisma.user.upsert({
    where: { email: "demo@umkm.id" },
    update: {},
    create: { email: "demo@umkm.id", password },
  });
  const kue = await prisma.produk.create({
    data: { nama: "Kue Lapis", harga: 15000, stok: 18, satuan: "pcs", minStok: 5 },
  });
  const gula = await prisma.bahanBaku.create({
    data: { nama: "Gula", stok: 10, satuan: "kg", minStok: 3 },
  });
  const pesanan = await prisma.pesanan.create({
    data: {
      pelanggan: "Budi",
      total: 30000,
      status: "SELESAI",
      paid: true,
      items: { create: [{ produkId: kue.id, qty: 2, harga: 15000 }] },
    },
  });
  // Transaksi pemasukan terkait pesanan
  await prisma.transaksi.create({
    data: {
      tipe: "PEMASUKAN",
      jumlah: 30000,
      kategori: "penjualan",
      pesananId: pesanan.id,
    },
  });
  // StokLog untuk pengurangan stok produk
  await prisma.stokLog.create({
    data: {
      tipe: "PRODUK",
      refId: kue.id,
      delta: -2,
      keterangan: "pesanan demo",
    },
  });
  console.log("Seeded DEMO data. JANGAN jalankan di production.");
}

main().finally(() => prisma.$disconnect());
