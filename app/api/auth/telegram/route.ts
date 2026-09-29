import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramAuth, createSessionToken } from "@/src/lib/auth";
import { UserService } from "@/src/services/user.service";
import { AuditService } from "@/src/services/audit.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "";

    // If bot token is configured and hash is provided, verify signature
    if (botToken && body.hash) {
      const isValid = verifyTelegramAuth(body, botToken);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Неверная цифровая подпись Telegram данных" },
          { status: 401 }
        );
      }
    }

    const telegramId = body.id || body.telegramId;
    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: "Отсутствует telegramId" },
        { status: 400 }
      );
    }

    const user = await UserService.findOrCreateFromTelegram({
      telegramId: String(telegramId),
      username: body.username || null,
      firstName: body.first_name || body.firstName || "Пользователь",
      lastName: body.last_name || body.lastName || null,
      photoUrl: body.photo_url || body.photoUrl || null,
      authDate: body.auth_date ? new Date(body.auth_date * 1000).toISOString() : new Date().toISOString(),
    });

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "Учетная запись заблокирована администратором" },
        { status: 403 }
      );
    }

    await AuditService.log({
      userId: user.id,
      action: "AUTH_LOGIN",
      entity: "User",
      entityId: user.id,
      metadata: { telegramId: user.telegramId, role: user.role },
    });

    const token = createSessionToken(user);
    const response = NextResponse.json({ success: true, data: user });

    // Set cookie
    response.cookies.set("negostore_session", token, {
      httpOnly: false, // accessible to client auth headers if needed
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
