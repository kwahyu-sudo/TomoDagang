import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

test.describe("Pembelian Bahan Baku Flow", () => {
  let testBahanId: string;

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
    await prisma.pembelianBahan.deleteMany({});
    await prisma.stokLog.deleteMany({});
    await prisma.bahanBaku.deleteMany({});

    // Seed a single test material
    const bahan = await prisma.bahanBaku.create({
      data: {
        nama: "Tepung E2E",
        stok: 10,
        satuan: "kg",
        minStok: 5,
      },
    });
    testBahanId = bahan.id;

    await page.goto("/login");
    await page.fill('input[placeholder="Email"]', "testowner@umkm.id");
    await page.fill('input[placeholder="Password"]', "test1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should record purchase, increase material stock, and create expenditure transaction", async ({ page }) => {
    await page.click("text=Bahan Baku");
    await expect(page).toHaveURL(/\/dashboard\/bahan-baku/);

    // Initial stock check
    await expect(page.locator("text=Tepung E2E")).toBeVisible();
    await expect(page.locator("text=10 kg")).toBeVisible();

    // Fill Catat Pembelian form
    await page.selectOption("#bahanBakuId", { label: "Tepung E2E" });
    await page.fill("#qty", "5");
    await page.fill("#hargaSatuan", "10000");
    await page.fill("#catatan", "Belanja bulanan tepung");

    // Submit
    await page.click('button[type="submit"]:has-text("Simpan Pembelian")');

    // Stock should increase to 15 kg
    await expect(page.locator("text=15 kg")).toBeVisible();

    // Navigate to Keuangan page
    await page.click("text=Keuangan");
    await expect(page).toHaveURL(/\/dashboard\/keuangan/);

    // Expenditure card should show Rp50.000
    await expect(page.locator("text=Pengeluaran").locator("..").locator("text=Rp50.000")).toBeVisible();

    // Transaction list should show the transaction
    await expect(page.locator("text=Keluar")).toBeVisible();
    await expect(page.locator("text=Rp50.000")).toBeVisible();
    await expect(page.locator("text=bahan")).toBeVisible();
  });
});
