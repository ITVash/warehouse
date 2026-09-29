import { NextRequest } from "next/server";
import { AuditService } from "@/src/services/audit.service";
import { requireAdmin } from "@/src/lib/auth";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const logs = await AuditService.list(100);
    return apiSuccess(logs);
  } catch (error) {
    return handleApiError(error);
  }
}
