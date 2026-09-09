import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateAnimalDeboning, DeboningCutInput } from "@/lib/cattleEngine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const animalType = searchParams.get("animalType");
    const supplier = searchParams.get("supplier");

    let query = supabase
      .from("cl_cattle_purchases")
      .select(`
        *,
        cuts:cl_cattle_cuts(
          *,
          product:cl_products(*)
        )
      `)
      .order("purchaseDate", { ascending: false });

    if (status) query = query.eq("status", status);
    if (animalType) query = query.eq("animalType", animalType);
    if (supplier) query = query.ilike("supplier", `%${supplier}%`);

    const { data: purchases, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: purchases || [] });
  } catch (error: any) {
    console.error("Error fetching cattle purchases:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener compras de ganado" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      batchNumber,
      animalType = "Novilla",
      supplier = "Ganado en Pie",
      purchaseDate,
      liveWeightKg,
      pricePerKgLive,
      additionalCosts = {},
      targetMarginPercent = 30,
      notes,
      cuts = [],
    } = body;

    const numLiveWeight = Number(liveWeightKg);
    const numPrice = Number(pricePerKgLive);

    if (!numLiveWeight || numLiveWeight <= 0) {
      return NextResponse.json(
        { success: false, error: "El peso en pie debe ser mayor a 0 kg" },
        { status: 400 }
      );
    }

    if (!numPrice || numPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "El precio de compra por kg debe ser mayor a $0" },
        { status: 400 }
      );
    }

    const generatedBatchNumber =
      (batchNumber && batchNumber.trim()) || `RES-${Date.now().toString().slice(-4)}`;

    const id = genId("cat");

    const normAdditional = {
      transport: Number(additionalCosts.transport || 0),
      slaughter: Number(additionalCosts.slaughter || 0),
      deboning: Number(additionalCosts.deboning || 0),
      labor: Number(additionalCosts.labor || 0),
      cooling: Number(additionalCosts.cooling || 0),
      packaging: Number(additionalCosts.packaging || 0),
      other: Number(additionalCosts.other || 0),
      notes: additionalCosts.notes || "",
    };

    const totalAdditionalCosts =
      normAdditional.transport +
      normAdditional.slaughter +
      normAdditional.deboning +
      normAdditional.labor +
      normAdditional.cooling +
      normAdditional.packaging +
      normAdditional.other;

    const acquisitionCost = Math.round(numLiveWeight * numPrice);
    const totalAnimalCost = acquisitionCost + totalAdditionalCosts;

    // Si ya trae cortes, calculamos el desposte
    let deboningResult = null;
    let initialStatus = "PURCHASED";

    if (cuts && cuts.length > 0) {
      deboningResult = calculateAnimalDeboning(
        numLiveWeight,
        numPrice,
        normAdditional,
        cuts as DeboningCutInput[],
        Number(targetMarginPercent)
      );
      initialStatus = "DEBONED";
    }

    const purchasePayload: Record<string, any> = {
      id,
      batchNumber: generatedBatchNumber,
      animalType,
      supplier: supplier.trim() || "Ganado en Pie",
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
      liveWeightKg: numLiveWeight,
      pricePerKgLive: numPrice,
      acquisitionCost,
      additionalCosts: normAdditional,
      totalAdditionalCosts,
      totalAnimalCost,
      targetMarginPercent: Number(targetMarginPercent),
      status: initialStatus,
      notes: notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (deboningResult) {
      purchasePayload.debonedDate = new Date().toISOString();
      purchasePayload.totalSellableWeightKg = deboningResult.totalSellableWeightKg;
      purchasePayload.totalWasteKg = deboningResult.totalWasteKg;
      purchasePayload.unrecoveredWeightKg = deboningResult.unrecoveredWeightKg;
      purchasePayload.yieldPercent = deboningResult.yieldPercent;
      purchasePayload.totalPotentialRevenue = deboningResult.totalPotentialRevenue;
      purchasePayload.grossProfit = deboningResult.grossProfit;
      purchasePayload.marginOnSalesPercent = deboningResult.marginOnSalesPercent;
      purchasePayload.marginOnCostPercent = deboningResult.marginOnCostPercent;
    }

    const { error: purchaseErr } = await supabase
      .from("cl_cattle_purchases")
      .insert(purchasePayload);

    if (purchaseErr) throw purchaseErr;

    // Insertar cortes si aplica
    if (deboningResult && deboningResult.cuts.length > 0) {
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
        createdAt: new Date().toISOString(),
      }));

      const { error: cutsErr } = await supabase.from("cl_cattle_cuts").insert(cutsPayload);
      if (cutsErr) throw cutsErr;
    }

    // Retornar compra creada completa
    const { data: created, error: getErr } = await supabase
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

    if (getErr) throw getErr;

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error("Error creating cattle purchase:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar la compra del animal" },
      { status: 500 }
    );
  }
}
