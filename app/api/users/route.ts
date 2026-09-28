import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { AuditService } from '@/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role !== 'ADMIN') return NextResponse.json({ success: false, data: null, message: 'Требуются права Администратора' }, { status: 403 });

    const users = await prisma.user.findMany({
      include: {
        warehouses: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      telegramId: u.telegramId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isBlocked: u.isBlocked,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      warehouses: u.warehouses.map((w) => ({
        id: w.warehouse.id,
        name: w.warehouse.name,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      message: null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role !== 'ADMIN') return NextResponse.json({ success: false, data: null, message: 'Требуются права Администратора' }, { status: 403 });

    const body = await req.json();
    const { userId, role, isBlocked, warehouseIds } = body;

    if (!userId) {
      return NextResponse.json({ success: false, data: null, message: 'Не указан ID пользователя' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { warehouses: true },
    });

    if (!existingUser) {
      return NextResponse.json({ success: false, data: null, message: 'Пользователь не найден' }, { status: 404 });
    }

    // Update role & block status
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role !== undefined ? role : existingUser.role,
        isBlocked: isBlocked !== undefined ? isBlocked : existingUser.isBlocked,
      },
    });

    // Update assigned warehouses if provided
    if (Array.isArray(warehouseIds)) {
      await prisma.userWarehouse.deleteMany({
        where: { userId },
      });

      for (const wId of warehouseIds) {
        await prisma.userWarehouse.create({
          data: {
            userId,
            warehouseId: wId,
          },
        });
      }
    }

    await AuditService.log({
      userId: session.id,
      action: 'ROLE_CHANGE',
      entity: 'USER',
      entityId: userId,
      oldData: { role: existingUser.role, isBlocked: existingUser.isBlocked },
      newData: { role, isBlocked, warehouseIds },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Данные пользователя успешно обновлены',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
