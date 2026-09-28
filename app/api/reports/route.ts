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
    const type = searchParams.get('type') || 'stock'; // 'stock', 'movements', 'groups'

    if (!warehouseId) {
      return NextResponse.json({ success: false, data: null, message: 'Не указан ID склада' }, { status: 400 });
    }

    if (!canAccessWarehouse(session, warehouseId)) {
      return NextResponse.json({ success: false, data: null, message: 'Нет доступа к складу' }, { status: 403 });
    }

    if (type === 'groups') {
      const products = await prisma.nomenclature.findMany({
        where: { warehouseId },
        include: {
          group: true,
          balances: { where: { warehouseId } },
        },
      });

      const groupMap: Record<string, { name: string; totalItems: number; totalStock: number; totalValue: number }> = {};

      for (const p of products) {
        const gName = p.group.name;
        const qty = p.balances[0]?.quantity || 0;
        if (!groupMap[gName]) {
          groupMap[gName] = { name: gName, totalItems: 0, totalStock: 0, totalValue: 0 };
        }
        groupMap[gName].totalItems += 1;
        groupMap[gName].totalStock += qty;
        groupMap[gName].totalValue += qty * p.price;
      }

      return NextResponse.json({
        success: true,
        data: Object.values(groupMap),
        message: null,
      });
    }

    if (type === 'movements') {
      const movements = await prisma.stockMovement.findMany({
        where: { warehouseId },
        include: {
          product: { include: { group: true } },
          createdBy: { select: { firstName: true, lastName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      return NextResponse.json({
        success: true,
        data: movements,
        message: null,
      });
    }

    // Default: comprehensive stock report
    const stockProducts = await prisma.nomenclature.findMany({
      where: { warehouseId },
      include: {
        group: true,
        balances: { where: { warehouseId } },
      },
      orderBy: { title: 'asc' },
    });

    const reportData = stockProducts.map((p) => {
      const quantity = p.balances[0]?.quantity || 0;
      return {
        article: p.article,
        barcode: p.barcode,
        title: p.title,
        group: p.group.name,
        quantity,
        unit: p.unit,
        price: p.price,
        totalCost: quantity * p.price,
        status: quantity <= 0 ? 'Нет' : quantity <= p.minStock ? 'Мало' : 'В наличии',
      };
    });

    return NextResponse.json({
      success: true,
      data: reportData,
      message: null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
