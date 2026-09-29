import { NextRequest } from "next/server";
import { SupplierService } from "@/src/services/supplier.service";
import { requireRole } from "@/src/lib/auth";
import { supplierSchema } from "@/src/lib/validations";
import { apiSuccess, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const suppliers = await SupplierService.list();
    return apiSuccess(suppliers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const body = await req.json();
    const validated = supplierSchema.parse(body);
    const newSupplier = await SupplierService.create(validated);
    return apiSuccess(newSupplier, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
