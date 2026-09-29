import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

async function runSeed() {
  console.log("Starting NegoStore database seed...");

  if (!connectionString) {
    console.log("No DATABASE_URL found. Skipping live database seed.");
    return;
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const warehousesData = [
      { name: "ИП Новиков", code: "novikov" },
      { name: "ООО \"ТД \"Негоциант\"", code: "negociant" },
    ];

    for (const w of warehousesData) {
      await prisma.warehouse.upsert({
        where: { code: w.code },
        update: { name: w.name, isActive: true },
        create: { name: w.name, code: w.code, isActive: true },
      });
      console.log(`Warehouse seeded: ${w.name}`);
    }

    const groupsData = [
      "Канцелярия",
      "Бытовая химия",
      "Хоз товары",
      "Мебель",
      "Инструменты",
      "Оргтехника",
      "Товары для дома",
    ];

    for (const groupName of groupsData) {
      await prisma.group.upsert({
        where: { name: groupName },
        update: {},
        create: { name: groupName },
      });
      console.log(`Group seeded: ${groupName}`);
    }

    const adminTelegramId = process.env.INITIAL_ADMIN_TELEGRAM_ID;
    if (adminTelegramId) {
      await prisma.user.upsert({
        where: { telegramId: adminTelegramId },
        update: { role: Role.ADMIN, isActive: true },
        create: {
          telegramId: adminTelegramId,
          username: "admin",
          firstName: "Администратор",
          lastName: "NegoStore",
          role: Role.ADMIN,
          isActive: true,
        },
      });
      console.log(`Admin user seeded for Telegram ID: ${adminTelegramId}`);
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error during seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
