import { memoryDb } from "../lib/db";
import { Supplier } from "../types";

export class SupplierService {
  static async list(): Promise<Supplier[]> {
    const suppliers = Array.from(memoryDb.suppliers.values());
    suppliers.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return suppliers;
  }

  static async getById(id: string): Promise<Supplier | null> {
    return memoryDb.suppliers.get(id) || null;
  }

  static async create(data: {
    name: string;
    inn?: string | null;
    phone?: string | null;
    email?: string | null;
    comments?: string | null;
  }): Promise<Supplier> {
    const id = `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSupplier: Supplier = {
      id,
      name: data.name.trim(),
      inn: data.inn?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      comments: data.comments?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.suppliers.set(id, newSupplier);
    return newSupplier;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      inn?: string | null;
      phone?: string | null;
      email?: string | null;
      comments?: string | null;
    }
  ): Promise<Supplier> {
    const supplier = memoryDb.suppliers.get(id);
    if (!supplier) throw new Error("Поставщик не найден");

    const updated: Supplier = {
      ...supplier,
      name: data.name !== undefined ? data.name.trim() : supplier.name,
      inn: data.inn !== undefined ? (data.inn?.trim() || null) : supplier.inn,
      phone: data.phone !== undefined ? (data.phone?.trim() || null) : supplier.phone,
      email: data.email !== undefined ? (data.email?.trim() || null) : supplier.email,
      comments: data.comments !== undefined ? (data.comments?.trim() || null) : supplier.comments,
      updatedAt: new Date().toISOString(),
    };
    memoryDb.suppliers.set(id, updated);
    return updated;
  }

  static async delete(id: string): Promise<boolean> {
    const hasIncomings = Array.from(memoryDb.incomings.values()).some((i) => i.supplierId === id);
    if (hasIncomings) {
      throw new Error("Невозможно удалить поставщика, по которому оформлены приходы");
    }
    return memoryDb.suppliers.delete(id);
  }
}
