import { memoryDb } from "../lib/db";
import { Nomenclature } from "../types";

export interface NomenclatureFilter {
  warehouseId: string;
  search?: string;
  groupId?: string;
  page?: number;
  pageSize?: number;
}

export class NomenclatureService {
  static async list(filter: NomenclatureFilter): Promise<{ items: Nomenclature[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { warehouseId, search, groupId, page = 1, pageSize = 25 } = filter;

    let items = Array.from(memoryDb.nomenclatures.values()).filter(
      (item) => item.warehouseId === warehouseId
    );

    if (groupId && groupId !== "all") {
      items = items.filter((item) => item.groupId === groupId);
    }

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.article.toLowerCase().includes(q) ||
          (item.barcode && item.barcode.toLowerCase().includes(q))
      );
    }

    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    const enriched = paginatedItems.map((item) => ({
      ...item,
      group: memoryDb.groups.get(item.groupId),
      warehouse: memoryDb.warehouses.get(item.warehouseId),
    }));

    return {
      items: enriched,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  static async getById(id: string): Promise<Nomenclature | null> {
    const item = memoryDb.nomenclatures.get(id);
    if (!item) return null;
    return {
      ...item,
      group: memoryDb.groups.get(item.groupId),
      warehouse: memoryDb.warehouses.get(item.warehouseId),
    };
  }

  static async getByBarcode(warehouseId: string, barcode: string): Promise<Nomenclature | null> {
    const trimmed = barcode.trim();
    const item = Array.from(memoryDb.nomenclatures.values()).find(
      (n) => n.warehouseId === warehouseId && n.barcode === trimmed
    );
    if (!item) return null;
    return {
      ...item,
      group: memoryDb.groups.get(item.groupId),
      warehouse: memoryDb.warehouses.get(item.warehouseId),
    };
  }

  static async create(data: {
    warehouseId: string;
    article: string;
    barcode?: string | null;
    title: string;
    shortTitle?: string | null;
    groupId: string;
    price?: number;
  }): Promise<Nomenclature> {
    if (data.barcode && data.barcode.trim()) {
      const existing = await this.getByBarcode(data.warehouseId, data.barcode);
      if (existing) {
        throw new Error(`Товар со штрихкодом ${data.barcode} уже существует на этом складе`);
      }
    }

    const id = `nom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: Nomenclature = {
      id,
      warehouseId: data.warehouseId,
      article: data.article.trim(),
      barcode: data.barcode?.trim() || null,
      title: data.title.trim(),
      shortTitle: data.shortTitle?.trim() || null,
      groupId: data.groupId,
      quantity: 0,
      price: data.price || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryDb.nomenclatures.set(id, newItem);
    return {
      ...newItem,
      group: memoryDb.groups.get(newItem.groupId),
    };
  }

  static async update(
    id: string,
    data: {
      article?: string;
      barcode?: string | null;
      title?: string;
      shortTitle?: string | null;
      groupId?: string;
      price?: number;
    }
  ): Promise<Nomenclature> {
    const item = memoryDb.nomenclatures.get(id);
    if (!item) {
      throw new Error("Товар не найден");
    }

    if (data.barcode && data.barcode.trim()) {
      const existing = await this.getByBarcode(item.warehouseId, data.barcode);
      if (existing && existing.id !== id) {
        throw new Error(`Штрихкод ${data.barcode} уже присвоен другому товару`);
      }
    }

    const updated: Nomenclature = {
      ...item,
      article: data.article !== undefined ? data.article.trim() : item.article,
      barcode: data.barcode !== undefined ? (data.barcode?.trim() || null) : item.barcode,
      title: data.title !== undefined ? data.title.trim() : item.title,
      shortTitle: data.shortTitle !== undefined ? (data.shortTitle?.trim() || null) : item.shortTitle,
      groupId: data.groupId !== undefined ? data.groupId : item.groupId,
      price: data.price !== undefined ? data.price : item.price,
      updatedAt: new Date().toISOString(),
    };

    memoryDb.nomenclatures.set(id, updated);
    return {
      ...updated,
      group: memoryDb.groups.get(updated.groupId),
    };
  }

  static async delete(id: string): Promise<boolean> {
    const item = memoryDb.nomenclatures.get(id);
    if (!item) return false;

    const inOrders = Array.from(memoryDb.orderItems.values()).some((oi) => oi.productId === id);
    const inIncomings = Array.from(memoryDb.incomingItems.values()).some((ii) => ii.productId === id);
    if (inOrders || inIncomings) {
      throw new Error("Невозможно удалить товар, который используется в документах (счетах или приходах)");
    }

    return memoryDb.nomenclatures.delete(id);
  }
}
