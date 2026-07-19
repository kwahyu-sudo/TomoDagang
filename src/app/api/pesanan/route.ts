import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pesanan = await prisma.pesanan.create({
    data: {
      pelanggan: body.pelanggan,
      nomorWa: body.nomorWa ?? null,
      sumber: body.sumber ?? "MANUAL",
      paid: body.paid ?? false,
      needsReview: body.needsReview ?? false,
      items: { create: body.items },
    },
  });
  return NextResponse.json(pesanan);
}

export async function PATCH(req: NextRequest) {
  const { id, status, paid } = await req.json();
  const pesanan = await prisma.pesanan.findUnique({ where: { id }, include: { items: true } });
  if (!pesanan) return new NextResponse("not found", { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (status === "SELESAI") {
      for (const it of pesanan.items) {
        const pr = await tx.produk.findUnique({ where: { id: it.produkId } });
        if ((pr?.stok ?? 0) < it.qty) throw new Error("stok kurang");
        await tx.produk.update({ where: { id: it.produkId }, data: { stok: { decrement: it.qty } } });
        await tx.stokLog.create({ data: { tipe: "PRODUK", refId: it.produkId, delta: -it.qty, keterangan: "pesanan" } });
      }
    }
    await tx.pesanan.update({ where: { id }, data: { status, ...(paid !== undefined ? { paid } : {}) } });
    if (status === "SELESAI" && (paid ?? pesanan.paid)) {
      const total = pesanan.items.reduce((s, it) => s + it.qty * it.harga, 0);
      await tx.transaksi.upsert({
        where: { pesananId: id },
        update: {},
        create: { tipe: "PEMASUKAN", jumlah: total, kategori: "penjualan", pesananId: id },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
