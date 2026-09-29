import { memoryDb } from "../lib/db";
import { Warehouse } from "../types";

export class WarehouseService {
  static async getAll(): Promise<Warehouse[]> {
    return Array.from(memoryDb.warehouses.values()).filter((w) => w.isActive);
  }

  static async getById(id: string): Promise<Warehouse | null> {
    return memoryDb.warehouses.get(id) || null;
  }

  static async getByCode(code: string): Promise<Warehouse | null> {
    const list = Array.from(memoryDb.warehouses.values());
    return list.find((w) => w.code === code) || null;
  }
}
