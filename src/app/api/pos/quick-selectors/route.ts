import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildQuickSelectorsMap, ProductContext, RawSaleItem } from "@/lib/quickSelectors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Obtener productos activos
    const { data: dbProducts, error: prodErr } = await supabase
      .from("cl_products")
      .select("id, name, unit, sellPrice, category:cl_categories(name, slug)");

    if (prodErr) {
      throw prodErr;
    }

    const products: ProductContext[] = (dbProducts || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      sellPrice: Number(p.sellPrice || 0),
      categoryName: p.category?.name,
      categorySlug: p.category?.slug,
    }));

    // 2. Obtener items de ventas recientes (últimos 300 ítems vendidos)
    const { data: dbItems, error: itemsErr } = await supabase
      .from("cl_sale_items")
      .select("productId, quantity, unitPrice, subtotal, sale:cl_sales(date)")
      .order("id", { ascending: false })
      .limit(400);

    const saleItems: RawSaleItem[] = (dbItems || []).map((item: any) => ({
      productId: item.productId,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      subtotal: Number(item.subtotal || 0),
      date: item.sale?.date || new Date().toISOString(),
    }));

    // 3. Procesar patrones con recencia
    const selectorsMap = buildQuickSelectorsMap(products, saleItems);

    return NextResponse.json({
      success: true,
      data: selectorsMap,
    });
  } catch (error: any) {
    console.error("Error computing quick selectors:", error);
    // Fallback con productos básicos si falla la base de datos
    return NextResponse.json({
      success: false,
      error: error.message || "Error al calcular selectores rápidos",
      data: {},
    });
  }
}
