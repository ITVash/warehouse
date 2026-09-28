import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) {
      return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    }

    if (session.role === 'GUEST') {
      return NextResponse.json({ success: false, data: null, message: 'Ожидается предоставление доступа администратором' }, { status: 403 });
    }

    let warehouses;
    if (session.role === 'ADMIN') {
      warehouses = await prisma.warehouse.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
              comings: true,
            },
          },
        },
      });
    } else {
      warehouses = await prisma.warehouse.findMany({
        where: {
          users: {
            some: {
              userId: session.id,
            },
          },
        },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
              comings: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: warehouses,
      message: null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
  }
}
