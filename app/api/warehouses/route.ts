import { NextResponse } from "next/server";
import { WarehouseService } from "@/src/services/warehouse.service";

export async function GET() {
  try {
    const list = await WarehouseService.getAll();
    return NextResponse.json({ success: true, data: list });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}
