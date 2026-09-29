import { NextRequest } from "next/server";
import { IncomingService } from "@/src/services/incoming.service";
import { requireRole } from "@/src/lib/auth";
import { createIncomingSchema } from "@/src/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";
import { DocumentStatus } from "@/src/types";

export async function GET(req: NextRequest) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);

    const searchParams = req.nextUrl.searchParams;
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) {
      return apiError("Не передан warehouseId", "MISSING_WAREHOUSE_ID", 400);
    }

    const status = (searchParams.get("status") as DocumentStatus) || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const result = await IncomingService.list({
      warehouseId,
      status,
      supplierId,
      search,
      page,
      pageSize,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, ["ADMIN", "MANAGER"]);
    const body = await req.json();

    const validated = createIncomingSchema.parse(body);
    const incoming = await IncomingService.create({
      ...validated,
      userId: user.id!,
    });

    return apiSuccess(incoming, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
