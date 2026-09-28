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
    const coming = await prisma.coming.findUnique({
      where: { id },
      include: {
        warehouse: true,
        supplier: true,
        createdBy: { select: { firstName: true, lastName: true, username: true } },
        items: {
          include: {
            product: {
              include: { balances: true },
            },
          },
        },
      },
    });

    if (!coming) return NextResponse.json({ success: false, data: null, message: 'Приход не найден' }, { status: 404 });
    if (!canAccessWarehouse(session, coming.warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: coming, message: null });
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
    const existing = await prisma.coming.findUnique({
      where: { id },
      include: { items: true, warehouse: true, supplier: true },
    });

    if (!existing) return NextResponse.json({ success: false, data: null, message: 'Приход не найден' }, { status: 404 });
    if (!canAccessWarehouse(session, existing.warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    const body = await req.json();
    const { status, comments } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // Transition to COMPLETED (Conducting incoming: stock += quantity)
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        for (const it of existing.items) {
          await tx.stockBalance.upsert({
            where: {
              warehouseId_productId: {
                warehouseId: existing.warehouseId,
                productId: it.productId,
              },
            },
            update: {
              quantity: { increment: it.quantity },
            },
            create: {
              warehouseId: existing.warehouseId,
              productId: it.productId,
              quantity: it.quantity,
            },
          });

          await tx.stockMovement.create({
            data: {
              warehouseId: existing.warehouseId,
              productId: it.productId,
              type: 'INCOMING',
              quantity: it.quantity,
              referenceType: 'COMING',
              referenceId: existing.id,
              comments: `Проведение прихода №${existing.number}`,
              createdById: session.id,
            },
          });
        }
      }

      // If cancelling an already completed coming receipt, check that we don't cause negative stock
      if (status === 'CANCELLED' && existing.status === 'COMPLETED') {
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
            throw new Error(`Невозможно отменить приход: товар уже списан со склада (остаток: ${currentQty}, приход был на: ${it.quantity})`);
          }
        }

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
              referenceType: 'COMING',
              referenceId: existing.id,
              comments: `Отмена проведенного прихода №${existing.number}`,
              createdById: session.id,
            },
          });
        }
      }

      return tx.coming.update({
        where: { id },
        data: {
          status: status || existing.status,
          comments: comments !== undefined ? comments : existing.comments,
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });
    });

    await AuditService.log({
      userId: session.id,
      warehouseId: existing.warehouseId,
      action: 'STATUS_CHANGE',
      entity: 'COMING',
      entityId: id,
      oldData: { status: existing.status },
      newData: { status: updated.status },
    });

    await NotificationService.createForWarehouseUsers(
      existing.warehouseId,
      `Статус прихода №${existing.number} изменен`,
      `Новый статус: ${updated.status}`,
      `/warehouse/${existing.warehouseId}/coming`
    );

    return NextResponse.json({ success: true, data: updated, message: 'Статус прихода обновлен' });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
