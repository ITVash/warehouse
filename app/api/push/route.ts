import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session) return NextResponse.json({ success: false, data: null, message: 'Не авторизован' }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
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

    const body = await req.json().catch(() => ({}));
    const { endpoint, p256dh, auth, markAllAsRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId: session.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, data: null, message: 'Уведомления прочитаны' });
    }

    if (endpoint && p256dh && auth) {
      const sub = await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { userId: session.id, p256dh, auth },
        create: {
          userId: session.id,
          endpoint,
          p256dh,
          auth,
        },
      });
      return NextResponse.json({ success: true, data: sub, message: 'Подписка на Web Push сохранена' });
    }

    return NextResponse.json({ success: true, data: null, message: 'OK' });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: err.message }, { status: 500 });
  }
}
