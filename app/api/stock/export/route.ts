import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/src/services/stock.service";
import { requireRole } from "@/src/lib/auth";
import { apiError, handleApiError } from "@/src/lib/api-response";

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

    const csvContent = await StockService.generateCsv({
      warehouseId,
      groupId,
      search,
      stockStatus,
    });

    // Add UTF-8 BOM (\uFEFF) for proper Cyrillic rendering in Excel
    const bom = "\uFEFF";
    const fullContent = bom + csvContent;

    return new NextResponse(fullContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="negostore_stock_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
