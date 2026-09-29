import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/src/lib/auth";
import { UserService } from "@/src/services/user.service";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.id) {
      return NextResponse.json({ success: false, data: null }, { status: 401 });
    }

    const user = await UserService.getById(session.id);
    if (!user) {
      return NextResponse.json({ success: false, data: null }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
