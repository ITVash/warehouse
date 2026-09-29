import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Сессия завершена" });
  response.cookies.delete("negostore_session");
  return response;
}
