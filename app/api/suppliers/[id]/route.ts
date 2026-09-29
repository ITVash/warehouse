import { NextRequest } from "next/server";
import { SupplierService } from "@/src/services/supplier.service";
import { requireRole } from "@/src/lib/auth";
import { supplierSchema } from "@/src/lib/validations";
import { apiSuccess, apiError, handleApiError } from "@/src/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const supplier = await SupplierService.getById(id);
    if (!supplier) return apiError("Поставщик не найден", "NOT_FOUND", 404);
    return apiSuccess(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const body = await req.json();
    const validated = supplierSchema.partial().parse(body);
    const updated = await SupplierService.update(id, validated);
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(req, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    await SupplierService.delete(id);
    return apiSuccess({ message: "Поставщик удален" });
  } catch (error) {
    return handleApiError(error);
  }
}
