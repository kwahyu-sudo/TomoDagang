import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

test.describe("Order Flow and Stock Decrement", () => {
  let testProductId: string;

  test.beforeAll(async () => {
    const password = await bcrypt.hash("test1234", 10);
    await prisma.user.upsert({
      where: { email: "testowner@umkm.id" },
      update: { password },
      create: { email: "testowner@umkm.id", password },
    });
  });

  test.beforeEach(async ({ page }) => {
    // Clear dependencies
    await prisma.transaksi.deleteMany({});
    await prisma.pesananItem.deleteMany({});
    await prisma.pesanan.deleteMany({});
    await prisma.stokLog.deleteMany({});
    await prisma.produk.deleteMany({});

    // Seed a product with 10 stock
    const prod = await prisma.produk.create({
      data: {
        nama: "Roti Coklat E2E",
        harga: 15000,
        stok: 10,
        satuan: "pcs",
        minStok: 2,
      },
    });
    testProductId = prod.id;

    await page.goto("/login");
    await page.fill('input[placeholder="Email"]', "testowner@umkm.id");
    await page.fill('input[placeholder="Password"]', "test1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should follow full order lifecycle: create, complete via API, verify stock decrement and transaction", async ({ page, request }) => {
    // 1. Create a pesanan using POST API
    const createResponse = await request.post("/api/pesanan", {
      data: {
        pelanggan: "Candra E2E",
        nomorWa: "62899999999",
        sumber: "MANUAL",
        paid: false,
        needsReview: false,
        items: [{ produkId: testProductId, qty: 2, harga: 15000 }],
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const pesanan = await createResponse.json();
    const pesananId = pesanan.id;

    // 2. Verify on UI that the order is recorded as BARU and Belum Lunas
    await page.click("text=Pesanan");
    await expect(page).toHaveURL(/\/dashboard\/pesanan/);
    await expect(page.locator("text=Candra E2E")).toBeVisible();
    await expect(page.locator("text=BARU")).toBeVisible();
    await expect(page.locator("text=Belum")).toBeVisible(); // Belum Lunas
    await expect(page.locator("text=Rp30.000")).toBeVisible();

    // 3. Mark the order as SELESAI and Paid using PATCH API
    const patchResponse = await request.patch("/api/pesanan", {
      data: {
        id: pesananId,
        status: "SELESAI",
        paid: true,
      },
    });
    expect(patchResponse.ok()).toBeTruthy();

    // 4. Verify order status updated on page refresh
    await page.reload();
    await expect(page.locator("text=SELESAI")).toBeVisible();
    await expect(page.locator("text=Lunas")).toBeVisible();

    // 5. Verify product stock is decremented (10 - 2 = 8)
    await page.click("text=Stok");
    await expect(page).toHaveURL(/\/dashboard\/stok/);
    await expect(page.locator("text=Roti Coklat E2E")).toBeVisible();
    await expect(page.locator("text=8 pcs")).toBeVisible();

    // 6. Verify income transaction was recorded
    await page.click("text=Keuangan");
    await expect(page).toHaveURL(/\/dashboard\/keuangan/);
    await expect(page.locator("text=Pemasukan").locator("..").locator("text=Rp30.000")).toBeVisible();
    await expect(page.locator("text=Masuk")).toBeVisible();
    await expect(page.locator("text=penjualan")).toBeVisible();
  });
});
