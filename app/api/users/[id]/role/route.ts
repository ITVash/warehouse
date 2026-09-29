import { NextRequest } from "next/server";
import { UserService } from "@/src/services/user.service";
import { requireAdmin } from "@/src/lib/auth";
import { changeRoleSchema } from "@/src/lib/validations";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = requireAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const { role } = changeRoleSchema.parse(body);
    const updated = await UserService.changeRole(id, role, admin.id!);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
