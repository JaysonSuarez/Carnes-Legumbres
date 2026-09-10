import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;

    const { data: purchase, error: getErr } = await supabase
      .from("cl_cattle_purchases")
      .select(`
        *,
        cuts:cl_cattle_cuts(
          *,
          product:cl_products(*)
        )
      `)
      .eq("id", id)
      .eq("tenantId", tenantId)
      .single();

    if (getErr || !purchase) {
      return NextResponse.json(
        { success: false, error: "Compra no encontrada" },
        { status: 404 }
      );
    }

    if (!purchase.cuts || purchase.cuts.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay cortes registrados para este animal" },
        { status: 400 }
      );
    }

    // 1. Aumentar stock y actualizar costos/precios en cl_products del mismo tenant
    const updatedProducts: Array<{ id: string; name: string; addedKg: number; newStock: number }> = [];

    for (const cut of purchase.cuts) {
      // Si el corte no tiene productId directo, intentamos empatar por nombre dentro del tenant
      let targetProdId = cut.productId;
      if (!targetProdId) {
        const { data: matched } = await supabase
          .from("cl_products")
          .select("id")
          .ilike("name", `%${cut.productName}%`)
          .eq("tenantId", tenantId)
          .limit(1)
          .maybeSingle();

        if (matched) {
          targetProdId = matched.id;
          await supabase
            .from("cl_cattle_cuts")
            .update({ productId: targetProdId })
            .eq("id", cut.id)
            .eq("tenantId", tenantId);
        }
      }

      if (targetProdId && cut.weightKg > 0) {
        const { data: prod } = await supabase
          .from("cl_products")
          .select("currentStock, name")
          .eq("id", targetProdId)
          .eq("tenantId", tenantId)
          .single();

        const currentStock = Number(prod?.currentStock || 0);
        const newStock = Number((currentStock + Number(cut.weightKg)).toFixed(2));

        const updateProdData: Record<string, any> = {
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        };

        if (cut.costAttributedPerKg > 0) {
          updateProdData.costPrice = Math.round(cut.costAttributedPerKg);
        }
        if (cut.actualSellPrice > 0) {
          updateProdData.sellPrice = Math.round(cut.actualSellPrice);
        }
        if (cut.marketPrice > 0) {
          updateProdData.marketPrice = Math.round(cut.marketPrice);
        }

        await supabase
          .from("cl_products")
          .update(updateProdData)
          .eq("id", targetProdId)
          .eq("tenantId", tenantId);

        updatedProducts.push({
          id: targetProdId,
          name: prod?.name || cut.productName,
          addedKg: cut.weightKg,
          newStock,
        });
      }
    }

    // 2. Sincronizar con cl_batches para compatibilidad global con Dashboard y Reportes
    let batchId = purchase.batchId;
    if (!batchId) {
      batchId = genId("batch");

      const notesDescription =
        `Desposte de ${purchase.animalType || "Res"} (${purchase.liveWeightKg} kg en pie @ $${purchase.pricePerKgLive}/kg). ` +
        `Rendimiento: ${purchase.yieldPercent}% (${purchase.totalSellableWeightKg} kg obtenidos). ` +
        `Gastos adicionales: $${purchase.totalAdditionalCosts || 0}. Costo total: $${purchase.totalAnimalCost}. ` +
        (purchase.notes ? `Observaciones: ${purchase.notes}` : "");

      await supabase.from("cl_batches").insert({
        id: batchId,
        batchNumber: purchase.batchNumber,
        supplier: purchase.supplier,
        batchType: "MEAT_WHOLESALE",
        totalCost: purchase.totalAnimalCost,
        totalWeightKg: purchase.liveWeightKg,
        notes: notesDescription,
        projectedRevenue: purchase.totalPotentialRevenue || 0,
        projectedRealMargin: purchase.marginOnSalesPercent || 0,
        status: "ACTIVE",
        tenantId,
      });

      // Insertar items del lote con tenantId
      const batchItems = purchase.cuts
        .filter((c: any) => c.productId && c.weightKg > 0)
        .map((c: any) => ({
          id: genId("bitem"),
          batchId,
          productId: c.productId,
          quantityKg: c.weightKg,
          wasteKg: 0,
          costAttributed: Math.round(c.costAttributedPerKg),
          suggestedSellPrice: c.recommendedPrice,
          actualSellPrice: c.actualSellPrice,
          projectedSubtotal: Math.round(c.potentialRevenue),
          soldQuantity: 0,
          tenantId,
        }));

      if (batchItems.length > 0) {
        await supabase.from("cl_batch_items").insert(batchItems);
      }
    }

    // 3. Actualizar estado de la compra a INVENTORY_LOADED
    await supabase
      .from("cl_cattle_purchases")
      .update({
        status: "INVENTORY_LOADED",
        batchId,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenantId", tenantId);

    // Retornar datos actualizados
    const { data: finalPurchase } = await supabase
      .from("cl_cattle_purchases")
      .select(`
        *,
        cuts:cl_cattle_cuts(
          *,
          product:cl_products(*)
        )
      `)
      .eq("id", id)
      .eq("tenantId", tenantId)
      .single();

    return NextResponse.json({
      success: true,
      message: "¡Kilos del desposte ingresados exitosamente al inventario y precios actualizados!",
      data: finalPurchase,
      updatedProducts,
    });
  } catch (error: any) {
    console.error("Error confirming cattle inventory:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al ingresar al inventario" },
      { status: 500 }
    );
  }
}
