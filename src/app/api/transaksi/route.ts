import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiHandler } from "@/lib/api-helpers";

export const runtime = "nodejs";

export const GET = apiHandler(async () => {
  const deny = await requireAuth();
  if (deny) return deny;
  const data = await prisma.transaksi.findMany({ orderBy: { tanggal: "desc" } });
  return NextResponse.json(data);
});
