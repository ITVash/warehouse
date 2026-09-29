import { NextRequest, NextResponse } from "next/server";
import { NomenclatureService } from "@/src/services/nomenclature.service";
import { requireManager } from "@/src/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireManager(req);
    const { id } = await params;
    const body = await req.json();

    const updated = await NomenclatureService.update(id, {
      article: body.article,
      barcode: body.barcode,
      title: body.title || body.name,
      shortTitle: body.shortTitle,
      groupId: body.groupId,
      price: body.price !== undefined ? Number(body.price) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        name: updated.title,
        currentStock: updated.quantity,
        retailPrice: updated.price,
      },
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 400;
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to update item" },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireManager(req);
    const { id } = await params;
    await NomenclatureService.delete(id);
    return NextResponse.json({ success: true, message: "Товар удалён" });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 400;
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to delete item" },
      { status }
    );
  }
}
