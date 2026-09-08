import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateRealMargin } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: sales, error } = await supabase
      .from("cl_sales")
      .select(`
        *,
        items:cl_sale_items(
          *,
          product:cl_products(*)
        )
      `)
      .order("date", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: sales || [] });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener las ventas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName = "Cliente Mostrador",
      paymentMethod = "EFECTIVO",
      items = [], // { productId, quantity, unitPrice }
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "La venta debe incluir al menos un producto" },
        { status: 400 }
      );
    }

    // Obtener productos para conocer su costo actual
    const productIds = items.map((i: any) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("cl_products")
      .select("*, category:cl_categories(*)")
      .in("id", productIds);

    if (prodErr || !dbProducts) {
      throw prodErr || new Error("Error consultando productos de la venta");
    }

    const productMap = new Map(dbProducts.map((p: any) => [p.id, p]));

    let totalAmount = 0;
    let totalCost = 0;
    const saleId = genId("sale");

    const saleItemsData = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.productId}`);
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice || product.sellPrice);
      const unitCost = Number(product.costPrice);

      const subtotal = quantity * unitPrice;
      const costSubtotal = quantity * unitCost;
      const profit = subtotal - costSubtotal;
      const realMarginPercent = calculateRealMargin(unitCost, unitPrice);

      totalAmount += subtotal;
      totalCost += costSubtotal;

      return {
        id: genId("sitem"),
        saleId,
        productId: item.productId,
        quantity,
        unitCost,
        unitPrice,
        subtotal,
        profit,
        realMarginPercent,
      };
    });

    const totalProfit = totalAmount - totalCost;
    const realMarginPercent = calculateRealMargin(totalCost, totalAmount);
    const saleCode = `VTA-${Date.now().toString().slice(-6)}`;

    // 1. Insertar venta
    const { data: newSale, error: saleErr } = await supabase
      .from("cl_sales")
      .insert({
        id: saleId,
        saleCode,
        customerName,
        paymentMethod,
        totalAmount,
        totalCost,
        totalProfit,
        realMarginPercent,
      })
      .select()
      .single();

    if (saleErr) {
      throw saleErr;
    }

    // 2. Insertar items
    const { error: itemsErr } = await supabase
      .from("cl_sale_items")
      .insert(saleItemsData);

    if (itemsErr) {
      throw itemsErr;
    }

    // 3. Descontar stock y evaluar alertas
    const stockAlerts = [];
    for (const item of items) {
      const currentProd = productMap.get(item.productId);
      if (currentProd) {
        const newStock = Math.max(0, (currentProd.currentStock || 0) - Number(item.quantity));
        await supabase
          .from("cl_products")
          .update({
            currentStock: newStock,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", item.productId);

        if (newStock <= currentProd.minStock) {
          stockAlerts.push({
            id: currentProd.id,
            name: currentProd.name,
            unit: currentProd.unit,
            currentStock: newStock,
            minStock: currentProd.minStock,
            isOutOfStock: newStock <= 0,
            isLowStock: newStock > 0 && newStock <= currentProd.minStock,
            categoryName: currentProd.category?.name || "General",
          });
        }
      }
    }

    // Cargar venta completa con items
    const { data: completeSale } = await supabase
      .from("cl_sales")
      .select(`
        *,
        items:cl_sale_items(
          *,
          product:cl_products(*)
        )
      `)
      .eq("id", saleId)
      .single();

    return NextResponse.json({
      success: true,
      data: completeSale || newSale,
      stockAlerts,
    });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la venta" },
      { status: 500 }
    );
  }
}
