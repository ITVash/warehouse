import { memoryDb } from "../lib/db";
import { Client } from "../types";

export class ClientService {
  static async list(): Promise<Client[]> {
    const clients = Array.from(memoryDb.clients.values());
    clients.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return clients;
  }

  static async getById(id: string): Promise<Client | null> {
    return memoryDb.clients.get(id) || null;
  }

  static async create(data: { name: string; phone?: string | null; email?: string | null; inn?: string | null }): Promise<Client> {
    const id = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newClient: Client = {
      id,
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      inn: data.inn?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryDb.clients.set(id, newClient);
    return newClient;
  }

  static async update(
    id: string,
    data: { name?: string; phone?: string | null; email?: string | null; inn?: string | null }
  ): Promise<Client> {
    const client = memoryDb.clients.get(id);
    if (!client) throw new Error("Клиент не найден");

    const updated: Client = {
      ...client,
      name: data.name !== undefined ? data.name.trim() : client.name,
      phone: data.phone !== undefined ? (data.phone?.trim() || null) : client.phone,
      email: data.email !== undefined ? (data.email?.trim() || null) : client.email,
      inn: data.inn !== undefined ? (data.inn?.trim() || null) : client.inn,
      updatedAt: new Date().toISOString(),
    };
    memoryDb.clients.set(id, updated);
    return updated;
  }

  static async delete(id: string): Promise<boolean> {
    const hasOrders = Array.from(memoryDb.orders.values()).some((o) => o.clientId === id);
    if (hasOrders) {
      throw new Error("Невозможно удалить клиента, к которому привязаны счета");
    }
    return memoryDb.clients.delete(id);
  }
}
