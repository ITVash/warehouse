import { NextRequest } from "next/server";
import { NomenclatureService } from "@/src/services/nomenclature.service";
import { requireRole } from "@/src/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ barcode: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);

    const { barcode } = await params;
    const warehouseId = req.nextUrl.searchParams.get("warehouseId");

    if (!warehouseId) {
      return apiError("Не передан warehouseId", "MISSING_WAREHOUSE_ID", 400);
    }

    const item = await NomenclatureService.getByBarcode(warehouseId, decodeURIComponent(barcode));
    if (!item) {
      return apiError("Товар с таким штрихкодом не найден на складе", "PRODUCT_NOT_FOUND_BY_BARCODE", 404);
    }

    return apiSuccess(item);
  } catch (error) {
    return handleApiError(error);
  }
}
