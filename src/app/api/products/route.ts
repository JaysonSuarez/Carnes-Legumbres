import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRealMargin, calculatePriceForTargetMargin } from "@/lib/finance";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const meatOnly = searchParams.get("meatOnly");

    const where: Record<string, unknown> = {};
    if (category) {
      where.categoryId = category;
    }
    if (meatOnly === "true") {
      where.isMeatCut = true;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        { category: { name: "asc" } },
        { name: "asc" },
      ],
    });

    const enriched = products.map((p) => {
      const realMargin = calculateRealMargin(p.costPrice, p.sellPrice);
      const suggestedPrice30 = calculatePriceForTargetMargin(
        p.costPrice,
        p.targetMarginPercent,
        p.estimatedWastePercent
      );
      const isOutOfStock = p.currentStock <= 0;
      const isLowStock = p.currentStock > 0 && p.currentStock <= p.minStock;

      return {
        ...p,
        realMargin,
        suggestedPrice30,
        isBelowTarget: realMargin < p.targetMarginPercent,
        isOutOfStock,
        isLowStock,
        hasStockAlert: isOutOfStock || isLowStock,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      categoryId,
      unit = "kg",
      costPrice = 0,
      estimatedWastePercent = 5,
      targetMarginPercent = 30,
      sellPrice = 0,
      currentStock = 0,
      minStock = 5,
      isMeatCut = false,
    } = body;

    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, error: "Nombre y categoría son requeridos" },
        { status: 400 }
      );
    }

    // Si no se proporcionó precio de venta o es 0, sugerir el que cumple la meta del 30%
    const finalSellPrice = sellPrice > 0
      ? Number(sellPrice)
      : calculatePriceForTargetMargin(Number(costPrice), Number(targetMarginPercent), Number(estimatedWastePercent));

    const product = await prisma.product.create({
      data: {
        name,
        code: code || undefined,
        categoryId,
        unit,
        costPrice: Number(costPrice),
        estimatedWastePercent: Number(estimatedWastePercent),
        targetMarginPercent: Number(targetMarginPercent),
        sellPrice: finalSellPrice,
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        isMeatCut: Boolean(isMeatCut),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear el producto" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID del producto requerido" },
        { status: 400 }
      );
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.unit && { unit: data.unit }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.costPrice !== undefined && { costPrice: Number(data.costPrice) }),
        ...(data.sellPrice !== undefined && { sellPrice: Number(data.sellPrice) }),
        ...(data.currentStock !== undefined && { currentStock: Number(data.currentStock) }),
        ...(data.estimatedWastePercent !== undefined && { estimatedWastePercent: Number(data.estimatedWastePercent) }),
        ...(data.targetMarginPercent !== undefined && { targetMarginPercent: Number(data.targetMarginPercent) }),
        ...(data.minStock !== undefined && { minStock: Number(data.minStock) }),
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar el producto" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { success: false, error: "No se puede eliminar un producto con ventas o lotes asociados" },
      { status: 500 }
    );
  }
}
