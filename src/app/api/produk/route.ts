import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const data = await prisma.produk.findMany();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const b = await req.json();
  const p = await prisma.produk.create({ data: b });
  return NextResponse.json(p);
}
