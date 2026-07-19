import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await prisma.bahanBaku.findMany());
}
export async function POST(req: Request) {
  const b = await req.json();
  return NextResponse.json(await prisma.bahanBaku.create({ data: b }));
}
