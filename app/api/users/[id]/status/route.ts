import { NextRequest } from "next/server";
import { UserService } from "@/src/services/user.service";
import { requireAdmin } from "@/src/lib/auth";
import { changeUserStatusSchema } from "@/src/lib/validations";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = requireAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const { isActive } = changeUserStatusSchema.parse(body);
    const updated = await UserService.setStatus(id, isActive, admin.id!);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
