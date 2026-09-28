import { NextRequest } from 'next/server';
import prisma from './prisma';
import { UserSession, Role } from '@/types';

export async function getServerSession(req: NextRequest): Promise<UserSession | null> {
  const sessionToken = req.cookies.get('session_user_id')?.value;
  const headerUserId = req.headers.get('x-user-id');
  const userId = sessionToken || headerUserId;

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      warehouses: {
        include: {
          warehouse: true,
        },
      },
    },
  });

  if (!user || user.isBlocked) {
    return null;
  }

  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role as Role,
    isBlocked: user.isBlocked,
    warehouses: user.warehouses.map((w) => ({
      warehouseId: w.warehouse.id,
      warehouseName: w.warehouse.name,
    })),
  };
}

export function canAccessWarehouse(user: UserSession, warehouseId: string): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'MANAGER') {
    return user.warehouses.some((w) => w.warehouseId === warehouseId);
  }
  return false;
}

export function canManageUsers(user: UserSession): boolean {
  return user.role === 'ADMIN';
}
