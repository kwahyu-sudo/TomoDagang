import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const attempts = new Map<string, { count: number; lock: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const a = attempts.get(ip);
  if (a && a.count >= 5 && Date.now() < a.lock) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 }
    );
  }
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.password) : false;
  if (!ok) {
    const cur = attempts.get(ip) ?? { count: 0, lock: 0 };
    cur.count += 1;
    if (cur.count >= 5) cur.lock = Date.now() + 15 * 60 * 1000;
    attempts.set(ip, cur);
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }
  attempts.delete(ip);
  return NextResponse.json({ ok: true });
}
