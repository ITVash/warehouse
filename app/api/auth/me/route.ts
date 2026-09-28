import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);

    if (!session) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Не авторизован',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: session,
      message: null,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      data: null,
      message: error.message || 'Ошибка сервера',
    }, { status: 500 });
  }
}
