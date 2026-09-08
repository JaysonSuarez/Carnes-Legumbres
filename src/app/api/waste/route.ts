import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.wasteLog.findMany({
      include: {
        product: true,
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ success: true, data: logs });
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

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const costLoss = Number(quantity) * product.costPrice;

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.wasteLog.create({
        data: {
          productId,
          quantity: Number(quantity),
          reason,
          costLoss,
          notes: notes || null,
        },
        include: { product: true },
      });

      // Descontar del inventario físico la merma
      await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: {
            decrement: Number(quantity),
          },
        },
      });

      return log;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error logging waste:", error);
    return NextResponse.json(
      { success: false, error: "Error al registrar la merma" },
      { status: 500 }
    );
  }
}
