import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, createSessionToken } from "@/src/lib/auth";
import { memoryDb } from "@/src/lib/db";
import { Role } from "@/src/types";

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json();
    if (!["ADMIN", "MANAGER", "GUEST"].includes(role)) {
      return NextResponse.json({ success: false, error: "Недопустимая роль" }, { status: 400 });
    }

    const session = getSessionFromRequest(req);
    let user = session?.id ? memoryDb.users.get(session.id) : null;

    if (!user) {
      // Find or create default demo user
      user = Array.from(memoryDb.users.values())[0];
      if (!user) {
        user = {
          id: "u-admin",
          telegramId: "12345678",
          username: "admin_demo",
          firstName: "Администратор",
          lastName: "NegoStore",
          photoUrl: null,
          role: role as Role,
          isActive: true,
          authDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        memoryDb.users.set(user.id, user);
      }
    }

    user.role = role as Role;
    user.updatedAt = new Date().toISOString();
    memoryDb.users.set(user.id, user);

    const token = createSessionToken(user);
    const response = NextResponse.json({ success: true, data: user });

    response.cookies.set("negostore_session", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Internal error" },
      { status: 500 }
    );
  }
}
