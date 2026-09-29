import { NextRequest } from "next/server";
import { OrderService } from "@/src/services/order.service";
import { requireRole } from "@/src/lib/auth";
import { updateOrderSchema } from "@/src/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const order = await OrderService.getById(id);
    if (!order) {
      return apiError("Счёт не найден", "NOT_FOUND", 404);
    }
    return apiSuccess(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const body = await req.json();

    const validated = updateOrderSchema.parse(body);
    const updated = await OrderService.update(id, {
      ...validated,
      userId: user.id!,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;

    const deleted = await OrderService.delete(id, user.id!);
    if (!deleted) {
      return apiError("Счёт не найден", "NOT_FOUND", 404);
    }

    return apiSuccess({ message: "Счёт успешно удален" });
  } catch (error) {
    return handleApiError(error);
  }
}
