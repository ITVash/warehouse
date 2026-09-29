import { memoryDb } from "../lib/db";
import { Order, DocumentStatus } from "../types";
import { NotificationService } from "./notification.service";
import { AuditService } from "./audit.service";

export interface OrderFilter {
  warehouseId: string;
  status?: DocumentStatus;
  clientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class OrderService {
  static async list(filter: OrderFilter): Promise<{ items: Order[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { warehouseId, status, clientId, search, page = 1, pageSize = 25 } = filter;

    let orders = Array.from(memoryDb.orders.values()).filter(
      (ord) => ord.warehouseId === warehouseId
    );

    if (status) {
      orders = orders.filter((ord) => ord.status === status);
    }

    if (clientId) {
      orders = orders.filter((ord) => ord.clientId === clientId);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter((ord) => {
        const client = memoryDb.clients.get(ord.clientId);
        return (
          ord.number.toLowerCase().includes(q) ||
          (ord.comment && ord.comment.toLowerCase().includes(q)) ||
          (client && client.name.toLowerCase().includes(q))
        );
      });
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = orders.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = orders.slice(startIndex, startIndex + pageSize);

    const enriched = paginated.map((ord) => this.enrichOrder(ord));

    return {
      items: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  static async getById(id: string): Promise<Order | null> {
    const order = memoryDb.orders.get(id);
    if (!order) return null;
    return this.enrichOrder(order);
  }

  private static enrichOrder(order: Order): Order {
    const items = Array.from(memoryDb.orderItems.values())
      .filter((oi) => oi.orderId === order.id)
      .map((oi) => {
        const prod = memoryDb.nomenclatures.get(oi.productId);
        return {
          ...oi,
          product: prod ? { ...prod, group: memoryDb.groups.get(prod.groupId) } : undefined,
        };
      });

    return {
      ...order,
      client: memoryDb.clients.get(order.clientId),
      createdBy: order.createdById ? memoryDb.users.get(order.createdById) || null : null,
      updatedBy: order.updatedById ? memoryDb.users.get(order.updatedById) || null : null,
      items,
    };
  }

  static async create(data: {
    warehouseId: string;
    clientId: string;
    number: string;
    comment?: string | null;
    userId: string;
    items: { productId: string; quantity: number; price: number }[];
  }): Promise<Order> {
    const client = memoryDb.clients.get(data.clientId);
    if (!client) {
      throw new Error("Клиент не найден");
    }

    for (const item of data.items) {
      const product = memoryDb.nomenclatures.get(item.productId);
      if (!product) {
        throw new Error(`Товар с ID ${item.productId} не найден`);
      }
      if (product.warehouseId !== data.warehouseId) {
        throw new Error(`WAREHOUSE_MISMATCH: Товар "${product.title}" принадлежит другому складу`);
      }
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let totalAmount = 0;

    for (const item of data.items) {
      const lineTotal = item.quantity * item.price;
      totalAmount += lineTotal;
      const itemId = `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      memoryDb.orderItems.set(itemId, {
        id: itemId,
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: lineTotal,
      });
    }

    const newOrder: Order = {
      id: orderId,
      warehouseId: data.warehouseId,
      clientId: data.clientId,
      number: data.number.trim(),
      status: "DRAFT",
      comment: data.comment?.trim() || null,
      totalAmount,
      createdById: data.userId,
      updatedById: data.userId,
      postedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryDb.orders.set(orderId, newOrder);

    await AuditService.log({
      userId: data.userId,
      action: "ORDER_CREATED",
      entity: "Order",
      entityId: orderId,
      metadata: { number: newOrder.number, totalAmount },
    });

    await NotificationService.sendToAll({
      title: "Новый счёт",
      body: `Создан новый счёт покупателя №${newOrder.number} на сумму ${totalAmount.toLocaleString("ru-RU")} ₽`,
      url: `/orders/${orderId}`,
    });

    return this.enrichOrder(newOrder);
  }

  static async update(
    id: string,
    data: {
      clientId?: string;
      number?: string;
      comment?: string | null;
      userId: string;
      items?: { productId: string; quantity: number; price: number }[];
    }
  ): Promise<Order> {
    const order = memoryDb.orders.get(id);
    if (!order) {
      throw new Error("Счёт не найден");
    }

    if (order.status === "POSTED") {
      throw new Error("Документ уже проведён и не может быть изменён");
    }

    if (data.items) {
      for (const item of data.items) {
        const product = memoryDb.nomenclatures.get(item.productId);
        if (!product) {
          throw new Error(`Товар с ID ${item.productId} не найден`);
        }
        if (product.warehouseId !== order.warehouseId) {
          throw new Error(`WAREHOUSE_MISMATCH: Товар "${product.title}" принадлежит другому складу`);
        }
      }

      for (const [itemId, item] of memoryDb.orderItems.entries()) {
        if (item.orderId === id) {
          memoryDb.orderItems.delete(itemId);
        }
      }

      let totalAmount = 0;
      for (const item of data.items) {
        const lineTotal = item.quantity * item.price;
        totalAmount += lineTotal;
        const itemId = `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        memoryDb.orderItems.set(itemId, {
          id: itemId,
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: lineTotal,
        });
      }
      order.totalAmount = totalAmount;
    }

    if (data.clientId) order.clientId = data.clientId;
    if (data.number) order.number = data.number.trim();
    if (data.comment !== undefined) order.comment = data.comment?.trim() || null;
    order.updatedById = data.userId;
    order.updatedAt = new Date().toISOString();

    memoryDb.orders.set(id, order);

    await AuditService.log({
      userId: data.userId,
      action: "ORDER_UPDATED",
      entity: "Order",
      entityId: id,
      metadata: { number: order.number, totalAmount: order.totalAmount },
    });

    return this.enrichOrder(order);
  }

  static async post(id: string, userId: string): Promise<Order> {
    const order = memoryDb.orders.get(id);
    if (!order) {
      throw new Error("Счёт не найден");
    }

    if (order.status === "POSTED") {
      throw new Error("Документ уже проведён");
    }

    const items = Array.from(memoryDb.orderItems.values()).filter((oi) => oi.orderId === id);
    if (items.length === 0) {
      throw new Error("Невозможно провести пустой счёт без товаров");
    }

    for (const item of items) {
      const product = memoryDb.nomenclatures.get(item.productId);
      if (!product) {
        throw new Error(`Товар с ID ${item.productId} не найден на складе`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(
          `INSUFFICIENT_STOCK: Недостаточный остаток для товара "${product.title}". Доступно: ${product.quantity}, Запрошено: ${item.quantity}`
        );
      }
    }

    for (const item of items) {
      const product = memoryDb.nomenclatures.get(item.productId)!;
      product.quantity = Number(product.quantity) - Number(item.quantity);
      product.updatedAt = new Date().toISOString();
      memoryDb.nomenclatures.set(product.id, product);

      const smId = `sm-ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      memoryDb.stockMovements.set(smId, {
        id: smId,
        warehouseId: order.warehouseId,
        productId: product.id,
        type: "OUTGOING",
        quantity: item.quantity,
        documentType: "ORDER",
        documentId: order.id,
        comment: `Расход по счёту №${order.number}`,
        createdById: userId,
        createdAt: new Date().toISOString(),
      });
    }

    order.status = "POSTED";
    order.postedAt = new Date().toISOString();
    order.updatedById = userId;
    order.updatedAt = new Date().toISOString();
    memoryDb.orders.set(id, order);

    await AuditService.log({
      userId,
      action: "ORDER_POSTED",
      entity: "Order",
      entityId: id,
      metadata: { number: order.number, totalAmount: order.totalAmount },
    });

    await NotificationService.sendToAll({
      title: "Счёт проведён",
      body: `Счёт покупателя №${order.number} успешно проведён. Складские остатки обновлены.`,
      url: `/orders/${id}`,
    });

    return this.enrichOrder(order);
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const order = memoryDb.orders.get(id);
    if (!order) return false;

    if (order.status === "POSTED") {
      throw new Error("Нельзя удалить проведённый документ");
    }

    for (const [itemId, item] of memoryDb.orderItems.entries()) {
      if (item.orderId === id) {
        memoryDb.orderItems.delete(itemId);
      }
    }

    memoryDb.orders.delete(id);

    await AuditService.log({
      userId,
      action: "ORDER_DELETED",
      entity: "Order",
      entityId: id,
      metadata: { number: order.number },
    });

    return true;
  }
}
