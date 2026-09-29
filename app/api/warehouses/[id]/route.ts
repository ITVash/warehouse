import { NextRequest } from "next/server";
import { WarehouseService } from "@/src/services/warehouse.service";
import { requireRole } from "@/src/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const warehouse = await WarehouseService.getById(id);
    if (!warehouse) {
      return apiError("Склад не найден", "NOT_FOUND", 404);
    }
    return apiSuccess(warehouse);
  } catch (error) {
    return handleApiError(error);
  }
}
