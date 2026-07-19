import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const data = await prisma.transaksi.findMany({ orderBy: { tanggal: "desc" } });
  return NextResponse.json(data);
}
