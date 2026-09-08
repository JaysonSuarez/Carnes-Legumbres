import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateRealMargin } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: batches, error } = await supabase
      .from("cl_batches")
      .select(`
        *,
        items:cl_batch_items(
          *,
          product:cl_products(*)
        )
      `)
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    // Enriquecer con cálculo de avance de venta real
    const enriched = (batches || []).map((batch: any) => {
      let totalSoldKg = 0;
      let totalSellableKg = 0;
      let actualRevenueGenerated = 0;

      for (const item of batch.items || []) {
        totalSellableKg += Number(item.quantityKg || 0);
        totalSoldKg += Number(item.soldQuantity || 0);
        actualRevenueGenerated += Number(item.soldQuantity || 0) * Number(item.actualSellPrice || 0);
      }

      const progressPercent =
        totalSellableKg > 0
          ? Number(((totalSoldKg / totalSellableKg) * 100).toFixed(1))
          : 0;

      const breakEvenRatio =
        batch.totalCost > 0
          ? Number(((actualRevenueGenerated / batch.totalCost) * 100).toFixed(1))
          : 0;

      return {
        ...batch,
        totalSellableKg,
        totalSoldKg,
        actualRevenueGenerated,
        progressPercent,
        breakEvenRatio, // >= 100% significa que ya recuperó el costo del lote
        isBreakEvenReached: actualRevenueGenerated >= batch.totalCost,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener lotes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      batchNumber,
      supplier,
      invoiceNumber,
      batchType = "MEAT_WHOLESALE",
      totalCost,
      totalWeightKg,
      notes,
      items = [], // Array de { productId, quantityKg, wasteKg, costAttributed, actualSellPrice, suggestedSellPrice }
    } = body;

    if (!batchNumber || !totalCost || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Número de lote, costo total y al menos un producto son requeridos",
        },
        { status: 400 }
      );
    }

    // Calcular facturación proyectada
    let projectedRevenue = 0;
    for (const item of items) {
      const subtotal = Number(item.quantityKg) * Number(item.actualSellPrice);
      projectedRevenue += subtotal;
    }

    const projectedRealMargin = calculateRealMargin(Number(totalCost), projectedRevenue);
    const batchId = genId("batch");

    // 1. Insertar compra / lote
    const { error: batchErr } = await supabase.from("cl_batches").insert({
      id: batchId,
      batchNumber,
      supplier: supplier || "Proveedor Mayorista",
      invoiceNumber: invoiceNumber || null,
      batchType,
      totalCost: Number(totalCost),
      totalWeightKg: totalWeightKg ? Number(totalWeightKg) : null,
      notes: notes || null,
      projectedRevenue,
      projectedRealMargin,
      status: "ACTIVE",
    });

    if (batchErr) {
      throw batchErr;
    }

    // 2. Insertar items del lote
    const batchItemsData = items.map((item: any) => ({
      id: genId("bitem"),
      batchId,
      productId: item.productId,
      quantityKg: Number(item.quantityKg),
      wasteKg: Number(item.wasteKg || 0),
      costAttributed: Number(item.costAttributed || 0),
      suggestedSellPrice: Number(item.suggestedSellPrice || 0),
      actualSellPrice: Number(item.actualSellPrice),
      projectedSubtotal: Number(item.quantityKg) * Number(item.actualSellPrice),
      soldQuantity: 0,
    }));

    const { error: itemsErr } = await supabase
      .from("cl_batch_items")
      .insert(batchItemsData);

    if (itemsErr) {
      throw itemsErr;
    }

    // 3. Actualizar stock y precios en la tabla de productos
    for (const item of items) {
      const { data: prod } = await supabase
        .from("cl_products")
        .select("currentStock")
        .eq("id", item.productId)
        .single();

      const newStock = (prod?.currentStock || 0) + Number(item.quantityKg);
      const updateData: Record<string, any> = {
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
      };
      if (Number(item.costAttributed) > 0) {
        updateData.costPrice = Number(item.costAttributed);
      }
      if (Number(item.actualSellPrice) > 0) {
        updateData.sellPrice = Number(item.actualSellPrice);
      }

      await supabase.from("cl_products").update(updateData).eq("id", item.productId);
    }

    // Consultar lote completo creado
    const { data: completeBatch } = await supabase
      .from("cl_batches")
      .select(`
        *,
        items:cl_batch_items(
          *,
          product:cl_products(*)
        )
      `)
      .eq("id", batchId)
      .single();

    return NextResponse.json({ success: true, data: completeBatch });
  } catch (error: any) {
    console.error("Error creating batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al registrar el lote de compra",
      },
      { status: 500 }
    );
  }
}
