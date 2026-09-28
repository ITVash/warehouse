import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession, canAccessWarehouse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Доступ ограничен' }, { status: 403 });

    const { searchParams } = req.nextUrl;
    const warehouseId = searchParams.get('warehouseId');
    const search = searchParams.get('q') || '';
    const groupId = searchParams.get('groupId') || '';
    const inStock = searchParams.get('inStock'); // 'all', 'positive', 'zero'

    if (!warehouseId) {
      return NextResponse.json({ success: false, data: null, message: 'Не указан ID склада' }, { status: 400 });
    }

    if (!canAccessWarehouse(session, warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    const where: any = { warehouseId };
    if (groupId) where.groupId = groupId;
    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { article: { contains: search.trim() } },
        { barcode: { contains: search.trim() } },
      ];
    }

    const products = await prisma.nomenclature.findMany({
      where,
      include: {
        group: true,
        balances: {
          where: { warehouseId },
        },
      },
      orderBy: { title: 'asc' },
    });

    let formatted = products.map((p) => {
      const quantity = p.balances[0]?.quantity || 0;
      return {
        id: p.id,
        productId: p.id,
        article: p.article,
        barcode: p.barcode,
        title: p.title,
        unit: p.unit,
        group: p.group.name,
        groupId: p.groupId,
        quantity,
        price: p.price,
        totalValue: quantity * p.price,
        minStock: p.minStock,
        status: quantity <= 0 ? 'Нет на складе' : quantity <= p.minStock ? 'Мало' : 'В наличии',
      };
    });

    if (inStock === 'positive') {
      formatted = formatted.filter((item) => item.quantity > 0);
    } else if (inStock === 'zero') {
      formatted = formatted.filter((item) => item.quantity <= 0);
    }

    return NextResponse.json({
      success: true,
      data: formatted,
      message: null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
