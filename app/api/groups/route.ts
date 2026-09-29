import { NextResponse } from "next/server";
import { GroupService } from "@/src/services/group.service";

export async function GET() {
  try {
    const list = await GroupService.getAll();
    return NextResponse.json({ success: true, data: list });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
