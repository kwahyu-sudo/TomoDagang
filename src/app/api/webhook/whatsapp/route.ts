import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature, sendMessage } from "@/lib/whatsapp";
import { parseMessage } from "@/lib/nlp";

export const runtime = "nodejs";

const processed = new Set<string>();

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
  if (!verifySignature(raw, sig, process.env.WHATSAPP_TOKEN ?? "")) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  const body = JSON.parse(raw);
  const entry = body.entry?.[0];
  const msg = entry?.changes?.[0]?.value?.messages?.[0];
  if (msg && msg.type === "text") {
    if (processed.has(msg.id)) return new NextResponse("ok");
    processed.add(msg.id);

    const products = await prisma.produk.findMany({ select: { nama: true } });
    const parsed = parseMessage(msg.text.body, products);
    if (parsed.intent === "NEW_ORDER") {
      const from = msg.from;
      const pesanan = await prisma.pesanan.create({
        data: {
          pelanggan: from,
          nomorWa: from,
          sumber: "WHATSAPP",
          needsReview: parsed.unmatched.length > 0,
          items: {
            create: await Promise.all(
              parsed.items.map(async (it) => {
                const p = await prisma.produk.findFirst({ where: { nama: it.nama } });
                return { produkId: p!.id, qty: it.qty, harga: p!.harga };
              })
            ),
          },
        },
        include: { items: true },
      });
      await sendMessage(from, "Pesanan kamu kami terima & sedang direview. Terima kasih!");
      return new NextResponse(JSON.stringify({ ok: true, id: pesanan.id }));
    }
    await sendMessage(msg.from, "Halo! Ketik PESAN <nama produk> <jumlah> untuk order.");
  }
  return new NextResponse("ok");
}
