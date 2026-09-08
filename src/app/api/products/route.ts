import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateRealMargin, calculatePriceForTargetMargin } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const meatOnly = searchParams.get("meatOnly");

    let query = supabase
      .from("cl_products")
      .select("*, category:cl_categories(*)");

    if (category) {
      query = query.eq("categoryId", category);
    }
    if (meatOnly === "true") {
      query = query.eq("isMeatCut", true);
    }

    const { data: products, error } = await query.order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const enriched = (products || []).map((p: any) => {
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

    const finalSellPrice =
      sellPrice > 0
        ? Number(sellPrice)
        : calculatePriceForTargetMargin(
            Number(costPrice),
            Number(targetMarginPercent),
            Number(estimatedWastePercent)
          );

    const id = genId("prod");

    const { data: product, error } = await supabase
      .from("cl_products")
      .insert({
        id,
        name,
        code: code || null,
        categoryId,
        unit,
        costPrice: Number(costPrice),
        estimatedWastePercent: Number(estimatedWastePercent),
        targetMarginPercent: Number(targetMarginPercent),
        sellPrice: finalSellPrice,
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        isMeatCut: Boolean(isMeatCut),
      })
      .select("*, category:cl_categories(*)")
      .single();

    if (error) {
      throw error;
    }

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

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code || null;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.costPrice !== undefined) updateData.costPrice = Number(data.costPrice);
    if (data.sellPrice !== undefined) updateData.sellPrice = Number(data.sellPrice);
    if (data.currentStock !== undefined) updateData.currentStock = Number(data.currentStock);
    if (data.estimatedWastePercent !== undefined)
      updateData.estimatedWastePercent = Number(data.estimatedWastePercent);
    if (data.targetMarginPercent !== undefined)
      updateData.targetMarginPercent = Number(data.targetMarginPercent);
    if (data.minStock !== undefined) updateData.minStock = Number(data.minStock);
    if (data.isMeatCut !== undefined) updateData.isMeatCut = Boolean(data.isMeatCut);

    const { data: updated, error } = await supabase
      .from("cl_products")
      .update(updateData)
      .eq("id", id)
      .select("*, category:cl_categories(*)")
      .single();

    if (error) {
      throw error;
    }

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

    const { error } = await supabase.from("cl_products").delete().eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "No se puede eliminar un producto con ventas o lotes asociados",
      },
      { status: 500 }
    );
  }
}
