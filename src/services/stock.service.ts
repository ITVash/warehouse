import { memoryDb } from "../lib/db";
import { StockReportItem, StockSummary } from "../types";

export interface StockFilter {
  warehouseId: string;
  groupId?: string;
  search?: string;
  stockStatus?: "ALL" | "IN_STOCK" | "ZERO_STOCK";
}

export class StockService {
  static async getBalances(filter: StockFilter): Promise<{ items: StockReportItem[]; summary: StockSummary }> {
    const { warehouseId, groupId, search, stockStatus = "ALL" } = filter;

    let items = Array.from(memoryDb.nomenclatures.values()).filter(
      (n) => n.warehouseId === warehouseId
    );

    if (groupId && groupId !== "all") {
      items = items.filter((n) => n.groupId === groupId);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.article.toLowerCase().includes(q) ||
          (n.barcode && n.barcode.toLowerCase().includes(q))
      );
    }

    if (stockStatus === "IN_STOCK") {
      items = items.filter((n) => n.quantity > 0);
    } else if (stockStatus === "ZERO_STOCK") {
      items = items.filter((n) => n.quantity <= 0);
    }

    const reportItems: StockReportItem[] = items.map((n) => {
      const group = memoryDb.groups.get(n.groupId);
      return {
        productId: n.id,
        title: n.title,
        article: n.article,
        barcode: n.barcode,
        groupName: group?.name || "Без группы",
        groupId: n.groupId,
        quantity: Number(n.quantity),
        price: Number(n.price),
        totalValue: Number(n.quantity) * Number(n.price),
        warehouseId: n.warehouseId,
      };
    });

    const allWarehouseItems = Array.from(memoryDb.nomenclatures.values()).filter(
      (n) => n.warehouseId === warehouseId
    );

    let totalItems = 0;
    let zeroStockCount = 0;
    let totalStockValue = 0;

    for (const item of allWarehouseItems) {
      const q = Number(item.quantity);
      totalItems += q;
      if (q <= 0) {
        zeroStockCount++;
      }
      totalStockValue += q * Number(item.price);
    }

    return {
      items: reportItems,
      summary: {
        totalItems,
        totalPositions: allWarehouseItems.length,
        zeroStockCount,
        totalStockValue,
      },
    };
  }

  static async generateCsv(filter: StockFilter): Promise<string> {
    const { items } = await this.getBalances(filter);
    const headers = ["Товар", "Артикул", "Штрихкод", "Группа", "Остаток", "Цена", "Сумма остатка"];
    const rows = items.map((item) => [
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.article}"`,
      `"${item.barcode || ""}"`,
      `"${item.groupName}"`,
      item.quantity,
      item.price,
      item.totalValue,
    ]);

    return [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  }

  static async getMovements(warehouseId: string, productId?: string) {
    let movements = Array.from(memoryDb.stockMovements.values()).filter(
      (sm) => sm.warehouseId === warehouseId
    );

    if (productId) {
      movements = movements.filter((sm) => sm.productId === productId);
    }

    movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return movements.map((sm) => ({
      ...sm,
      product: memoryDb.nomenclatures.get(sm.productId),
    }));
  }
}
