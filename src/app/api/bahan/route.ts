import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiHandler } from "@/lib/api-helpers";
import { validate } from "@/lib/validate";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const deny = await requireAuth();
  if (deny) return deny;
  return NextResponse.json(await prisma.bahanBaku.findMany({ orderBy: { nama: "asc" } }));
});

export const POST = apiHandler(async (req: Request) => {
  const deny = await requireAuth();
  if (deny) return deny;
  const body = validate<{ nama: string; stok: number; satuan: string; minStok: number }>(
    await req.json(),
    { nama: "string", stok: "number", satuan: "string", minStok: "number" }
  );
  return NextResponse.json(await prisma.bahanBaku.create({ data: body }));
});
