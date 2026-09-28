import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession, canAccessWarehouse } from '@/lib/auth';
import { AuditService } from '@/services/stock.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Доступ ограничен' }, { status: 403 });

    const { id } = await params;
    const item = await prisma.nomenclature.findUnique({
      where: { id },
      include: {
        warehouse: true,
        group: true,
        balances: true,
        movements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { firstName: true, lastName: true, username: true },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, data: null, message: 'Товар не найден' }, { status: 404 });
    }

    if (!canAccessWarehouse(session, item.warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу этого товара' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...item,
        stockQuantity: item.balances.find((b) => b.warehouseId === item.warehouseId)?.quantity || 0,
      },
      message: null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Недостаточно прав' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.nomenclature.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, data: null, message: 'Товар не найден' }, { status: 404 });
    }

    if (!canAccessWarehouse(session, existing.warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    const body = await req.json();
    const { groupId, article, barcode, title, shortTitle, unit, price, minStock } = body;

    // Check unique barcode collision with another item
    if (barcode && barcode !== existing.barcode) {
      const collision = await prisma.nomenclature.findUnique({
        where: {
          warehouseId_barcode: {
            warehouseId: existing.warehouseId,
            barcode: barcode.trim(),
          },
        },
      });
      if (collision && collision.id !== id) {
        return NextResponse.json({ success: false, data: null, message: 'Штрихкод уже используется другим товаром' }, { status: 409 });
      }
    }

    const updated = await prisma.nomenclature.update({
      where: { id },
      data: {
        groupId: groupId || existing.groupId,
        article: article?.trim() || existing.article,
        barcode: barcode?.trim() || existing.barcode,
        title: title?.trim() || existing.title,
        shortTitle: shortTitle !== undefined ? shortTitle?.trim() : existing.shortTitle,
        unit: unit || existing.unit,
        price: price !== undefined ? parseFloat(price) : existing.price,
        minStock: minStock !== undefined ? parseInt(minStock) : existing.minStock,
      },
      include: {
        group: true,
      },
    });

    await AuditService.log({
      userId: session.id,
      warehouseId: existing.warehouseId,
      action: 'UPDATE',
      entity: 'NOMENCLATURE',
      entityId: id,
      oldData: existing,
      newData: updated,
    });

    return NextResponse.json({ success: true, data: updated, message: 'Товар успешно обновлен' });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role !== 'ADMIN') return NextResponse.json({ success: false, data: null, message: 'Удаление доступно только Администратору' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.nomenclature.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, data: null, message: 'Товар не найден' }, { status: 404 });
    }

    await prisma.nomenclature.delete({ where: { id } });

    await AuditService.log({
      userId: session.id,
      warehouseId: existing.warehouseId,
      action: 'DELETE',
      entity: 'NOMENCLATURE',
      entityId: id,
      oldData: existing,
    });

    return NextResponse.json({ success: true, data: null, message: 'Товар удален' });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
