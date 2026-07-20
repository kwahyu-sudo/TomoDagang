import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

test.describe("Authentication", () => {
  test.beforeAll(async () => {
    // Ensure we have a clean test user
    const password = await bcrypt.hash("test1234", 10);
    await prisma.user.upsert({
      where: { email: "testowner@umkm.id" },
      update: { password },
      create: { email: "testowner@umkm.id", password },
    });
  });

  test("should fail login with wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[placeholder="Email"]', "testowner@umkm.id");
    await page.fill('input[placeholder="Password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Email atau password salah.")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("should login successfully with correct credentials and redirect to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[placeholder="Email"]', "testowner@umkm.id");
    await page.fill('input[placeholder="Password"]', "test1234");
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=TomoDagang")).toBeVisible();
    await expect(page.locator("text=testowner@umkm.id")).toBeVisible();
  });
});
