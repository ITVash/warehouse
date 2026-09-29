import { NextRequest } from "next/server";
import { ClientService } from "@/src/services/client.service";
import { requireRole } from "@/src/lib/auth";
import { clientSchema } from "@/src/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const client = await ClientService.getById(id);
    if (!client) return apiError("Клиент не найден", "NOT_FOUND", 404);
    return apiSuccess(client);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const body = await req.json();
    const validated = clientSchema.partial().parse(body);
    const updated = await ClientService.update(id, validated);
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    await ClientService.delete(id);
    return apiSuccess({ message: "Клиент удален" });
  } catch (error) {
    return handleApiError(error);
  }
}
