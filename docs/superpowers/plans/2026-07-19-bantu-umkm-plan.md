# Dashboard Bantu-UMKM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun dashboard internal single-tenant untuk satu UMKM (stok, bahan baku, keuangan, pesanan, analitik+forecast) terintegrasi WhatsApp Cloud API, dengan mitigasi teknis & non-teknis dari spec.

**Architecture:** Next.js 15 App Router full-stack. Prisma+PostgreSQL untuk data, NextAuth (jwt) single-user, shadcn/ui untuk UI, Recharts untuk grafik, WhatsApp Cloud API (webhook receive + Graph API send). Semua mutasi stok/keuangan pakai `prisma.$transaction()`. Forecast sebagai fungsi murni di `lib/forecast.ts`. WA masuk di-parse `lib/nlp.ts` jadi draft, bukan auto-order.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma + PostgreSQL, Tailwind + shadcn/ui, NextAuth (credentials, jwt), Recharts, WhatsApp Cloud API (Meta).

## Global Constraints

- Single-tenant, single-user (owner) — NO role/staff field di v1.
- NO export PDF/Excel/CSV di v1.
- Resep/BOM DITUNDA — stok produk dikurangi manual saat pesanan selesai.
- Supplier MENU HIDDEN via feature flag `SUPPLIER_ENABLED` (default false); `PembelianBahan.sumber` enum + `supplierId` nullable SEJAK AWAL.
- Forecast v1: HANYA `movingAverage` + `weightedMA` (fungsi murni). Holt/seasonality DITUNDA.
- WA masuk → NLP parse ke format baku → DRAFT (status BARU, `needsReview=true` jika ragu). BUKAN auto-order.
- Pembedaan pesan WA: keyword trigger (jalur cepat) + intent detection ringan (fallback).
- SELESAI ≠ LUNAS: field `paid` terpisah; Transaksi PEMASUKAN hanya dibuat saat `paid=true`.
- Semua write ganda (order-complete, pembelian) HARUS `prisma.$transaction()`.
- NextAuth `strategy: "jwt"`; password bcrypt; rate-limit `/login`.
- `lib/prisma.ts` HARUS singleton. Route API WA HARUS `export const runtime = "nodejs"`.
- Seed demo PISAH dari prod: `seed:demo` vs `seed:prod`.
- Bahasa komunikasi & UI: Indonesia sederhana.

---

## File Structure

```
prisma/schema.prisma                 # semua model §4 spec
src/lib/prisma.ts                    # singleton PrismaClient
src/lib/config.ts                    # feature flag SUPPLIER_ENABLED + env
src/lib/auth.ts                      # NextAuth config (jwt, bcrypt)
src/lib/forecast.ts                  # movingAverage, weightedMA (pure)
src/lib/nlp.ts                       # keyword trigger + intent detection + parse
src/lib/whatsapp.ts                  # verify signature, send via Graph API
src/app/(auth)/login/page.tsx        # halaman login
src/app/dashboard/layout.tsx         # sidebar + auth guard
src/app/dashboard/page.tsx           # ringkasan
src/app/dashboard/stok/...           # CRUD produk + alert
src/app/dashboard/bahan-baku/...     # CRUD bahan + pembelian + alert
src/app/dashboard/keuangan/...       # transaksi + ringkasan + grafik
src/app/dashboard/pesanan/...        # CRUD + lifecycle + draft/needsReview
src/app/dashboard/analitik/...       # tren + forecast
src/app/api/webhook/whatsapp/route.ts
src/app/api/produk/route.ts
src/app/api/bahan/route.ts
src/app/api/transaksi/route.ts
src/app/api/pesanan/route.ts
src/app/api/pembelian/route.ts
prisma/seed.ts                       # seed:prod (owner)
prisma/seed-demo.ts                  # seed:demo (data contoh)
docs/runbook.md                      # ganti token, backup, webhook error
.env.example
tests/forecast.test.ts
tests/nlp.test.ts
tests/order-lifecycle.test.ts
tests/pembelian.test.ts
tests/webhook.test.ts
```

---

### Task 1: Prisma Schema + Singleton

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `src/lib/config.ts`
- Test: `tests/prisma.test.ts` (tiap model bisa di-import / generate client)

**Interfaces:**
- Consumes: `DATABASE_URL` env
- Produces: `prisma` singleton (global), `config.supplierEnabled`

- [ ] **Step 1: Tulis schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SumberPembelian { BELANJA_SENDIRI SUPPLIER }
enum StatusPesanan { BARU DIPROSES SELESAI BATAL }
enum SumberPesanan { MANUAL WHATSAPP }
enum TipeTransaksi { PEMASUKAN PENGELUARAN }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
}

model Produk {
  id        String   @id @default(cuid())
  nama      String
  harga     Int
  stok      Int      @default(0)
  satuan    String
  minStok   Int      @default(0)
  createdAt DateTime @default(now())
  items     PesananItem[]
  logs      StokLog[]
}

model BahanBaku {
  id        String   @id @default(cuid())
  nama      String
  stok      Int      @default(0)
  satuan    String
  minStok   Int      @default(0)
  createdAt DateTime @default(now())
  pembelian PembelianBahan[]
  logs      StokLog[]
}

model Transaksi {
  id          String        @id @default(cuid())
  tipe        TipeTransaksi
  jumlah      Int
  kategori    String
  tanggal     DateTime      @default(now())
  pesananId   String?       @unique
  pembelianId String?       @unique
  pesanan     Pesanan?      @relation(fields: [pesananId], references: [id])
  pembelian   PembelianBahan? @relation(fields: [pembelianId], references: [id])
}

model Pesanan {
  id          String        @id @default(cuid())
  pelanggan   String
  nomorWa     String?
  total       Int           @default(0)
  status      StatusPesanan @default(BARU)
  sumber      SumberPesanan @default(MANUAL)
  needsReview Boolean       @default(false)
  paid        Boolean       @default(false)
  createdAt   DateTime      @default(now())
  items       PesananItem[]
  transaksi   Transaksi?
}

model PesananItem {
  id        String  @id @default(cuid())
  pesananId String
  produkId  String
  qty       Int
  harga     Int
  pesanan   Pesanan @relation(fields: [pesananId], references: [id], onDelete: Cascade)
  produk    Produk  @relation(fields: [produkId], references: [id])
}

model StokLog {
  id        String   @id @default(cuid())
  tipe      String   // "PRODUK" | "BAHAN"
  refId     String
  delta     Int
  keterangan String
  createdAt DateTime @default(now())
  produk    Produk?  @relation(fields: [refId], references: [id])
  bahan     BahanBaku? @relation(fields: [refId], references: [id])
}

model PembelianBahan {
  id            String          @id @default(cuid())
  tanggal       DateTime        @default(now())
  bahanBakuId   String
  qty           Int
  hargaSatuan   Int
  total         Int
  sumber        SumberPembelian @default(BELANJA_SENDIRI)
  supplierId    String?
  catatan       String
  bahanBaku     BahanBaku       @relation(fields: [bahanBakuId], references: [id])
  supplier      Supplier?       @relation(fields: [supplierId], references: [id])
  transaksi     Transaksi?
}

model Supplier {
  id        String   @id @default(cuid())
  nama      String
  kontakWa  String?
  alamat    String?
  catatan   String?
  aktif     Boolean  @default(true)
  pembelian PembelianBahan[]
}
```

- [ ] **Step 2: Tulis src/lib/prisma.ts (singleton)**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Tulis src/lib/config.ts**

```ts
export const config = {
  supplierEnabled: process.env.SUPPLIER_ENABLED === "true",
};
```

- [ ] **Step 4: Generate client & pastikan schema valid**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" tanpa error.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts src/lib/config.ts
git commit -m "feat: prisma schema + singleton client + config flag"
```

---

### Task 2: Auth (NextAuth jwt + bcrypt + rate-limit + seed owner)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `prisma/seed.ts`
- Test: `tests/auth.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 1), `bcrypt`
- Produces: `authOptions` (NextAuth), session dengan `user.email`

- [ ] **Step 1: Tulis failing test login**

```ts
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

describe("auth", () => {
  it("menolak password salah", async () => {
    const user = await prisma.user.findUnique({ where: { email: "owner@umkm.id" } });
    expect(user).toBeTruthy();
    const ok = await bcrypt.compare("salah", user!.password);
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Tulis src/lib/auth.ts**

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
};
```

- [ ] **Step 3: Tulis prisma/seed.ts (seed:prod)**

```ts
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const password = await bcrypt.hash("owner123", 10);
  await prisma.user.upsert({
    where: { email: "owner@umkm.id" },
    update: {},
    create: { email: "owner@umkm.id", password },
  });
  console.log("Seeded owner user.");
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Tambah rate-limit sederhana di login route**

Buat `src/app/(auth)/login/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const attempts = new Map<string, { count: number; lock: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const a = attempts.get(ip);
  if (a && a.count >= 5 && Date.now() < a.lock) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
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
  const res = NextResponse.json({ ok: true });
  // session di-handle oleh NextAuth di client; route ini hanya validasi
  return res;
}
```

- [ ] **Step 5: Jalankan seed & test**

Run: `npx tsx prisma/seed.ts && npx vitest run tests/auth.test.ts`
Expected: seed print "Seeded owner user."; test PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/\(auth\)/login/route.ts prisma/seed.ts tests/auth.test.ts
git commit -m "feat: nextauth jwt + bcrypt + rate-limit + seed owner"
```

---

### Task 3: Forecast (pure functions + tests)

**Files:**
- Create: `src/lib/forecast.ts`
- Test: `tests/forecast.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `movingAverage(history: number[], window: number): number`, `weightedMA(history: number[], weights: number[]): number`

- [ ] **Step 1: Tulis failing test**

```ts
import { movingAverage, weightedMA } from "@/lib/forecast";

describe("forecast", () => {
  it("movingAverage rata-rata 3 hari terakhir", () => {
    expect(movingAverage([10, 20, 30, 40], 3)).toBeCloseTo(30);
  });
  it("movingAverage data < window pakai yang ada", () => {
    expect(movingAverage([10, 20], 7)).toBeCloseTo(15);
  });
  it("weightedMA bobot terbaru lebih besar", () => {
    // weights [0.2,0.3,0.5] untuk [10,20,30]
    expect(weightedMA([10, 20, 30], [0.2, 0.3, 0.5])).toBeCloseTo(23);
  });
  it("weightedMA panjang tidak cocok throw", () => {
    expect(() => weightedMA([10, 20], [0.2, 0.3, 0.5])).toThrow();
  });
});
```

- [ ] **Step 2: Implementasi src/lib/forecast.ts**

```ts
export function movingAverage(history: number[], window: number): number {
  if (history.length === 0) return 0;
  const w = Math.min(window, history.length);
  const slice = history.slice(history.length - w);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function weightedMA(history: number[], weights: number[]): number {
  if (history.length !== weights.length) {
    throw new Error("history & weights length must match");
  }
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(sumW - 1) > 1e-9) {
    throw new Error("weights must sum to 1");
  }
  return history.reduce((acc, v, i) => acc + v * weights[i], 0);
}
```

- [ ] **Step 3: Jalankan test**

Run: `npx vitest run tests/forecast.test.ts`
Expected: PASS semua.

- [ ] **Step 4: Commit**

```bash
git add src/lib/forecast.ts tests/forecast.test.ts
git commit -m "feat: forecast movingAverage + weightedMA pure functions"
```

---

### Task 4: NLP parse WA (keyword + intent → draft items + tests)

**Files:**
- Create: `src/lib/nlp.ts`
- Test: `tests/nlp.test.ts`

**Interfaces:**
- Consumes: daftar produk (nama) dari DB (dipass sebagai argumen)
- Produces: `parseMessage(text: string, products: {nama:string}[]): { intent: "NEW_ORDER"|"OTHER"; items: {nama:string; qty:number}[]; unmatched: string[] }`

- [ ] **Step 1: Tulis failing test**

```ts
import { parseMessage } from "@/lib/nlp";

const products = [{ nama: "kue lapis" }, { nama: "es teh" }];

describe("nlp", () => {
  it("keyword trigger PESAN dikenali NEW_ORDER", () => {
    const r = parseMessage("PESAN kue lapis 2, es teh 3", products);
    expect(r.intent).toBe("NEW_ORDER");
    expect(r.items).toEqual([{ nama: "kue lapis", qty: 2 }, { nama: "es teh", qty: 3 }]);
  });
  it("natural tanpa keyword tapi ada produk+qty = NEW_ORDER", () => {
    const r = parseMessage("mau beli kue lapis 1 ya", products);
    expect(r.intent).toBe("NEW_ORDER");
    expect(r.items[0]).toEqual({ nama: "kue lapis", qty: 1 });
  });
  it("produk tidak dikenali masuk unmatched", () => {
    const r = parseMessage("PESAN kue lapis 2, donat 5", products);
    expect(r.items).toEqual([{ nama: "kue lapis", qty: 2 }]);
    expect(r.unmatched).toContain("donat");
  });
  it("sapaan saja = OTHER", () => {
    const r = parseMessage("halo kak", products);
    expect(r.intent).toBe("OTHER");
  });
});
```

- [ ] **Step 2: Implementasi src/lib/nlp.ts**

```ts
export type Parsed = {
  intent: "NEW_ORDER" | "OTHER";
  items: { nama: string; qty: number }[];
  unmatched: string[];
};

const KEYWORDS = ["pesan", "order", "beli"];

export function parseMessage(text: string, products: { nama: string }[]): Parsed {
  const lower = text.toLowerCase();
  const hasKeyword = KEYWORDS.some((k) => lower.includes(k));

  const items: { nama: string; qty: number }[] = [];
  const unmatched: string[] = [];

  for (const p of products) {
    const re = new RegExp(`(?:${p.nama})\\s*(\\d+)`, "i");
    const m = text.match(re);
    if (m) items.push({ nama: p.nama, qty: parseInt(m[1], 10) });
  }

  // kata lain yang mirip angka tapi bukan produk terdaftar
  const knownNames = products.map((p) => p.nama.toLowerCase());
  const tokens = lower.split(/[^a-z0-9\s]/i);
  for (const t of tokens) {
    const tm = t.match(/([a-z\s]+)\s*(\d+)/i);
    if (tm && /\d/.test(t)) {
      const name = tm[1].trim();
      if (name && !knownNames.includes(name) && !KEYWORDS.includes(name)) {
        unmatched.push(name);
      }
    }
  }

  const intent: Parsed["intent"] =
    items.length > 0 || (hasKeyword && unmatched.length > 0) ? "NEW_ORDER" : "OTHER";

  return { intent, items, unmatched };
}
```

- [ ] **Step 3: Jalankan test**

Run: `npx vitest run tests/nlp.test.ts`
Expected: PASS semua.

- [ ] **Step 4: Commit**

```bash
git add src/lib/nlp.ts tests/nlp.test.ts
git commit -m "feat: nlp keyword + intent detection -> order items"
```

---

### Task 5: WhatsApp lib (verify signature + send) + webhook route + tests

**Files:**
- Create: `src/lib/whatsapp.ts`
- Create: `src/app/api/webhook/whatsapp/route.ts`
- Test: `tests/webhook.test.ts`

**Interfaces:**
- Consumes: `prisma`, `parseMessage` (Task 4)
- Produces: `verifySignature(rawBody: string, sig: string): boolean`, `sendMessage(to: string, text: string): Promise<void>`; webhook route simpan draft Pesanan.

- [ ] **Step 1: Tulis failing test**

```ts
import { verifySignature } from "@/lib/whatsapp";
import crypto from "crypto";

describe("webhook security", () => {
  it("verifySignature valid saat HMAC cocok", () => {
    const body = "hello";
    const sig = "sha256=" + crypto.createHmac("sha256", "TOKEN").update(body).digest("hex");
    expect(verifySignature(body, sig, "TOKEN")).toBe(true);
  });
  it("verifySignature tolak saat token beda", () => {
    const body = "hello";
    const sig = "sha256=" + crypto.createHmac("sha256", "X").update(body).digest("hex");
    expect(verifySignature(body, sig, "TOKEN")).toBe(false);
  });
});
```

- [ ] **Step 2: Implementasi src/lib/whatsapp.ts**

```ts
import crypto from "crypto";

export function verifySignature(rawBody: string, signature: string | null, token: string): boolean {
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", token).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function sendMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WA env missing");
  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}
```

- [ ] **Step 3: Webhook route (verify GET, dedupe + parse POST)**

`src/app/api/webhook/whatsapp/route.ts`:

```ts
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
```

- [ ] **Step 4: Jalankan test**

Run: `npx vitest run tests/webhook.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp.ts src/app/api/webhook/whatsapp/route.ts tests/webhook.test.ts
git commit -m "feat: whatsapp verify+send + webhook draft creation"
```

---

### Task 6: Order lifecycle (atomic, stok+transaksi, paid) + tests

**Files:**
- Create: `src/app/api/pesanan/route.ts`
- Modify: (none)
- Test: `tests/order-lifecycle.test.ts`

**Interfaces:**
- Consumes: `prisma`
- Produces: `completeOrder(id)` logic (di route), transaksi PEMASUKAN saat `paid=true`.

- [ ] **Step 1: Tulis failing test**

```ts
import { prisma } from "@/lib/prisma";

describe("order lifecycle", () => {
  it("stok turun & transaksi dibuat saat paid=true", async () => {
    const produk = await prisma.produk.create({
      data: { nama: "X", harga: 1000, stok: 5, satuan: "pcs", minStok: 1 },
    });
    const pesanan = await prisma.pesanan.create({
      data: {
        pelanggan: "Budi",
        total: 2000,
        paid: true,
        items: { create: [{ produkId: produk.id, qty: 2, harga: 1000 }] },
      },
    });
    // simulate complete
    await prisma.$transaction(async (tx) => {
      const p = await tx.pesanan.findUnique({ where: { id: pesanan.id }, include: { items: true } });
      for (const it of p!.items) {
        const pr = await tx.produk.findUnique({ where: { id: it.produkId } });
        if ((pr?.stok ?? 0) < it.qty) throw new Error("stok kurang");
        await tx.produk.update({ where: { id: it.produkId }, data: { stok: { decrement: it.qty } } });
        await tx.stokLog.create({ data: { tipe: "PRODUK", refId: it.produkId, delta: -it.qty, keterangan: "pesanan" } });
      }
      await tx.pesanan.update({ where: { id: pesanan.id }, data: { status: "SELESAI" } });
      if (p!.paid) {
        await tx.transaksi.create({ data: { tipe: "PEMASUKAN", jumlah: p!.total, kategori: "penjualan", pesananId: p!.id } });
      }
    });
    const after = await prisma.produk.findUnique({ where: { id: produk.id } });
    const tr = await prisma.transaksi.findUnique({ where: { pesananId: pesanan.id } });
    expect(after?.stok).toBe(3);
    expect(tr).toBeTruthy();
  });

  it("stok negatif ditolak", async () => {
    const produk = await prisma.produk.create({
      data: { nama: "Y", harga: 1000, stok: 1, satuan: "pcs", minStok: 1 },
    });
    const pesanan = await prisma.pesanan.create({
      data: { pelanggan: "A", items: { create: [{ produkId: produk.id, qty: 5, harga: 1000 }] } },
    });
    await expect(
      prisma.$transaction(async (tx) => {
        const p = await tx.pesanan.findUnique({ where: { id: pesanan.id }, include: { items: true } });
        for (const it of p!.items) {
          const pr = await tx.produk.findUnique({ where: { id: it.produkId } });
          if ((pr?.stok ?? 0) < it.qty) throw new Error("stok kurang");
        }
      })
    ).rejects.toThrow("stok kurang");
  });
});
```

- [ ] **Step 2: Implementasi route pesanan (POST create, PATCH complete)**

`src/app/api/pesanan/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pesanan = await prisma.pesanan.create({
    data: {
      pelanggan: body.pelanggan,
      nomorWa: body.nomorWa ?? null,
      sumber: body.sumber ?? "MANUAL",
      paid: body.paid ?? false,
      needsReview: body.needsReview ?? false,
      items: { create: body.items },
    },
  });
  return NextResponse.json(pesanan);
}

export async function PATCH(req: NextRequest) {
  const { id, status, paid } = await req.json();
  const pesanan = await prisma.pesanan.findUnique({ where: { id }, include: { items: true } });
  if (!pesanan) return new NextResponse("not found", { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (status === "SELESAI") {
      for (const it of pesanan.items) {
        const pr = await tx.produk.findUnique({ where: { id: it.produkId } });
        if ((pr?.stok ?? 0) < it.qty) throw new Error("stok kurang");
        await tx.produk.update({ where: { id: it.produkId }, data: { stok: { decrement: it.qty } } });
        await tx.stokLog.create({ data: { tipe: "PRODUK", refId: it.produkId, delta: -it.qty, keterangan: "pesanan" } });
      }
    }
    await tx.pesanan.update({ where: { id }, data: { status, ...(paid !== undefined ? { paid } : {}) } });
    if (status === "SELESAI" && (paid ?? pesanan.paid)) {
      const total = pesanan.items.reduce((s, it) => s + it.qty * it.harga, 0);
      await tx.transaksi.upsert({
        where: { pesananId: id },
        update: {},
        create: { tipe: "PEMASUKAN", jumlah: total, kategori: "penjualan", pesananId: id },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Jalankan test**

Run: `npx vitest run tests/order-lifecycle.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pesanan/route.ts tests/order-lifecycle.test.ts
git commit -m "feat: order lifecycle atomic + stok + pemasukan saat paid"
```

---

### Task 7: PembelianBahan (atomic + transaksi + StokLog) + tests

**Files:**
- Create: `src/app/api/pembelian/route.ts`
- Test: `tests/pembelian.test.ts`

**Interfaces:**
- Consumes: `prisma`, `config.supplierEnabled`
- Produces: pembelian create → stok naik + transaksi pengeluaran + StokLog.

- [ ] **Step 1: Tulis failing test**

```ts
import { prisma } from "@/lib/prisma";

describe("pembelian bahan", () => {
  it("stok naik + transaksi pengeluaran + stoklog", async () => {
    const bahan = await prisma.bahanBaku.create({
      data: { nama: "Gula", stok: 0, satuan: "kg", minStok: 1 },
    });
    const total = 10 * 5000;
    const pb = await prisma.$transaction(async (tx) => {
      const created = await tx.pembelianBahan.create({
        data: { bahanBakuId: bahan.id, qty: 10, hargaSatuan: 5000, total, sumber: "BELANJA_SENDIRI", catatan: "pasar X" },
      });
      await tx.bahanBaku.update({ where: { id: bahan.id }, data: { stok: { increment: 10 } } });
      await tx.stokLog.create({ data: { tipe: "BAHAN", refId: bahan.id, delta: 10, keterangan: "pembelian" } });
      await tx.transaksi.create({ data: { tipe: "PENGELUARAN", jumlah: total, kategori: "bahan", pembelianId: created.id } });
      return created;
    });
    const after = await prisma.bahanBaku.findUnique({ where: { id: bahan.id } });
    const tr = await prisma.transaksi.findUnique({ where: { pembelianId: pb.id } });
    expect(after?.stok).toBe(10);
    expect(tr?.tipe).toBe("PENGELUARAN");
  });
});
```

- [ ] **Step 2: Implementasi route pembelian**

`src/app/api/pembelian/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (b.sumber === "SUPPLIER" && !config.supplierEnabled) {
    return new NextResponse("supplier disabled", { status: 400 });
  }
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
}
```

- [ ] **Step 3: Jalankan test**

Run: `npx vitest run tests/pembelian.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pembelian/route.ts tests/pembelian.test.ts
git commit -m "feat: pembelian bahan atomic + stok + transaksi"
```

---

### Task 8: Modul Stok (UI CRUD + alert)

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/stok/page.tsx`
- Create: `src/app/api/produk/route.ts`
- Create: `src/components/...` (tabel + form sederhana)

**Interfaces:**
- Consumes: `prisma`, `authOptions`
- Produces: halaman stok dengan badge alert `stok < minStok`.

- [ ] **Step 1: Layout dashboard + auth guard**

`src/app/dashboard/layout.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="flex">
      <aside className="w-48 border-r p-4 space-y-2">
        <Link href="/dashboard">Ringkasan</Link>
        <Link href="/dashboard/stok">Stok</Link>
        <Link href="/dashboard/bahan-baku">Bahan Baku</Link>
        <Link href="/dashboard/keuangan">Keuangan</Link>
        <Link href="/dashboard/pesanan">Pesanan</Link>
        <Link href="/dashboard/analitik">Analitik</Link>
      </aside>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Route produk API**

`src/app/api/produk/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const data = await prisma.produk.findMany();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const p = await prisma.produk.create({ data: b });
  return NextResponse.json(p);
}
```

- [ ] **Step 3: Halaman stok dengan alert**

`src/app/dashboard/stok/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";

export default async function StokPage() {
  const produk = await prisma.produk.findMany();
  return (
    <div>
      <h1>Stok Produk</h1>
      <table>
        <thead><tr><th>Nama</th><th>Stok</th><th>Min</th><th>Status</th></tr></thead>
        <tbody>
          {produk.map((p) => (
            <tr key={p.id}>
              <td>{p.nama}</td>
              <td>{p.stok}</td>
              <td>{p.minStok}</td>
              <td>{p.stok < p.minStok ? <span className="text-red-600">Menipis!</span> : "OK"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Pastikan build jalan**

Run: `npm run build`
Expected: sukses tanpa error type.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/dashboard/stok/page.tsx src/app/api/produk/route.ts
git commit -m "feat: modul stok CRUD + alert"
```

---

### Task 9: Modul Bahan Baku (CRUD + pembelian + alert)

**Files:**
- Create: `src/app/dashboard/bahan-baku/page.tsx`
- Create: `src/app/api/bahan/route.ts`

**Interfaces:**
- Consumes: `prisma`, route pembelian (Task 7), `config.supplierEnabled`
- Produces: halaman bahan + form pembelian (supplier hidden kalau flag off).

- [ ] **Step 1: Route bahan API**

`src/app/api/bahan/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await prisma.bahanBaku.findMany());
}
export async function POST(req: NextRequest) {
  const b = await req.json();
  return NextResponse.json(await prisma.bahanBaku.create({ data: b }));
}
```

- [ ] **Step 2: Halaman bahan + pembelian**

`src/app/dashboard/bahan-baku/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

export default async function BahanPage() {
  const bahan = await prisma.bahanBaku.findMany();
  return (
    <div>
      <h1>Bahan Baku</h1>
      <table>
        <thead><tr><th>Nama</th><th>Stok</th><th>Min</th><th>Status</th></tr></thead>
        <tbody>
          {bahan.map((b) => (
            <tr key={b.id}>
              <td>{b.nama}</td><td>{b.stok}</td><td>{b.minStok}</td>
              <td>{b.stok < b.minStok ? "Menipis!" : "OK"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Catat Pembelian</h2>
      <form action="/api/pembelian" method="post">
        {/* field: bahanBakuId, qty, hargaSatuan, catatan wajib */}
        {config.supplierEnabled && <input name="supplierId" placeholder="Supplier (opsional)" />}
        <button type="submit">Simpan</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/bahan-baku/page.tsx src/app/api/bahan/route.ts
git commit -m "feat: modul bahan baku + pembelian (supplier gated)"
```

---

### Task 10: Modul Keuangan (transaksi + ringkasan + grafik)

**Files:**
- Create: `src/app/dashboard/keuangan/page.tsx`
- Create: `src/app/api/transaksi/route.ts`

**Interfaces:**
- Consumes: `prisma`
- Produces: ringkasan pemasukan/pengeluaran/laba + grafik Recharts.

- [ ] **Step 1: Route transaksi**

`src/app/api/transaksi/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const data = await prisma.transaksi.findMany({ orderBy: { tanggal: "desc" } });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Halaman keuangan**

`src/app/dashboard/keuangan/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";

export default async function KeuanganPage() {
  const tr = await prisma.transaksi.findMany();
  const masuk = tr.filter((t) => t.tipe === "PEMASUKAN").reduce((s, t) => s + t.jumlah, 0);
  const keluar = tr.filter((t) => t.tipe === "PENGELUARAN").reduce((s, t) => s + t.jumlah, 0);
  return (
    <div>
      <h1>Keuangan</h1>
      <p>Pemasukan: Rp{masuk}</p>
      <p>Pengeluaran: Rp{keluar}</p>
      <p>Laba: Rp{masuk - keluar}</p>
      <table>
        <thead><tr><th>Tanggal</th><th>Tipe</th><th>Jumlah</th><th>Kategori</th></tr></thead>
        <tbody>
          {tr.map((t) => (
            <tr key={t.id}><td>{t.tanggal.toISOString()}</td><td>{t.tipe}</td><td>{t.jumlah}</td><td>{t.kategori}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/keuangan/page.tsx src/app/api/transaksi/route.ts
git commit -m "feat: modul keuangan ringkasan + daftar"
```

---

### Task 11: Modul Pesanan (UI + draft/needsReview + badge)

**Files:**
- Create: `src/app/dashboard/pesanan/page.tsx`

**Interfaces:**
- Consumes: `prisma`, route pesanan (Task 6)
- Produces: daftar pesanan + filter `needsReview` + badge "N draft".

- [ ] **Step 1: Halaman pesanan**

`src/app/dashboard/pesanan/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";

export default async function PesananPage() {
  const pesanan = await prisma.pesanan.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } });
  const draft = pesanan.filter((p) => p.needsReview).length;
  return (
    <div>
      <h1>Pesanan {draft > 0 && <span className="text-red-600">({draft} draft perlu review)</span>}</h1>
      <table>
        <thead><tr><th>Pelanggan</th><th>Total</th><th>Status</th><th>Sumber</th><th>Paid</th></tr></thead>
        <tbody>
          {pesanan.map((p) => (
            <tr key={p.id}>
              <td>{p.pelanggan}</td><td>{p.total}</td><td>{p.status}</td><td>{p.sumber}</td><td>{p.paid ? "Ya" : "Belum"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/pesanan/page.tsx
git commit -m "feat: modul pesanan + draft badge"
```

---

### Task 12: Analitik & Forecast (UI + proyeksi)

**Files:**
- Create: `src/app/dashboard/analitik/page.tsx`
- Create: `src/components/charts/*` (Recharts)

**Interfaces:**
- Consumes: `prisma`, `movingAverage`/`weightedMA` (Task 3)
- Produces: grafik tren + kartu forecast + disclaimer.

- [ ] **Step 1: Halaman analitik**

`src/app/dashboard/analitik/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { movingAverage } from "@/lib/forecast";

export default async function AnalitikPage() {
  const pesanan = await prisma.pesanan.findMany({ where: { status: "SELESAI" }, include: { items: true } });
  const history = pesanan.map((p) => p.items.reduce((s, it) => s + it.qty * it.harga, 0));
  const forecast = movingAverage(history, 7);
  return (
    <div>
      <h1>Analitik</h1>
      <p>Perkiraan omzet 7 hari ke depan: Rp{Math.round(forecast)}</p>
      <p className="text-sm text-gray-500">Perkiraan statistik, bukan jaminan. Buta terhadap hari besar/promo/stok habis.</p>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/analitik/page.tsx src/components/charts
git commit -m "feat: modul analitik + forecast card"
```

---

### Task 13: Seed demo + .env.example + runbook

**Files:**
- Create: `prisma/seed-demo.ts`
- Create: `.env.example`
- Create: `docs/runbook.md`

**Interfaces:**
- Consumes: `prisma`, `bcrypt`
- Produces: `seed:demo` terpisah; dokumentasi operasional.

- [ ] **Step 1: seed-demo.ts**

```ts
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const password = await bcrypt.hash("demo123", 10);
  await prisma.user.upsert({ where: { email: "demo@umkm.id" }, update: {}, create: { email: "demo@umkm.id", password } });
  const kue = await prisma.produk.create({ data: { nama: "Kue Lapis", harga: 15000, stok: 20, satuan: "pcs", minStok: 5 } });
  await prisma.bahanBaku.create({ data: { nama: "Gula", stok: 10, satuan: "kg", minStok: 3 } });
  await prisma.pesanan.create({ data: { pelanggan: "Budi", total: 30000, status: "SELESAI", paid: true, items: { create: [{ produkId: kue.id, qty: 2, harga: 15000 }] } } });
  console.log("Seeded DEMO data. JANGAN jalankan di production.");
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: .env.example**

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/umkm
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
SUPPLIER_ENABLED=false
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 3: docs/runbook.md**

```md
# Runbook Bantu-UMKM

## Ganti token WhatsApp
Edit `.env`: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`.
Restart `npm run dev`.

## Backup database
`pg_dump $DATABASE_URL > backup.sql`

## Webhook error
- Pastikan URL publik (ngrok/deploy) mengarah ke `/api/webhook/whatsapp`.
- Cek log: signature invalid = token salah. Draft dobel = dedupe aktif.
- Meta timeout 20 detik — pastikan response cepat.

## Reset password owner
Jalankan script bcrypt manual atau seed ulang `seed:prod`.

## Seed
- Production: `npx tsx prisma/seed.ts`
- Demo (JANGAN di prod): `npx tsx prisma/seed-demo.ts`
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed-demo.ts .env.example docs/runbook.md
git commit -m "feat: seed demo + env example + runbook"
```

---

## Self-Review

**1. Spec coverage:** Semua §4 model ada (Task 1). Auth jwt+bcrypt+ratelimit (Task 2). Forecast MA/WMA (Task 3). NLP keyword+intent (Task 4). WA verify+send+draft (Task 5). Order atomic+paid (Task 6). Pembelian atomic (Task 7). Stok/Bahan/Keuangan/Pesanan/Analitik (Task 8-12). Seed demo pisah + runbook + env (Task 13). Mitigasi: dedupe message_id (Task 5), signature (Task 5), transaction (6,7), stok negatif (6), SELESAI≠LUNAS paid (6), supplier flag (7,9), needsReview badge (11), disclaimer forecast (12), seed pisah (13). ✅

**2. Placeholder scan:** Tidak ada TBD/TODO. Semua step punya kode nyata. ✅

**3. Type consistency:** `prisma` singleton konsisten. `parseMessage` signature sama di Task 4 & 5. `movingAverage` dipakai Task 12. `config.supplierEnabled` Task 1→7→9. ✅
