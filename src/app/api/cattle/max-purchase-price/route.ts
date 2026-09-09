import { NextResponse } from "next/server";
import {
  calculateMaxPurchasePrice,
  generatePurchaseScenarios,
} from "@/lib/cattleEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      liveWeightKg,
      expectedYieldPercent = 55,
      expectedRevenuePerAprovechableKg = 18000,
      customExpectedRevenue,
      estimatedAdditionalCosts = 0,
      targetMarginPercent = 20,
    } = body;

    const numLiveWeight = Number(liveWeightKg);
    if (!numLiveWeight || numLiveWeight <= 0) {
      return NextResponse.json(
        { success: false, error: "El peso en pie debe ser mayor a 0 kg" },
        { status: 400 }
      );
    }

    const result = calculateMaxPurchasePrice({
      liveWeightKg: numLiveWeight,
      expectedYieldPercent: Number(expectedYieldPercent),
      expectedRevenuePerAprovechableKg: Number(expectedRevenuePerAprovechableKg),
      customExpectedRevenue: customExpectedRevenue ? Number(customExpectedRevenue) : undefined,
      estimatedAdditionalCosts: Number(estimatedAdditionalCosts),
      targetMarginPercent: Number(targetMarginPercent),
    });

    const scenarios = generatePurchaseScenarios(
      numLiveWeight,
      Number(expectedYieldPercent),
      Number(expectedRevenuePerAprovechableKg),
      Number(estimatedAdditionalCosts),
      Number(targetMarginPercent)
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        scenarios,
      },
    });
  } catch (error: any) {
    console.error("Error calculating max purchase price:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al calcular precio máximo" },
      { status: 500 }
    );
  }
}
