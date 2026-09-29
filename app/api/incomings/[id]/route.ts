import { NextRequest } from "next/server";
import { IncomingService } from "@/src/services/incoming.service";
import { requireRole } from "@/src/lib/auth";
import { updateIncomingSchema } from "@/src/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const incoming = await IncomingService.getById(id);
    if (!incoming) {
      return apiError("Приход не найден", "NOT_FOUND", 404);
    }
    return apiSuccess(incoming);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const body = await req.json();

    const validated = updateIncomingSchema.parse(body);
    const updated = await IncomingService.update(id, {
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

    const deleted = await IncomingService.delete(id, user.id!);
    if (!deleted) {
      return apiError("Приход не найден", "NOT_FOUND", 404);
    }

    return apiSuccess({ message: "Приход успешно удален" });
  } catch (error) {
    return handleApiError(error);
  }
}
