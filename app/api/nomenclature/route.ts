import { NextRequest, NextResponse } from "next/server";
import { NomenclatureService } from "@/src/services/nomenclature.service";
import { requireManager } from "@/src/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const barcode = searchParams.get("barcode");

    if (!warehouseId) {
      return NextResponse.json(
        { success: false, error: "Параметр warehouseId обязателен" },
        { status: 400 }
      );
    }

    if (barcode) {
      const item = await NomenclatureService.getByBarcode(warehouseId, barcode);
      if (!item) {
        return NextResponse.json(
          { success: false, error: "Товар по данному штрихкоду не найден" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          ...item,
          name: item.title,
          currentStock: item.quantity,
          retailPrice: item.price,
          purchasePrice: Math.round(item.price * 0.7),
        },
      });
    }

    const search = searchParams.get("search") || undefined;
    const groupId = searchParams.get("groupId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const result = await NomenclatureService.list({
      warehouseId,
      search,
      groupId,
      page,
      pageSize,
    });

    const enrichedItems = result.items.map((i) => ({
      ...i,
      name: i.title,
      currentStock: i.quantity,
      retailPrice: i.price,
      purchasePrice: Math.round(i.price * 0.7),
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        items: enrichedItems,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to list nomenclature" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    requireManager(req);
    const body = await req.json();

    const created = await NomenclatureService.create({
      warehouseId: body.warehouseId,
      article: body.article,
      barcode: body.barcode || null,
      title: body.title || body.name,
      shortTitle: body.shortTitle || null,
      groupId: body.groupId,
      price: Number(body.price || body.retailPrice || 0),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...created,
        name: created.title,
        currentStock: created.quantity,
        retailPrice: created.price,
      },
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 400;
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Failed to create nomenclature" },
      { status }
    );
  }
}
