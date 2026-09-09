import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateAnimalDeboning, DeboningCutInput } from "@/lib/cattleEngine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: purchase, error } = await supabase
      .from("cl_cattle_purchases")
      .select(`
        *,
        cuts:cl_cattle_cuts(
          *,
          product:cl_products(*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!purchase) {
      return NextResponse.json(
        { success: false, error: "Compra no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: purchase });
  } catch (error: any) {
    console.error("Error fetching cattle purchase:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener la compra" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      batchNumber,
      animalType,
      supplier,
      purchaseDate,
      liveWeightKg,
      pricePerKgLive,
      additionalCosts,
      targetMarginPercent,
      notes,
    } = body;

    // Obtener datos actuales
    const { data: current, error: getErr } = await supabase
      .from("cl_cattle_purchases")
      .select("*, cuts:cl_cattle_cuts(*)")
      .eq("id", id)
      .single();

    if (getErr || !current) {
      return NextResponse.json(
        { success: false, error: "Registro no encontrado" },
        { status: 404 }
      );
    }

    const newLiveWeight = liveWeightKg !== undefined ? Number(liveWeightKg) : current.liveWeightKg;
    const newPrice = pricePerKgLive !== undefined ? Number(pricePerKgLive) : current.pricePerKgLive;
    const newAdditional = additionalCosts !== undefined ? additionalCosts : current.additionalCosts;
    const newTargetMargin = targetMarginPercent !== undefined ? Number(targetMarginPercent) : current.targetMarginPercent;

    const normAdditional = {
      transport: Number(newAdditional?.transport || 0),
      slaughter: Number(newAdditional?.slaughter || 0),
      deboning: Number(newAdditional?.deboning || 0),
      labor: Number(newAdditional?.labor || 0),
      cooling: Number(newAdditional?.cooling || 0),
      packaging: Number(newAdditional?.packaging || 0),
      other: Number(newAdditional?.other || 0),
      notes: newAdditional?.notes || "",
    };

    const totalAdditionalCosts =
      normAdditional.transport +
      normAdditional.slaughter +
      normAdditional.deboning +
      normAdditional.labor +
      normAdditional.cooling +
      normAdditional.packaging +
      normAdditional.other;

    const acquisitionCost = Math.round(newLiveWeight * newPrice);
    const totalAnimalCost = acquisitionCost + totalAdditionalCosts;

    const updatePayload: Record<string, any> = {
      liveWeightKg: newLiveWeight,
      pricePerKgLive: newPrice,
      acquisitionCost,
      additionalCosts: normAdditional,
      totalAdditionalCosts,
      totalAnimalCost,
      targetMarginPercent: newTargetMargin,
      updatedAt: new Date().toISOString(),
    };

    if (batchNumber) updatePayload.batchNumber = batchNumber.trim();
    if (animalType) updatePayload.animalType = animalType;
    if (supplier) updatePayload.supplier = supplier.trim();
    if (purchaseDate) updatePayload.purchaseDate = new Date(purchaseDate).toISOString();
    if (notes !== undefined) updatePayload.notes = notes;

    // Si ya tenía cortes registrados, recalculamos los costos atribuidos
    if (current.cuts && current.cuts.length > 0) {
      const deboningResult = calculateAnimalDeboning(
        newLiveWeight,
        newPrice,
        normAdditional,
        current.cuts as DeboningCutInput[],
        newTargetMargin
      );

      updatePayload.totalSellableWeightKg = deboningResult.totalSellableWeightKg;
      updatePayload.totalWasteKg = deboningResult.totalWasteKg;
      updatePayload.unrecoveredWeightKg = deboningResult.unrecoveredWeightKg;
      updatePayload.yieldPercent = deboningResult.yieldPercent;
      updatePayload.totalPotentialRevenue = deboningResult.totalPotentialRevenue;
      updatePayload.grossProfit = deboningResult.grossProfit;
      updatePayload.marginOnSalesPercent = deboningResult.marginOnSalesPercent;
      updatePayload.marginOnCostPercent = deboningResult.marginOnCostPercent;

      // Actualizar costos de los cortes existentes
      for (const cut of deboningResult.cuts) {
        await supabase
          .from("cl_cattle_cuts")
          .update({
            costAttributed: cut.costAttributed,
            costAttributedPerKg: cut.costAttributedPerKg,
            profit: cut.profit,
            realMarginPercent: cut.realMarginPercent,
            minSellPrice: cut.minSellPrice,
            recommendedPrice: cut.recommendedPrice,
          })
          .eq("id", cut.id);
      }
    }

    const { error: updateErr } = await supabase
      .from("cl_cattle_purchases")
      .update(updatePayload)
      .eq("id", id);

    if (updateErr) throw updateErr;

    const { data: updated } = await supabase
      .from("cl_cattle_purchases")
      .select(`
        *,
        cuts:cl_cattle_cuts(
          *,
          product:cl_products(*)
        )
      `)
      .eq("id", id)
      .single();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating cattle purchase:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar compra" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Eliminar cortes asociados
    await supabase.from("cl_cattle_cuts").delete().eq("purchaseId", id);

    // Eliminar compra
    const { error } = await supabase.from("cl_cattle_purchases").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Registro eliminado correctamente" });
  } catch (error: any) {
    console.error("Error deleting cattle purchase:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar registro" },
      { status: 500 }
    );
  }
}
