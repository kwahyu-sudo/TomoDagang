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
