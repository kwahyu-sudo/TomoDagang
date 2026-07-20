import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiHandler } from "@/lib/api-helpers";
import { validate } from "@/lib/validate";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const deny = await requireAuth();
  if (deny) return deny;
  const data = await prisma.produk.findMany({ orderBy: { nama: "asc" } });
  return NextResponse.json(data);
});

export const POST = apiHandler(async (req: Request) => {
  const deny = await requireAuth();
  if (deny) return deny;
  const body = validate<{ nama: string; harga: number; stok: number; satuan: string; minStok: number }>(
    await req.json(),
    { nama: "string", harga: "number", stok: "number", satuan: "string", minStok: "number" }
  );
  const p = await prisma.produk.create({ data: body });
  return NextResponse.json(p);
});
