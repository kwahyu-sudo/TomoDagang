import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

test.describe("Dashboard Navigation", () => {
  test.beforeAll(async () => {
    const password = await bcrypt.hash("test1234", 10);
    await prisma.user.upsert({
      where: { email: "testowner@umkm.id" },
      update: { password },
      create: { email: "testowner@umkm.id", password },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[placeholder="Email"]', "testowner@umkm.id");
    await page.fill('input[placeholder="Password"]', "test1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should load the summary cards and navigate to all sidebar links", async ({ page }) => {
    // Check summary cards
    await expect(page.locator("text=Omzet (pemasukan)")).toBeVisible();
    await expect(page.locator("text=Pesanan Baru")).toBeVisible();
    await expect(page.locator("text=Alert Stok")).toBeVisible();

    // Navigate to Stok
    await page.click("text=Stok");
    await expect(page).toHaveURL(/\/dashboard\/stok/);
    await expect(page.locator("text=Stok Produk")).toBeVisible();

    // Navigate to Bahan Baku
    await page.click("text=Bahan Baku");
    await expect(page).toHaveURL(/\/dashboard\/bahan-baku/);
    await expect(page.locator("text=Bahan Baku")).toBeVisible();

    // Navigate to Keuangan
    await page.click("text=Keuangan");
    await expect(page).toHaveURL(/\/dashboard\/keuangan/);
    await expect(page.locator("text=Keuangan")).toBeVisible();

    // Navigate to Pesanan
    await page.click("text=Pesanan");
    await expect(page).toHaveURL(/\/dashboard\/pesanan/);
    await expect(page.locator("text=Pesanan")).toBeVisible();

    // Navigate to Analitik
    await page.click("text=Analitik");
    await expect(page).toHaveURL(/\/dashboard\/analitik/);
    await expect(page.locator("text=Analitik")).toBeVisible();
  });
});
