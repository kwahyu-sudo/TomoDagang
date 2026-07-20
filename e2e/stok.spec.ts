import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

test.describe("Product Management (Stok)", () => {
  test.beforeAll(async () => {
    const password = await bcrypt.hash("test1234", 10);
    await prisma.user.upsert({
      where: { email: "testowner@umkm.id" },
      update: { password },
      create: { email: "testowner@umkm.id", password },
    });
  });

  test.beforeEach(async ({ page }) => {
    // Clear products and related records to ensure a fresh test
    await prisma.pesananItem.deleteMany({});
    await prisma.stokLog.deleteMany({});
    await prisma.produk.deleteMany({});

    await page.goto("/login");
    await page.fill('input[placeholder="Email"]', "testowner@umkm.id");
    await page.fill('input[placeholder="Password"]', "test1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should add a new product and display it in the table", async ({ page }) => {
    await page.click("text=Stok");
    await expect(page).toHaveURL(/\/dashboard\/stok/);

    // Initial state: empty table text
    await expect(page.locator("text=Belum ada produk. Tambah lewat tombol di atas.")).toBeVisible();

    // Click add button
    await page.click("text=Tambah Produk");

    // Fill form
    await page.fill("#nama", "Kue Sus E2E");
    await page.fill("#harga", "12000");
    await page.fill("#satuan", "pcs");
    await page.fill("#stok", "15");
    await page.fill("#minStok", "5");

    // Click submit
    await page.click('button[type="submit"]:has-text("Simpan")');

    // Form should close and the new product should appear in the table
    await expect(page.locator("text=Kue Sus E2E")).toBeVisible();
    await expect(page.locator("text=15 pcs")).toBeVisible();
    await expect(page.locator("text=Stok aman")).toBeVisible();
  });

  test("should show low stock warning when stock is below minimum", async ({ page }) => {
    await page.click("text=Stok");
    await page.click("text=Tambah Produk");

    // Fill form with stock < minStok
    await page.fill("#nama", "Kopi Susu E2E");
    await page.fill("#harga", "15000");
    await page.fill("#satuan", "botol");
    await page.fill("#stok", "2");
    await page.fill("#minStok", "5");

    await page.click('button[type="submit"]:has-text("Simpan")');

    // Product should appear with Menipis badge
    await expect(page.locator("text=Kopi Susu E2E")).toBeVisible();
    await expect(page.locator("text=Menipis")).toBeVisible();
    await expect(page.locator("text=1 produk · 1 perlu restock")).toBeVisible();
  });
});
