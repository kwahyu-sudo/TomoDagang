import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature, sendMessage } from "@/lib/whatsapp";
import { parseMessage } from "@/lib/nlp";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifySignature(raw, sig, process.env.WHATSAPP_APP_SECRET ?? "")) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  const body = JSON.parse(raw);
  const entry = body.entry?.[0];
  const msg = entry?.changes?.[0]?.value?.messages?.[0];
  if (msg && msg.type === "text") {
    const products = await prisma.produk.findMany({ where: { deletedAt: null }, select: { id: true, nama: true, harga: true } });
    const parsed = parseMessage(msg.text.body, products.map((p) => ({ nama: p.nama })));

    if (parsed.intent === "NEW_ORDER") {
      const from = msg.from;
      // Resolusi produk harus sebelum transaksi untuk menghindari item null.
      const resolved = await Promise.all(
        parsed.items.map(async (it) => {
          const p = await prisma.produk.findFirst({ where: { nama: it.nama, deletedAt: null } });
          if (!p) return null;
          return { produkId: p.id, qty: it.qty, harga: p.harga };
        })
      );
      // Abaikan item yg produk tidak ditemukan; jika kosong, jangan buat pesanan.
      const validItems = resolved.filter((x): x is { produkId: string; qty: number; harga: number } => x !== null);
      if (validItems.length === 0) {
        try {
          await sendMessage(from, "Maaf, produk yang kamu pesan belum kami temukan.");
        } catch {
          // abaikan gagal kirim
        }
        return new NextResponse("ok");
      }

      // Atomic: dedupe (P2002) + create pesanan dalam satu transaksi.
      const total = validItems.reduce((s, it) => s + it.qty * it.harga, 0);
      try {
        await prisma.$transaction(async (tx) => {
          await tx.webhookProcessed.create({ data: { messageId: msg.id } });
          await tx.pesanan.create({
            data: {
              pelanggan: from,
              nomorWa: from,
              sumber: "WHATSAPP",
              total,
              needsReview: parsed.unmatched.length > 0 || validItems.length !== parsed.items.length,
              items: { create: validItems },
            },
          });
        });
      } catch (err: unknown) {
        // P2002 = messageId sudah diproses (dedupe aman, retry diizinkan karena belum ke-create).
        if ((err as { code?: string })?.code === "P2002") {
          return new NextResponse("ok");
        }
        throw err;
      }

      try {
        await sendMessage(from, "Pesanan kamu kami terima & sedang direview. Terima kasih!");
      } catch {
        // draft tetap tersimpan walau notifikasi gagal
      }
      return new NextResponse(JSON.stringify({ ok: true }));
    }
    try {
      await sendMessage(msg.from, "Halo! Ketik PESAN <nama produk> <jumlah> untuk order.");
    } catch {
      // abaikan gagal kirim balasan
    }
  }
  return new NextResponse("ok");
}
