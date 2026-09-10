import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateAnimalDeboning, DeboningCutInput } from "@/lib/cattleEngine";
import { getTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = getTenantId(request);
    const { id } = await params;
    const body = await request.json();
    const { cuts = [] } = body;

    if (!cuts || cuts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debes registrar al menos un corte o subproducto" },
        { status: 400 }
      );
    }

    // Obtener la compra del animal dentro del tenant
    const { data: purchase, error: getErr } = await supabase
      .from("cl_cattle_purchases")
      .select("*")
      .eq("id", id)
      .eq("tenantId", tenantId)
      .single();

    if (getErr || !purchase) {
      return NextResponse.json(
        { success: false, error: "Compra de ganado no encontrada" },
        { status: 404 }
      );
    }

    // Realizar los cálculos contables y de rendimiento
    const deboningResult = calculateAnimalDeboning(
      purchase.liveWeightKg,
      purchase.pricePerKgLive,
      purchase.additionalCosts || {},
      cuts as DeboningCutInput[],
      purchase.targetMarginPercent || 30
    );

    // Actualizar la compra de ganado
    const updatePayload = {
      debonedDate: new Date().toISOString(),
      totalSellableWeightKg: deboningResult.totalSellableWeightKg,
      totalWasteKg: deboningResult.totalWasteKg,
      unrecoveredWeightKg: deboningResult.unrecoveredWeightKg,
      yieldPercent: deboningResult.yieldPercent,
      totalPotentialRevenue: deboningResult.totalPotentialRevenue,
      grossProfit: deboningResult.grossProfit,
      marginOnSalesPercent: deboningResult.marginOnSalesPercent,
      marginOnCostPercent: deboningResult.marginOnCostPercent,
      status: purchase.status === "INVENTORY_LOADED" ? "INVENTORY_LOADED" : "DEBONED",
      updatedAt: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("cl_cattle_purchases")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenantId", tenantId);

    if (updateErr) throw updateErr;

    // Eliminar cortes existentes y reinsertar con los cálculos actualizados para este tenant
    await supabase.from("cl_cattle_cuts").delete().eq("purchaseId", id).eq("tenantId", tenantId);

    const cutsPayload = deboningResult.cuts.map((c) => ({
      id: genId("cut"),
      purchaseId: id,
      productId: c.productId || null,
      productName: c.productName,
      classification: c.classification,
      weightKg: c.weightKg,
      expectedWeightKg: c.expectedWeightKg,
      weightDiffKg: c.weightDiffKg,
      weightDiffPercent: c.weightDiffPercent,
      actualSellPrice: c.actualSellPrice,
      marketPrice: c.marketPrice,
      potentialRevenue: c.potentialRevenue,
      valueSharePercent: c.valueSharePercent,
      costAttributed: c.costAttributed,
      costAttributedPerKg: c.costAttributedPerKg,
      profit: c.profit,
      realMarginPercent: c.realMarginPercent,
      minSellPrice: c.minSellPrice,
      recommendedPrice: c.recommendedPrice,
      tenantId,
      createdAt: new Date().toISOString(),
    }));

    const { error: cutsInsertErr } = await supabase
      .from("cl_cattle_cuts")
      .insert(cutsPayload);

    if (cutsInsertErr) throw cutsInsertErr;

    // Obtener el registro completo actualizado
    const { data: updatedPurchase } = await supabase
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
      data: updatedPurchase,
      metrics: deboningResult,
    });
  } catch (error: any) {
    console.error("Error registering cattle deboning:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar el desposte" },
      { status: 500 }
    );
  }
}
