import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession, canAccessWarehouse } from '@/lib/auth';
import { AuditService, NotificationService } from '@/services/stock.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Доступ ограничен' }, { status: 403 });

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        warehouse: true,
        client: true,
        createdBy: { select: { firstName: true, lastName: true, username: true } },
        items: {
          include: {
            product: {
              include: {
                balances: true,
              },
            },
          },
        },
      },
    });

    if (!order) return NextResponse.json({ success: false, data: null, message: 'Счет не найден' }, { status: 404 });
    if (!canAccessWarehouse(session, order.warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: order, message: null });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Недостаточно прав' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true, warehouse: true, client: true },
    });

    if (!existing) return NextResponse.json({ success: false, data: null, message: 'Счет не найден' }, { status: 404 });
    if (!canAccessWarehouse(session, existing.warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    const body = await req.json();
    const { status, comments } = body;

    // Handle transition to COMPLETED (Conducting order: stock -= quantity)
    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        // Check sufficient stock for every position
        for (const it of existing.items) {
          const bal = await tx.stockBalance.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: existing.warehouseId,
                productId: it.productId,
              },
            },
          });
          const currentQty = bal?.quantity || 0;
          if (currentQty < it.quantity) {
            throw new Error(`Недостаточно товара на складе для проведения счета. В наличии: ${currentQty}, требуется: ${it.quantity}`);
          }
        }

        // Deduct balances & log movements
        for (const it of existing.items) {
          await tx.stockBalance.update({
            where: {
              warehouseId_productId: {
                warehouseId: existing.warehouseId,
                productId: it.productId,
              },
            },
            data: {
              quantity: { decrement: it.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              warehouseId: existing.warehouseId,
              productId: it.productId,
              type: 'OUTGOING',
              quantity: it.quantity,
              referenceType: 'ORDER',
              referenceId: existing.id,
              comments: `Проведение счета №${existing.number}`,
              createdById: session.id,
            },
          });
        }
      }

      // If cancelling an already completed order, restore stock
      if (status === 'CANCELLED' && existing.status === 'COMPLETED') {
        for (const it of existing.items) {
          await tx.stockBalance.update({
            where: {
              warehouseId_productId: {
                warehouseId: existing.warehouseId,
                productId: it.productId,
              },
            },
            data: {
              quantity: { increment: it.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              warehouseId: existing.warehouseId,
              productId: it.productId,
              type: 'INCOMING',
              quantity: it.quantity,
              referenceType: 'ORDER',
              referenceId: existing.id,
              comments: `Отмена проведенного счета №${existing.number}`,
              createdById: session.id,
            },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: status || existing.status,
          comments: comments !== undefined ? comments : existing.comments,
        },
        include: {
          client: true,
          items: { include: { product: true } },
        },
      });
    });

    await AuditService.log({
      userId: session.id,
      warehouseId: existing.warehouseId,
      action: 'STATUS_CHANGE',
      entity: 'ORDER',
      entityId: id,
      oldData: { status: existing.status },
      newData: { status: updated.status },
    });

    await NotificationService.createForWarehouseUsers(
      existing.warehouseId,
      `Статус счета №${existing.number} изменен`,
      `Новый статус: ${updated.status}`,
      `/warehouse/${existing.warehouseId}/orders`
    );

    return NextResponse.json({ success: true, data: updated, message: 'Статус счета обновлен' });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
