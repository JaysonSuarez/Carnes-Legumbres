import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const DEMO_STOCKS: Record<string, number> = {
  "lomo fino de res": 25,
  "punta de anca": 30,
  "churrasco / bife de chorizo": 35,
  "costilla de res": 45,
  "sobrebarriga / falda": 28,
  "carne molida especial": 40,
  "osobuco con hueso": 20,
  "hueso carnudo para sancocho": 30,
  "pechuga de pollo fresca": 50,
  "muslos y pernil de pollo": 35,
  "costilla de cerdo": 35,
  "chuleta de cerdo fresca": 25,
  "papa pastusa": 150,
  "papa pastusa seleccionada": 150,
  "tomate chonto maduro": 65,
  "cebolla cabezona blanca": 80,
  "plátano hartón verde": 90,
  "coca-cola 1.5l": 24,
  "arroz diana 1kg": 30,
};

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { action } = await request.json();

    if (action === "empty") {
      // Establecer todas las existencias en 0 solo para el tenant actual
      const { data: products } = await supabase
        .from("cl_products")
        .select("id")
        .eq("tenantId", tenantId);

      if (products) {
        for (const p of products) {
          await supabase
            .from("cl_products")
            .update({ currentStock: 0, updatedAt: new Date().toISOString() })
            .eq("id", p.id)
            .eq("tenantId", tenantId);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Inventario establecido en 0 exitosamente para este espacio",
      });
    }

    if (action === "fill") {
      // Cargar stock de demostración solo en los productos del tenant actual
      const { data: products } = await supabase
        .from("cl_products")
        .select("*")
        .eq("tenantId", tenantId);

      if (products) {
        for (const p of products) {
          const cleanName = p.name.toLowerCase().trim();
          const demoQty = DEMO_STOCKS[cleanName] ?? (p.unit === "kg" ? 20 : 12);
          await supabase
            .from("cl_products")
            .update({
              currentStock: demoQty,
              updatedAt: new Date().toISOString(),
            })
            .eq("id", p.id)
            .eq("tenantId", tenantId);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Stock de demostración cargado exitosamente en este espacio",
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción inválida. Usa 'fill' o 'empty'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error toggling demo inventory:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar el inventario" },
      { status: 500 }
    );
  }
}
