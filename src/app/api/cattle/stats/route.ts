import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeHistoricalYieldStats } from "@/lib/cattleEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: purchases, error } = await supabase
      .from("cl_cattle_purchases")
      .select(`
        *,
        cuts:cl_cattle_cuts(*)
      `)
      .in("status", ["DEBONED", "INVENTORY_LOADED"])
      .order("purchaseDate", { ascending: false });

    if (error) throw error;

    const stats = computeHistoricalYieldStats(purchases || []);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error computing historical cattle stats:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al calcular estadísticas históricas" },
      { status: 500 }
    );
  }
}
