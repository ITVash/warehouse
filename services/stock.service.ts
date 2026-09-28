import prisma from '@/lib/prisma';
import { UserSession } from '@/types';

export class AuditService {
  static async log(params: {
    userId?: string | null;
    warehouseId?: string | null;
    action: string;
    entity: string;
    entityId: string;
    oldData?: any;
    newData?: any;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          warehouseId: params.warehouseId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldData: params.oldData ? JSON.stringify(params.oldData) : null,
          newData: params.newData ? JSON.stringify(params.newData) : null,
        },
      });
    } catch (e) {
      console.error('AuditLog error:', e);
    }
  }
}

export class NotificationService {
  static async createForWarehouseUsers(warehouseId: string, title: string, message: string, link?: string) {
    try {
      // Find all users with access to this warehouse or ADMIN
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'ADMIN' },
            { warehouses: { some: { warehouseId } } },
          ],
          isBlocked: false,
        },
        select: { id: true },
      });

      if (users.length === 0) return;

      for (const u of users) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            title,
            message,
            link,
          },
        });
      }
    } catch (e) {
      console.error('Notification creation error:', e);
    }
  }
}

export class StockService {
  static async getBalance(warehouseId: string, productId: string) {
    const balance = await prisma.stockBalance.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
    });
    return balance?.quantity || 0;
  }

  static async adjustStock(params: {
    warehouseId: string;
    productId: string;
    quantityDelta: number; // positive for incoming, negative for outgoing
    type: 'INCOMING' | 'OUTGOING' | 'ADJUSTMENT';
    referenceType: 'COMING' | 'ORDER' | 'MANUAL';
    referenceId?: string;
    comments?: string;
    userId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.stockBalance.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: params.warehouseId,
            productId: params.productId,
          },
        },
      });

      const currentQty = current?.quantity || 0;
      const newQty = currentQty + params.quantityDelta;

      if (newQty < 0) {
        throw new Error('Недостаточно товара на складе для выполнения операции');
      }

      const balance = await tx.stockBalance.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: params.warehouseId,
            productId: params.productId,
          },
        },
        update: {
          quantity: newQty,
        },
        create: {
          warehouseId: params.warehouseId,
          productId: params.productId,
          quantity: newQty,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          warehouseId: params.warehouseId,
          productId: params.productId,
          type: params.type,
          quantity: Math.abs(params.quantityDelta),
          referenceType: params.referenceType,
          referenceId: params.referenceId || null,
          comments: params.comments || null,
          createdById: params.userId || null,
        },
      });

      return { balance, movement };
    });
  }
}
