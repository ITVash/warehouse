import { NextRequest } from "next/server";
import { StockService } from "@/src/services/stock.service";
import { requireRole } from "@/src/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);

    const searchParams = req.nextUrl.searchParams;
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) {
      return apiError("Не передан warehouseId", "MISSING_WAREHOUSE_ID", 400);
    }

    const groupId = searchParams.get("groupId") || undefined;
    const search = searchParams.get("search") || undefined;
    const stockStatus = (searchParams.get("stockStatus") as "ALL" | "IN_STOCK" | "ZERO_STOCK") || "ALL";

    const data = await StockService.getBalances({
      warehouseId,
      groupId,
      search,
      stockStatus,
    });

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
