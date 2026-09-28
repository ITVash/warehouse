import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({
    success: true,
    data: null,
    message: 'Выход выполнен',
  });
  res.cookies.delete('session_user_id');
  return res;
}
