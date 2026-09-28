import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });
    if (session.role === 'GUEST') return NextResponse.json({ success: false, data: null, message: 'Доступ ограничен' }, { status: 403 });

    const search = req.nextUrl.searchParams.get('q') || '';

    const clients = await prisma.client.findMany({
      where: search ? {
        OR: [
          { name: { contains: search } },
          { inn: { contains: search } },
          { phone: { contains: search } },
        ]
      } : undefined,
      orderBy: { name: 'asc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: clients, message: null });
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
    const { name, inn, phone, address, email } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, data: null, message: 'Укажите наименование клиента' }, { status: 400 });
    }

    const existing = await prisma.client.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json({ success: false, data: null, message: 'Клиент с таким наименованием уже существует' }, { status: 409 });
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        inn: inn?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        email: email?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: client, message: 'Клиент успешно создан' });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
