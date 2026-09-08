import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: logs, error } = await supabase
      .from("cl_waste_logs")
      .select("*, product:cl_products(*)")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: logs || [] });
  } catch (error) {
    console.error("Error fetching waste logs:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener registro de mermas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity, reason, notes } = body;

    if (!productId || !quantity || !reason) {
      return NextResponse.json(
        { success: false, error: "Producto, cantidad y motivo son requeridos" },
        { status: 400 }
      );
    }

    const { data: product, error: prodErr } = await supabase
      .from("cl_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (prodErr || !product) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const costLoss = Number(quantity) * (product.costPrice || 0);
    const logId = genId("wlog");

    const { data: log, error: logErr } = await supabase
      .from("cl_waste_logs")
      .insert({
        id: logId,
        productId,
        quantity: Number(quantity),
        reason,
        costLoss,
        notes: notes || null,
      })
      .select("*, product:cl_products(*)")
      .single();

    if (logErr) {
      throw logErr;
    }

    // Descontar del inventario físico la merma
    const newStock = Math.max(0, (product.currentStock || 0) - Number(quantity));
    await supabase
      .from("cl_products")
      .update({
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", productId);

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    console.error("Error logging waste:", error);
    return NextResponse.json(
      { success: false, error: "Error al registrar la merma" },
      { status: 500 }
    );
  }
}
