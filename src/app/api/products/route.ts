import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateRealMargin, calculatePriceForTargetMargin } from "@/lib/finance";
import { getTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const meatOnly = searchParams.get("meatOnly");

    let query = supabase
      .from("cl_products")
      .select("*, category:cl_categories(*)")
      .eq("tenantId", tenantId);

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
    const tenantId = getTenantId(request);
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
        tenantId,
      })
      .select("*, category:cl_categories(*)")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, error: error?.message || error?.details || "Error al crear el producto" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
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

    // Consultar estado previo para detectar cambios de precio o stock
    const { data: oldProduct } = await supabase
      .from("cl_products")
      .select("name, sellPrice, currentStock, unit")
      .eq("id", id)
      .eq("tenantId", tenantId)
      .single();

    const { data: updated, error } = await supabase
      .from("cl_products")
      .update(updateData)
      .eq("id", id)
      .eq("tenantId", tenantId)
      .select("*, category:cl_categories(*)")
      .single();

    if (error) {
      throw error;
    }

    // Medida de seguridad: Si el cambio fue realizado desde mostrador o por el cajero, notificar al admin
    const isPriceChanged =
      oldProduct &&
      data.sellPrice !== undefined &&
      Number(data.sellPrice) !== Number(oldProduct.sellPrice);

    const isStockChanged =
      oldProduct &&
      data.currentStock !== undefined &&
      Number(data.currentStock) !== Number(oldProduct.currentStock);

    const isFromCashier =
      body.updatedByRole === "cashier" ||
      body.updatedByUser === "mostrador" ||
      body.source === "mostrador" ||
      request.headers.get("x-user-role") === "cashier";

    if (isFromCashier && (isPriceChanged || isStockChanged)) {
      const notifId = genId("notif");
      const formatCop = (val: number) =>
        new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          maximumFractionDigits: 0,
        }).format(val);

      let notifType = "PRICE_CHANGE";
      let notifTitle = "⚠️ Cambio de Precio desde Mostrador";
      let notifMessage = "";

      if (isPriceChanged && isStockChanged) {
        notifType = "PRICE_CHANGE";
        notifTitle = "⚠️ Cambio de Precio y Stock en Mostrador";
        notifMessage = `El mostrador modificó "${oldProduct.name}": Precio de ${formatCop(
          oldProduct.sellPrice
        )} a ${formatCop(Number(data.sellPrice))} y Stock de ${oldProduct.currentStock} a ${
          data.currentStock
        } ${oldProduct.unit}.`;
      } else if (isPriceChanged) {
        notifType = "PRICE_CHANGE";
        notifTitle = "⚠️ Cambio de Precio desde Mostrador";
        notifMessage = `El mostrador modificó el precio de "${oldProduct.name}" de ${formatCop(
          oldProduct.sellPrice
        )} a ${formatCop(Number(data.sellPrice))}/${oldProduct.unit}.`;
      } else {
        notifType = "STOCK_CHANGE";
        notifTitle = "📦 Ajuste de Inventario desde Mostrador";
        notifMessage = `El mostrador ajustó el stock de "${oldProduct.name}" de ${oldProduct.currentStock} a ${data.currentStock} ${oldProduct.unit}.`;
      }

      await supabase.from("cl_notifications").insert({
        id: notifId,
        tenantId,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        metadata: {
          productId: id,
          productName: oldProduct.name,
          oldPrice: oldProduct.sellPrice,
          newPrice: Number(data.sellPrice),
          oldStock: oldProduct.currentStock,
          newStock: Number(data.currentStock),
          changedBy: body.updatedByUser || "mostrador",
          role: body.updatedByRole || "cashier",
          source: body.source || "mostrador",
        },
        readByAdmin: false,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { success: false, error: error?.message || error?.details || "Error al actualizar el producto" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    // Eliminar referencias asociadas para garantizar integridad y permitir borrado limpio dentro del mismo tenant
    await supabase.from("cl_waste_logs").delete().eq("productId", id).eq("tenantId", tenantId);
    await supabase.from("cl_batch_items").delete().eq("productId", id).eq("tenantId", tenantId);
    await supabase.from("cl_sale_items").delete().eq("productId", id).eq("tenantId", tenantId);

    const { error } = await supabase.from("cl_products").delete().eq("id", id).eq("tenantId", tenantId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Producto eliminado correctamente" });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || error?.details || "Error al eliminar el producto",
      },
      { status: 500 }
    );
  }
}
