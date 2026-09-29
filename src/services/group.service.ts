import { memoryDb } from "../lib/db";
import { Group } from "../types";

export class GroupService {
  static async getAll(): Promise<Group[]> {
    return Array.from(memoryDb.groups.values());
  }

  static async getById(id: string): Promise<Group | null> {
    return memoryDb.groups.get(id) || null;
  }
}
