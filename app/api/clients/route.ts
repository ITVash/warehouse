import { NextRequest } from "next/server";
import { ClientService } from "@/src/services/client.service";
import { requireRole } from "@/src/lib/auth";
import { clientSchema } from "@/src/lib/validations";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const clients = await ClientService.list();
    return apiSuccess(clients);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const body = await req.json();
    const validated = clientSchema.parse(body);
    const newClient = await ClientService.create(validated);
    return apiSuccess(newClient, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
