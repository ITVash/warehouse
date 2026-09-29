import { NextRequest } from "next/server";
import crypto from "crypto";
import { User, Role } from "@/src/types";

const SESSION_COOKIE_NAME = "negostore_session";

export function verifyTelegramAuth(data: Record<string, string | number>, botToken: string): boolean {
  if (!botToken || !data.hash) return false;

  const { hash, ...dataToCheck } = data;
  const checkString = Object.keys(dataToCheck)
    .sort()
    .map((k) => `${k}=${dataToCheck[k]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  return hmac === hash;
}

export function parseSessionToken(token: string): Partial<User> | null {
  try {
    const json = Buffer.from(token, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function createSessionToken(user: Partial<User>): string {
  const json = JSON.stringify(user);
  return Buffer.from(json).toString("base64");
}

export function getSessionFromRequest(req: NextRequest): Partial<User> | null {
  const cookieHeader = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");

  const token = cookieHeader || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
  if (!token) return null;

  return parseSessionToken(token);
}

export class AuthError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = "UNAUTHORIZED", statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function requireAuth(req: NextRequest): Partial<User> {
  const session = getSessionFromRequest(req);
  if (!session || !session.id) {
    throw new AuthError("Требуется авторизация", "UNAUTHORIZED", 401);
  }
  if (session.isActive === false) {
    throw new AuthError("Учетная запись заблокирована администратором", "ACCOUNT_DISABLED", 403);
  }
  return session;
}

export function requireRole(req: NextRequest, allowedRoles: Role[]): Partial<User> {
  const session = requireAuth(req);
  const role = session.role as Role;

  if (!role || !allowedRoles.includes(role)) {
    if (role === "GUEST") {
      throw new AuthError("Ожидается назначение прав администратора", "GUEST_ACCESS_DENIED", 403);
    }
    throw new AuthError("Недостаточно прав для выполнения операции", "FORBIDDEN", 403);
  }

  return session;
}

export function requireAdmin(req: NextRequest): Partial<User> {
  return requireRole(req, ["ADMIN"]);
}

export function requireManager(req: NextRequest): Partial<User> {
  return requireRole(req, ["ADMIN", "MANAGER"]);
}
