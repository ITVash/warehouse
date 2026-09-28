import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession, canAccessWarehouse } from '@/lib/auth';
import { AuditService } from '@/services/stock.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Доступ ограничен' }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const warehouseId = searchParams.get('warehouseId');
    const search = searchParams.get('q') || '';
    const groupId = searchParams.get('groupId') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    if (!warehouseId) {
      return NextResponse.json({ success: false, data: null, message: 'Не указан ID склада' }, { status: 400 });
    }

    if (!canAccessWarehouse(session, warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к данному складу' }, { status: 403 });
    }

    const where: any = {
      warehouseId,
    };

    if (groupId) {
      where.groupId = groupId;
    }

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { article: { contains: q } },
        { barcode: { contains: q } },
        { shortTitle: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.nomenclature.count({ where }),
      prisma.nomenclature.findMany({
        where,
        include: {
          group: true,
          balances: {
            where: { warehouseId },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map((item) => ({
      ...item,
      stockQuantity: item.balances[0]?.quantity || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: formattedItems,
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
    const { warehouseId, groupId, article, barcode, title, shortTitle, unit, price, minStock, initialStock } = body;

    if (!warehouseId || !groupId || !article || !barcode || !title) {
      return NextResponse.json({ success: false, data: null, message: 'Заполните все обязательные поля' }, { status: 400 });
    }

    if (!canAccessWarehouse(session, warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к данному складу' }, { status: 403 });
    }

    // Check unique barcode within warehouse
    const existing = await prisma.nomenclature.findUnique({
      where: {
        warehouseId_barcode: {
          warehouseId,
          barcode: barcode.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: false, data: null, message: 'Товар с таким штрихкодом уже зарегистрирован на складе' }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.nomenclature.create({
        data: {
          warehouseId,
          groupId,
          article: article.trim(),
          barcode: barcode.trim(),
          title: title.trim(),
          shortTitle: shortTitle?.trim() || null,
          unit: unit || 'шт',
          price: parseFloat(price) || 0,
          minStock: parseInt(minStock) || 0,
        },
        include: {
          group: true,
        },
      });

      const initialQty = parseFloat(initialStock) || 0;
      const balance = await tx.stockBalance.create({
        data: {
          warehouseId,
          productId: product.id,
          quantity: initialQty,
        },
      });

      if (initialQty > 0) {
        await tx.stockMovement.create({
          data: {
            warehouseId,
            productId: product.id,
            type: 'INCOMING',
            quantity: initialQty,
            referenceType: 'MANUAL',
            comments: 'Начальный ввод остатка при создании номенклатуры',
            createdById: session.id,
          },
        });
      }

      return { product, balance };
    });

    await AuditService.log({
      userId: session.id,
      warehouseId,
      action: 'CREATE',
      entity: 'NOMENCLATURE',
      entityId: created.product.id,
      newData: { title, article, barcode, initialStock },
    });

    return NextResponse.json({
      success: true,
      data: created.product,
      message: 'Товар успешно добавлен',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
