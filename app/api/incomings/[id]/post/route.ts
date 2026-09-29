import { NextRequest } from "next/server";
import { IncomingService } from "@/src/services/incoming.service";
import { requireRole } from "@/src/lib/auth";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;

    const postedIncoming = await IncomingService.post(id, user.id!);
    return apiSuccess(postedIncoming);
  } catch (error) {
    return handleApiError(error);
  }
}
