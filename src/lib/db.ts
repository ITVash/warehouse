import { prisma } from "./prisma";
import {
  User,
  Warehouse,
  Group,
  Nomenclature,
  StockMovement,
  Client,
  Supplier,
  Order,
  OrderItem,
  Incoming,
  IncomingItem,
  AuditLog,
  PushSubscription,
} from "@/src/types";

class DataStore {
  warehouses: Map<string, Warehouse> = new Map();
  groups: Map<string, Group> = new Map();
  users: Map<string, User> = new Map();
  nomenclatures: Map<string, Nomenclature> = new Map();
  stockMovements: Map<string, StockMovement> = new Map();
  clients: Map<string, Client> = new Map();
  suppliers: Map<string, Supplier> = new Map();
  orders: Map<string, Order> = new Map();
  orderItems: Map<string, OrderItem> = new Map();
  incomings: Map<string, Incoming> = new Map();
  incomingItems: Map<string, IncomingItem> = new Map();
  auditLogs: Map<string, AuditLog> = new Map();
  pushSubscriptions: Map<string, PushSubscription> = new Map();

  private initialized = false;

  constructor() {
    this.initDefaults();
  }

  private initDefaults() {
    if (this.initialized) return;

    // 1. Warehouses
    const w1: Warehouse = {
      id: "w-novikov",
      name: "ИП Новиков",
      code: "novikov",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const w2: Warehouse = {
      id: "w-negociant",
      name: 'ООО "ТД "Негоциант"',
      code: "negociant",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.warehouses.set(w1.id, w1);
    this.warehouses.set(w2.id, w2);

    // 2. Groups
    const groupNames = [
      "Канцелярия",
      "Бытовая химия",
      "Хоз товары",
      "Мебель",
      "Инструменты",
      "Оргтехника",
      "Товары для дома",
    ];
    groupNames.forEach((name, idx) => {
      const g: Group = {
        id: `g-${idx + 1}`,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.groups.set(g.id, g);
    });

    // 3. Default Admin & Sample Users
    const adminId = process.env.INITIAL_ADMIN_TELEGRAM_ID || "123456789";
    const adminUser: User = {
      id: "u-admin",
      telegramId: adminId,
      username: "admin_novikov",
      firstName: "Алексей",
      lastName: "Администратор",
      photoUrl: null,
      role: "ADMIN",
      isActive: true,
      authDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(adminUser.id, adminUser);

    const managerUser: User = {
      id: "u-manager",
      telegramId: "987654321",
      username: "manager_sklad",
      firstName: "Ирина",
      lastName: "Менеджер",
      photoUrl: null,
      role: "MANAGER",
      isActive: true,
      authDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(managerUser.id, managerUser);

    const guestUser: User = {
      id: "u-guest",
      telegramId: "555111222",
      username: "guest_visitor",
      firstName: "Гость",
      lastName: "Склада",
      photoUrl: null,
      role: "GUEST",
      isActive: true,
      authDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(guestUser.id, guestUser);

    // 4. Default Clients & Suppliers
    const c1: Client = {
      id: "c-1",
      name: 'ООО "Бизнес Сервис"',
      phone: "+7 (999) 111-22-33",
      email: "contact@bizservice.ru",
      inn: "7701234567",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const c2: Client = {
      id: "c-2",
      name: 'ИП Смирнов А.В.',
      phone: "+7 (999) 444-55-66",
      email: "smirnov@mail.ru",
      inn: "500123456789",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.clients.set(c1.id, c1);
    this.clients.set(c2.id, c2);

    const s1: Supplier = {
      id: "s-1",
      name: 'ООО "ОфисСнаб"',
      inn: "7712345678",
      phone: "+7 (495) 789-01-23",
      email: "sales@officesnab.ru",
      comments: "Основной поставщик канцелярии",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const s2: Supplier = {
      id: "s-2",
      name: 'АО "ХимПром"',
      inn: "7809876543",
      phone: "+7 (812) 345-67-89",
      email: "orders@chimprom.ru",
      comments: "Поставщик бытовой химии",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.suppliers.set(s1.id, s1);
    this.suppliers.set(s2.id, s2);

    // 5. Initial Items for Novikov
    const initialNovikovItems = [
      {
        article: "NOV-001",
        barcode: "4600123456789",
        title: "Бумага офисная А4 SvetoCopy (500 листов)",
        shortTitle: "Бумага А4 SvetoCopy",
        groupId: "g-1",
        quantity: 140,
        price: 350,
      },
      {
        article: "NOV-002",
        barcode: "4600123456796",
        title: "Ручка шариковая синяя ErichKrause 0.7мм",
        shortTitle: "Ручка синяя EK",
        groupId: "g-1",
        quantity: 650,
        price: 25,
      },
      {
        article: "NOV-003",
        barcode: "4600123456802",
        title: "Средство для мытья полов Прогресс 5л",
        shortTitle: "Прогресс 5л",
        groupId: "g-2",
        quantity: 45,
        price: 420,
      },
      {
        article: "NOV-004",
        barcode: "4600123456819",
        title: "Кресло офисное Престиж черное",
        shortTitle: "Кресло Престиж",
        groupId: "g-4",
        quantity: 12,
        price: 4800,
      },
      {
        article: "NOV-005",
        barcode: "4600123456826",
        title: "Набор отверток универсальный 12 предметов",
        shortTitle: "Набор отверток 12в1",
        groupId: "g-5",
        quantity: 0,
        price: 1200,
      },
    ];

    initialNovikovItems.forEach((item, index) => {
      const nom: Nomenclature = {
        id: `nom-nov-${index + 1}`,
        warehouseId: w1.id,
        article: item.article,
        barcode: item.barcode,
        title: item.title,
        shortTitle: item.shortTitle,
        groupId: item.groupId,
        quantity: item.quantity,
        price: item.price,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.nomenclatures.set(nom.id, nom);

      if (item.quantity > 0) {
        const sm: StockMovement = {
          id: `sm-nov-${index + 1}`,
          warehouseId: w1.id,
          productId: nom.id,
          type: "INCOMING",
          quantity: item.quantity,
          documentType: "INITIAL_BALANCE",
          documentId: null,
          comment: "Начальный остаток склада",
          createdById: adminUser.id,
          createdAt: new Date().toISOString(),
        };
        this.stockMovements.set(sm.id, sm);
      }
    });

    // 6. Initial Items for Negociant
    const initialNegociantItems = [
      {
        article: "NEG-101",
        barcode: "4600987654321",
        title: "Степлер металлический №24/6 усиленный",
        shortTitle: "Степлер №24/6",
        groupId: "g-1",
        quantity: 85,
        price: 280,
      },
      {
        article: "NEG-102",
        barcode: "4600987654338",
        title: "Мыло жидкое антибактериальное 5л",
        shortTitle: "Мыло жидкое 5л",
        groupId: "g-2",
        quantity: 30,
        price: 390,
      },
      {
        article: "NEG-103",
        barcode: "4600987654345",
        title: "Мешки для мусора особопрочные 120л (10 шт)",
        shortTitle: "Мешки 120л 10шт",
        groupId: "g-3",
        quantity: 210,
        price: 140,
      },
      {
        article: "NEG-104",
        barcode: "4600987654352",
        title: "МФУ лазерное Pantum M6500W с Wi-Fi",
        shortTitle: "МФУ Pantum M6500W",
        groupId: "g-6",
        quantity: 6,
        price: 14500,
      },
      {
        article: "NEG-105",
        barcode: "4600987654369",
        title: "Чайник электрический металл 1.8л",
        shortTitle: "Чайник 1.8л",
        groupId: "g-7",
        quantity: 18,
        price: 1650,
      },
    ];

    initialNegociantItems.forEach((item, index) => {
      const nom: Nomenclature = {
        id: `nom-neg-${index + 1}`,
        warehouseId: w2.id,
        article: item.article,
        barcode: item.barcode,
        title: item.title,
        shortTitle: item.shortTitle,
        groupId: item.groupId,
        quantity: item.quantity,
        price: item.price,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.nomenclatures.set(nom.id, nom);

      if (item.quantity > 0) {
        const sm: StockMovement = {
          id: `sm-neg-${index + 1}`,
          warehouseId: w2.id,
          productId: nom.id,
          type: "INCOMING",
          quantity: item.quantity,
          documentType: "INITIAL_BALANCE",
          documentId: null,
          comment: "Начальный остаток склада ТД Негоциант",
          createdById: adminUser.id,
          createdAt: new Date().toISOString(),
        };
        this.stockMovements.set(sm.id, sm);
      }
    });

    // 7. Initial Order
    const sampleOrder: Order = {
      id: "ord-1",
      warehouseId: w1.id,
      clientId: c1.id,
      number: "СЧ-0001",
      status: "DRAFT",
      comment: "Поставка канцтоваров на квартал",
      totalAmount: 7000,
      createdById: adminUser.id,
      updatedById: adminUser.id,
      postedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(sampleOrder.id, sampleOrder);

    const sampleOrderItem: OrderItem = {
      id: "ord-item-1",
      orderId: sampleOrder.id,
      productId: "nom-nov-1",
      quantity: 20,
      price: 350,
      total: 7000,
    };
    this.orderItems.set(sampleOrderItem.id, sampleOrderItem);

    // 8. Initial Incoming
    const sampleIncoming: Incoming = {
      id: "inc-1",
      warehouseId: w1.id,
      supplierId: s1.id,
      number: "ПР-0001",
      status: "DRAFT",
      comment: "Поступление ручек и бумаги от ОфисСнаб",
      totalAmount: 18000,
      createdById: adminUser.id,
      updatedById: adminUser.id,
      postedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.incomings.set(sampleIncoming.id, sampleIncoming);

    const sampleIncomingItem: IncomingItem = {
      id: "inc-item-1",
      incomingId: sampleIncoming.id,
      productId: "nom-nov-1",
      quantity: 60,
      purchasePrice: 300,
      total: 18000,
    };
    this.incomingItems.set(sampleIncomingItem.id, sampleIncomingItem);

    this.initialized = true;
  }
}

const globalForStore = globalThis as unknown as {
  negoStoreDb?: DataStore;
};

export const memoryDb = globalForStore.negoStoreDb ?? new DataStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.negoStoreDb = memoryDb;
}
