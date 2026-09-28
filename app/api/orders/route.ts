import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession, canAccessWarehouse } from '@/lib/auth';
import { AuditService, NotificationService, StockService } from '@/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Доступ ограничен' }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const search = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    if (!warehouseId) {
      return NextResponse.json({ success: false, data: null, message: 'Не указан ID склада' }, { status: 400 });
    }

    if (!canAccessWarehouse(session, warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    const where: any = { warehouseId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (search.trim()) {
      where.OR = [
        { number: { contains: search.trim() } },
        { client: { name: { contains: search.trim() } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          client: true,
          createdBy: { select: { firstName: true, lastName: true, username: true } },
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      message: null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Недостаточно прав' }, { status: 403 });

    const body = await req.json();
    const { warehouseId, clientId, number, comments, items, status = 'DRAFT' } = body;

    if (!warehouseId || !clientId || !number || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, data: null, message: 'Заполните обязательные поля и добавьте хотя бы 1 позицию' }, { status: 400 });
    }

    if (!canAccessWarehouse(session, warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    // Check unique order number within warehouse
    const existing = await prisma.order.findUnique({
      where: {
        warehouseId_number: {
          warehouseId,
          number: number.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: false, data: null, message: 'Счет с таким номером уже существует на этом складе' }, { status: 409 });
    }

    const calculatedTotal = items.reduce((acc: number, it: any) => acc + (parseFloat(it.quantity) || 1) * (parseFloat(it.price) || 0), 0);

    const createdOrder = await prisma.$transaction(async (tx) => {
      // If status is COMPLETED immediately upon creation, verify stock balance
      if (status === 'COMPLETED') {
        for (const it of items) {
          const bal = await tx.stockBalance.findUnique({
            where: {
              warehouseId_productId: { warehouseId, productId: it.productId },
            },
          });
          const available = bal?.quantity || 0;
          if (available < it.quantity) {
            throw new Error(`Недостаточно товара на складе (требуется: ${it.quantity}, в наличии: ${available})`);
          }
        }
      }

      const order = await tx.order.create({
        data: {
          warehouseId,
          clientId,
          number: number.trim(),
          status,
          comments: comments?.trim() || null,
          totalAmount: calculatedTotal,
          createdById: session.id,
          items: {
            create: items.map((it: any) => ({
              productId: it.productId,
              quantity: parseFloat(it.quantity) || 1,
              price: parseFloat(it.price) || 0,
            })),
          },
        },
        include: {
          client: true,
          items: { include: { product: true } },
          warehouse: true,
        },
      });

      // Deduct stock if COMPLETED
      if (status === 'COMPLETED') {
        for (const it of items) {
          const qty = parseFloat(it.quantity) || 1;
          await tx.stockBalance.upsert({
            where: { warehouseId_productId: { warehouseId, productId: it.productId } },
            update: { quantity: { decrement: qty } },
            create: { warehouseId, productId: it.productId, quantity: -qty },
          });

          await tx.stockMovement.create({
            data: {
              warehouseId,
              productId: it.productId,
              type: 'OUTGOING',
              quantity: qty,
              referenceType: 'ORDER',
              referenceId: order.id,
              comments: `Проведение счета №${order.number}`,
              createdById: session.id,
            },
          });
        }
      }

      return order;
    });

    await AuditService.log({
      userId: session.id,
      warehouseId,
      action: 'CREATE',
      entity: 'ORDER',
      entityId: createdOrder.id,
      newData: { number, status, totalAmount: calculatedTotal },
    });

    await NotificationService.createForWarehouseUsers(
      warehouseId,
      `Создан новый счет №${createdOrder.number}`,
      `Склад: ${createdOrder.warehouse.name}. Клиент: ${createdOrder.client.name}. Сумма: ${createdOrder.totalAmount.toLocaleString()} ₽`,
      `/warehouse/${warehouseId}/orders`
    );

    return NextResponse.json({ success: true, data: createdOrder, message: 'Счет успешно создан' });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
