import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const [, , email, password, ...nameParts] = process.argv;
  const name = nameParts.join(" ").trim() || "Admin";

  if (!email || !password) {
    console.error("Usage: tsx scripts/create-admin.ts <email> <password> [name]");
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Invalid email: ${email}`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User ${email} already exists (id=${existing.id}, role=${existing.role}).`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: Role.ADMIN,
      timezone: "UTC",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log("Created admin:");
  console.log(`  id:    ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  name:  ${user.name}`);
  console.log(`  role:  ${user.role}`);
}

main()
  .catch((err) => {
    console.error("Failed to create admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
