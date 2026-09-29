import { NextRequest } from "next/server";
import { OrderService } from "@/src/services/order.service";
import { requireRole } from "@/src/lib/auth";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;

    const postedOrder = await OrderService.post(id, user.id!);
    return apiSuccess(postedOrder);
  } catch (error) {
    return handleApiError(error);
  }
}
