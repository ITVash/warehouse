import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { AuditService } from '@/services/stock.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, first_name, last_name, username, photo_url, auth_date, hash, is_demo_login } = body;

    // Handle demo / development login for initial setup
    if (is_demo_login) {
      const demoRole = body.role || 'ADMIN';
      const user = await prisma.user.upsert({
        where: { telegramId: `demo_${demoRole.toLowerCase()}` },
        update: {
          lastLoginAt: new Date(),
        },
        create: {
          telegramId: `demo_${demoRole.toLowerCase()}`,
          username: `demo_${demoRole.toLowerCase()}`,
          firstName: demoRole === 'ADMIN' ? 'Администратор' : demoRole === 'MANAGER' ? 'Менеджер' : 'Гость',
          lastName: '(Демо)',
          role: demoRole,
          isBlocked: false,
          lastLoginAt: new Date(),
        },
        include: {
          warehouses: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      // Assign all warehouses if ADMIN or MANAGER
      if (demoRole === 'ADMIN' || demoRole === 'MANAGER') {
        const warehouses = await prisma.warehouse.findMany();
        for (const w of warehouses) {
          await prisma.userWarehouse.upsert({
            where: {
              userId_warehouseId: {
                userId: user.id,
                warehouseId: w.id,
              },
            },
            update: {},
            create: {
              userId: user.id,
              warehouseId: w.id,
            },
          });
        }
      }

      const response = NextResponse.json({
        success: true,
        data: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isBlocked: user.isBlocked,
        },
        message: 'Авторизация успешна',
      });

      response.cookies.set('session_user_id', user.id, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Telegram authentication verification
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && hash && botToken !== 'mock_or_real_bot_token') {
      const dataCheckArr: string[] = [];
      const keys = Object.keys(body).sort();
      for (const key of keys) {
        if (key !== 'hash' && body[key] !== undefined) {
          dataCheckArr.push(`${key}=${body[key]}`);
        }
      }
      const dataCheckString = dataCheckArr.join('\n');
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (calculatedHash !== hash) {
        return NextResponse.json(
          { success: false, data: null, message: 'Неверные данные авторизации Telegram' },
          { status: 401 }
        );
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'Отсутствует Telegram ID' },
        { status: 400 }
      );
    }

    const telegramIdStr = String(id);

    // Look up or create user (NEW USERS DEFAULT TO GUEST)
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramIdStr },
    });

    if (!user) {
      // First registered user can be promoted to ADMIN if no users exist, otherwise GUEST
      const usersCount = await prisma.user.count();
      const initialRole = usersCount === 0 ? 'ADMIN' : 'GUEST';

      user = await prisma.user.create({
        data: {
          telegramId: telegramIdStr,
          username: username || null,
          firstName: first_name || null,
          lastName: last_name || null,
          avatarUrl: photo_url || null,
          role: initialRole,
          lastLoginAt: new Date(),
        },
      });

      await AuditService.log({
        userId: user.id,
        action: 'CREATE',
        entity: 'USER',
        entityId: user.id,
        newData: { telegramId: telegramIdStr, role: initialRole },
      });
    } else {
      if (user.isBlocked) {
        return NextResponse.json(
          { success: false, data: null, message: 'Ваш доступ заблокирован администратором' },
          { status: 403 }
        );
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: username || user.username,
          firstName: first_name || user.firstName,
          lastName: last_name || user.lastName,
          avatarUrl: photo_url || user.avatarUrl,
          lastLoginAt: new Date(),
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isBlocked: user.isBlocked,
      },
      message: 'Успешный вход через Telegram',
    });

    response.cookies.set('session_user_id', user.id, {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, data: null, message: error.message || 'Ошибка сервера при авторизации' },
      { status: 500 }
    );
  }
}
