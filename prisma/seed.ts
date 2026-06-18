import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "tabekarys@gmail.com")
    .toLowerCase()
    .trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "TerraNovaAdmin!";
  const adminName = process.env.ADMIN_NAME || "TerraNova Moderator";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    // Make sure this account always has moderator rights.
    if (existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
      console.log(`Promoted existing user ${adminEmail} to ADMIN.`);
    } else {
      console.log(`Admin account already exists: ${adminEmail}`);
    }
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log("─".repeat(56));
    console.log("Created moderator account:");
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log("  Please sign in and change this password right away.");
    console.log("─".repeat(56));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
