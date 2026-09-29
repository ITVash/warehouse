import { memoryDb } from "../lib/db";
import { AuditLog } from "../types";

export class AuditService {
  static async log(data: {
    userId: string | null;
    action: string;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuditLog> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const logEntry: AuditLog = {
      id,
      userId: data.userId,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      metadata: data.metadata || null,
      createdAt: new Date().toISOString(),
      user: data.userId ? memoryDb.users.get(data.userId) || null : null,
    };
    memoryDb.auditLogs.set(id, logEntry);
    return logEntry;
  }

  static async list(limit = 100): Promise<AuditLog[]> {
    const logs = Array.from(memoryDb.auditLogs.values());
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return logs.slice(0, limit).map((log) => ({
      ...log,
      user: log.userId ? memoryDb.users.get(log.userId) || null : null,
    }));
  }
}
