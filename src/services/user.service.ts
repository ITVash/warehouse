import { memoryDb } from "../lib/db";
import { User, Role } from "../types";
import { AuditService } from "./audit.service";

export class UserService {
  static async list(): Promise<User[]> {
    const users = Array.from(memoryDb.users.values());
    users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return users;
  }

  static async getById(id: string): Promise<User | null> {
    return memoryDb.users.get(id) || null;
  }

  static async getByTelegramId(telegramId: string): Promise<User | null> {
    return (
      Array.from(memoryDb.users.values()).find((u) => u.telegramId === String(telegramId)) || null
    );
  }

  static async findOrCreateFromTelegram(telegramData: {
    telegramId: string | number;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    photoUrl?: string | null;
    authDate?: string | null;
  }): Promise<User> {
    const tgIdStr = String(telegramData.telegramId);
    let user = await this.getByTelegramId(tgIdStr);

    if (user) {
      user.username = telegramData.username || user.username;
      user.firstName = telegramData.firstName || user.firstName;
      user.lastName = telegramData.lastName || user.lastName;
      user.photoUrl = telegramData.photoUrl || user.photoUrl;
      user.authDate = telegramData.authDate || new Date().toISOString();
      user.updatedAt = new Date().toISOString();
      memoryDb.users.set(user.id, user);
      return user;
    }

    const isInitialAdmin = process.env.INITIAL_ADMIN_TELEGRAM_ID === tgIdStr;
    const initialRole: Role = isInitialAdmin ? "ADMIN" : "GUEST";

    const newId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      id: newId,
      telegramId: tgIdStr,
      username: telegramData.username || null,
      firstName: telegramData.firstName || null,
      lastName: telegramData.lastName || null,
      photoUrl: telegramData.photoUrl || null,
      role: initialRole,
      isActive: true,
      authDate: telegramData.authDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryDb.users.set(newId, newUser);

    await AuditService.log({
      userId: newId,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: newId,
      metadata: { telegramId: tgIdStr, role: initialRole },
    });

    return newUser;
  }

  static async changeRole(userId: string, newRole: Role, adminId: string): Promise<User> {
    const user = memoryDb.users.get(userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }

    const previousRole = user.role;
    user.role = newRole;
    user.updatedAt = new Date().toISOString();
    memoryDb.users.set(userId, user);

    await AuditService.log({
      userId: adminId,
      action: "ROLE_CHANGED",
      entity: "User",
      entityId: userId,
      metadata: { previousRole, newRole, targetTelegramId: user.telegramId },
    });

    return user;
  }

  static async setStatus(userId: string, isActive: boolean, adminId: string): Promise<User> {
    const user = memoryDb.users.get(userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }

    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();
    memoryDb.users.set(userId, user);

    await AuditService.log({
      userId: adminId,
      action: isActive ? "USER_UNBLOCKED" : "USER_BLOCKED",
      entity: "User",
      entityId: userId,
      metadata: { isActive, targetTelegramId: user.telegramId },
    });

    return user;
  }
}
