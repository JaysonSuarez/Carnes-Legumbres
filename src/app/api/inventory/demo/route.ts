import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  "papa pastusa seleccionada": 150,
  "tomate chonto maduro": 65,
  "cebolla cabezona blanca": 80,
  "aguacate hass": 40,
  "plátano hartón verde": 90,
  "carbón vegetal 3kg": 24,
};

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === "empty") {
      // Establecer todas las existencias en 0
      await prisma.product.updateMany({
        data: { currentStock: 0 },
      });
      return NextResponse.json({
        success: true,
        message: "Inventario establecido en 0 exitosamente",
      });
    }

    if (action === "fill") {
      // Cargar stock de demostración
      const products = await prisma.product.findMany();
      for (const p of products) {
        const cleanName = p.name.toLowerCase().trim();
        const demoQty = DEMO_STOCKS[cleanName] ?? (p.unit === "kg" ? 20 : 12);
        await prisma.product.update({
          where: { id: p.id },
          data: { currentStock: demoQty },
        });
      }
      return NextResponse.json({
        success: true,
        message: "Stock de demostración cargado exitosamente",
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
