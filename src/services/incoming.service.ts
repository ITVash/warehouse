import { memoryDb } from "../lib/db";
import { Incoming, DocumentStatus } from "../types";
import { NotificationService } from "./notification.service";
import { AuditService } from "./audit.service";

export interface IncomingFilter {
  warehouseId: string;
  status?: DocumentStatus;
  supplierId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class IncomingService {
  static async list(filter: IncomingFilter): Promise<{ items: Incoming[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { warehouseId, status, supplierId, search, page = 1, pageSize = 25 } = filter;

    let incomings = Array.from(memoryDb.incomings.values()).filter(
      (inc) => inc.warehouseId === warehouseId
    );

    if (status) {
      incomings = incomings.filter((inc) => inc.status === status);
    }

    if (supplierId) {
      incomings = incomings.filter((inc) => inc.supplierId === supplierId);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      incomings = incomings.filter((inc) => {
        const supplier = memoryDb.suppliers.get(inc.supplierId);
        return (
          inc.number.toLowerCase().includes(q) ||
          (inc.comment && inc.comment.toLowerCase().includes(q)) ||
          (supplier && supplier.name.toLowerCase().includes(q))
        );
      });
    }

    incomings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = incomings.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = incomings.slice(startIndex, startIndex + pageSize);

    const enriched = paginated.map((inc) => this.enrichIncoming(inc));

    return {
      items: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  static async getById(id: string): Promise<Incoming | null> {
    const incoming = memoryDb.incomings.get(id);
    if (!incoming) return null;
    return this.enrichIncoming(incoming);
  }

  private static enrichIncoming(incoming: Incoming): Incoming {
    const items = Array.from(memoryDb.incomingItems.values())
      .filter((ii) => ii.incomingId === incoming.id)
      .map((ii) => {
        const prod = memoryDb.nomenclatures.get(ii.productId);
        return {
          ...ii,
          product: prod ? { ...prod, group: memoryDb.groups.get(prod.groupId) } : undefined,
        };
      });

    return {
      ...incoming,
      supplier: memoryDb.suppliers.get(incoming.supplierId),
      createdBy: incoming.createdById ? memoryDb.users.get(incoming.createdById) || null : null,
      updatedBy: incoming.updatedById ? memoryDb.users.get(incoming.updatedById) || null : null,
      items,
    };
  }

  static async create(data: {
    warehouseId: string;
    supplierId: string;
    number: string;
    comment?: string | null;
    userId: string;
    items: { productId: string; quantity: number; purchasePrice: number }[];
  }): Promise<Incoming> {
    const supplier = memoryDb.suppliers.get(data.supplierId);
    if (!supplier) {
      throw new Error("Поставщик не найден");
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

    const incomingId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let totalAmount = 0;

    for (const item of data.items) {
      const lineTotal = item.quantity * item.purchasePrice;
      totalAmount += lineTotal;
      const itemId = `ii-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      memoryDb.incomingItems.set(itemId, {
        id: itemId,
        incomingId,
        productId: item.productId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        total: lineTotal,
      });
    }

    const newIncoming: Incoming = {
      id: incomingId,
      warehouseId: data.warehouseId,
      supplierId: data.supplierId,
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

    memoryDb.incomings.set(incomingId, newIncoming);

    await AuditService.log({
      userId: data.userId,
      action: "INCOMING_CREATED",
      entity: "Incoming",
      entityId: incomingId,
      metadata: { number: newIncoming.number, totalAmount },
    });

    await NotificationService.sendToAll({
      title: "Новый приход",
      body: `Создан приход от поставщика №${newIncoming.number} на сумму ${totalAmount.toLocaleString("ru-RU")} ₽`,
      url: `/incomings/${incomingId}`,
    });

    return this.enrichIncoming(newIncoming);
  }

  static async update(
    id: string,
    data: {
      supplierId?: string;
      number?: string;
      comment?: string | null;
      userId: string;
      items?: { productId: string; quantity: number; purchasePrice: number }[];
    }
  ): Promise<Incoming> {
    const incoming = memoryDb.incomings.get(id);
    if (!incoming) {
      throw new Error("Приход не найден");
    }

    if (incoming.status === "POSTED") {
      throw new Error("Документ уже проведён и не может быть изменён");
    }

    if (data.items) {
      for (const item of data.items) {
        const product = memoryDb.nomenclatures.get(item.productId);
        if (!product) {
          throw new Error(`Товар с ID ${item.productId} не найден`);
        }
        if (product.warehouseId !== incoming.warehouseId) {
          throw new Error(`WAREHOUSE_MISMATCH: Товар "${product.title}" принадлежит другому складу`);
        }
      }

      for (const [itemId, item] of memoryDb.incomingItems.entries()) {
        if (item.incomingId === id) {
          memoryDb.incomingItems.delete(itemId);
        }
      }

      let totalAmount = 0;
      for (const item of data.items) {
        const lineTotal = item.quantity * item.purchasePrice;
        totalAmount += lineTotal;
        const itemId = `ii-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        memoryDb.incomingItems.set(itemId, {
          id: itemId,
          incomingId: id,
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          total: lineTotal,
        });
      }
      incoming.totalAmount = totalAmount;
    }

    if (data.supplierId) incoming.supplierId = data.supplierId;
    if (data.number) incoming.number = data.number.trim();
    if (data.comment !== undefined) incoming.comment = data.comment?.trim() || null;
    incoming.updatedById = data.userId;
    incoming.updatedAt = new Date().toISOString();

    memoryDb.incomings.set(id, incoming);

    await AuditService.log({
      userId: data.userId,
      action: "INCOMING_UPDATED",
      entity: "Incoming",
      entityId: id,
      metadata: { number: incoming.number, totalAmount: incoming.totalAmount },
    });

    return this.enrichIncoming(incoming);
  }

  static async post(id: string, userId: string): Promise<Incoming> {
    const incoming = memoryDb.incomings.get(id);
    if (!incoming) {
      throw new Error("Приход не найден");
    }

    if (incoming.status === "POSTED") {
      throw new Error("Документ уже проведён");
    }

    const items = Array.from(memoryDb.incomingItems.values()).filter((ii) => ii.incomingId === id);
    if (items.length === 0) {
      throw new Error("Невозможно провести пустой приход без товаров");
    }

    for (const item of items) {
      const product = memoryDb.nomenclatures.get(item.productId);
      if (!product) {
        throw new Error(`Товар с ID ${item.productId} не найден на складе`);
      }

      product.quantity = Number(product.quantity) + Number(item.quantity);
      product.updatedAt = new Date().toISOString();
      memoryDb.nomenclatures.set(product.id, product);

      const smId = `sm-inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      memoryDb.stockMovements.set(smId, {
        id: smId,
        warehouseId: incoming.warehouseId,
        productId: product.id,
        type: "INCOMING",
        quantity: item.quantity,
        documentType: "INCOMING",
        documentId: incoming.id,
        comment: `Приход по накладной №${incoming.number}`,
        createdById: userId,
        createdAt: new Date().toISOString(),
      });
    }

    incoming.status = "POSTED";
    incoming.postedAt = new Date().toISOString();
    incoming.updatedById = userId;
    incoming.updatedAt = new Date().toISOString();
    memoryDb.incomings.set(id, incoming);

    await AuditService.log({
      userId,
      action: "INCOMING_POSTED",
      entity: "Incoming",
      entityId: id,
      metadata: { number: incoming.number, totalAmount: incoming.totalAmount },
    });

    await NotificationService.sendToAll({
      title: "Приход проведён",
      body: `Приход от поставщика №${incoming.number} проведён. Складские остатки увеличены.`,
      url: `/incomings/${id}`,
    });

    return this.enrichIncoming(incoming);
  }

  static async delete(id: string, userId: string): Promise<boolean> {
    const incoming = memoryDb.incomings.get(id);
    if (!incoming) return false;

    if (incoming.status === "POSTED") {
      throw new Error("Нельзя удалить проведённый документ");
    }

    for (const [itemId, item] of memoryDb.incomingItems.entries()) {
      if (item.incomingId === id) {
        memoryDb.incomingItems.delete(itemId);
      }
    }

    memoryDb.incomings.delete(id);

    await AuditService.log({
      userId,
      action: "INCOMING_DELETED",
      entity: "Incoming",
      entityId: id,
      metadata: { number: incoming.number },
    });

    return true;
  }
}
