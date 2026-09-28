import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial warehouse accounting data...');

  // 1. Warehouses
  const warehouse1 = await prisma.warehouse.upsert({
    where: { name: 'ИП Новиков' },
    update: {},
    create: {
      name: 'ИП Новиков',
      code: 'NOV',
      description: 'Центральный оптовый склад ИП Новиков',
      address: 'г. Москва, складской комплекс Южные Ворота, сектор Б',
    },
  });

  const warehouse2 = await prisma.warehouse.upsert({
    where: { name: 'ООО "ТД "Негоциант"' },
    update: {},
    create: {
      name: 'ООО "ТД "Негоциант"',
      code: 'NEG',
      description: 'Основной распределительный центр ООО "ТД "Негоциант"',
      address: 'г. Санкт-Петербург, Индустриальный проспект, д. 44',
    },
  });

  console.log(`Warehouses seeded: [${warehouse1.name}, ${warehouse2.name}]`);

  // 2. Groups
  const defaultGroups = [
    'Канцелярия',
    'Бытовая химия',
    'Хоз товары',
    'Мебель',
    'Инструменты',
    'Оргтехника',
    'Товары для дома',
  ];

  for (const groupName of defaultGroups) {
    await prisma.group.upsert({
      where: { name: groupName },
      update: {},
      create: {
        name: groupName,
        description: `Категория товаров: ${groupName}`,
      },
    });
  }
  console.log(`Groups seeded (${defaultGroups.length} groups)`);

  // 3. Default Demo Clients / Suppliers
  const defaultClients = [
    { name: 'ООО "Ромашка"', inn: '7701234567', phone: '+7 (495) 123-45-67', address: 'г. Москва, ул. Ленина, д. 10' },
    { name: 'ИП Смирнов А.В.', inn: '781987654321', phone: '+7 (812) 987-65-43', address: 'г. Санкт-Петербург, Лиговский пр., 15' },
    { name: 'ООО "Поставщик-Трейд"', inn: '5001928374', phone: '+7 (495) 555-12-34', address: 'МО, г. Подольск, Заводская 3' },
    { name: 'ЗАО "ОфисМаркет"', inn: '7723456789', phone: '+7 (495) 777-88-99', address: 'г. Москва, шоссе Энтузиастов 28' },
  ];

  for (const client of defaultClients) {
    await prisma.client.upsert({
      where: { name: client.name },
      update: {},
      create: client,
    });
  }
  console.log(`Clients seeded (${defaultClients.length} clients)`);

  // 4. Default Admin User (for immediate work / local test login)
  const adminUser = await prisma.user.upsert({
    where: { telegramId: 'admin_demo_id' },
    update: {},
    create: {
      telegramId: '454135208',
      username: 'ITVash',
      firstName: 'Иван',
      lastName: 'Полищук',
      role: 'ADMIN',
      isBlocked: false,
    },
  });

  // Assign admin access to both warehouses
  await prisma.userWarehouse.upsert({
    where: {
      userId_warehouseId: {
        userId: adminUser.id,
        warehouseId: warehouse1.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      warehouseId: warehouse1.id,
    },
  });

  await prisma.userWarehouse.upsert({
    where: {
      userId_warehouseId: {
        userId: adminUser.id,
        warehouseId: warehouse2.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      warehouseId: warehouse2.id,
    },
  });

  console.log('Admin user initialized with access to all warehouses.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
