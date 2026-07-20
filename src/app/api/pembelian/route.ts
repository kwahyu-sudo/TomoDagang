import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";
import { requireAuth, apiHandler } from "@/lib/api-helpers";
import { validatePositiveInt, validateNonNegativeInt, ValidationError } from "@/lib/validate";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const deny = await requireAuth();
  if (deny) return deny;
  const data = await prisma.pembelianBahan.findMany({
    include: { bahanBaku: true },
    orderBy: { tanggal: "desc" },
  });
  return NextResponse.json(data);
});

export const POST = apiHandler(async (req: Request) => {
  const deny = await requireAuth();
  if (deny) return deny;
  const b = await req.json();
  if (b.sumber === "SUPPLIER" && !config.supplierEnabled) {
    return new NextResponse("supplier disabled", { status: 400 });
  }
  validatePositiveInt(b.qty, "qty");
  validateNonNegativeInt(b.hargaSatuan, "hargaSatuan");
  const total = b.qty * b.hargaSatuan;
  const pb = await prisma.$transaction(async (tx) => {
    const created = await tx.pembelianBahan.create({
      data: {
        bahanBakuId: b.bahanBakuId,
        qty: b.qty,
        hargaSatuan: b.hargaSatuan,
        total,
        sumber: b.sumber ?? "BELANJA_SENDIRI",
        supplierId: b.supplierId ?? null,
        catatan: b.catatan ?? "",
      },
    });
    await tx.bahanBaku.update({ where: { id: b.bahanBakuId }, data: { stok: { increment: b.qty } } });
    await tx.stokLog.create({ data: { tipe: "BAHAN", refId: b.bahanBakuId, delta: b.qty, keterangan: "pembelian" } });
    await tx.transaksi.create({ data: { tipe: "PENGELUARAN", jumlah: total, kategori: "bahan", pembelianId: created.id } });
    return created;
  });
  return NextResponse.json(pb);
});
