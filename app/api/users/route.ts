import { NextRequest } from "next/server";
import { UserService } from "@/src/services/user.service";
import { requireAdmin } from "@/src/lib/auth";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const users = await UserService.list();
    return apiSuccess(users);
  } catch (error) {
    return handleApiError(error);
  }
}
