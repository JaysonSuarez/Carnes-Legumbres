import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRealMargin } from "@/lib/finance";

export async function GET() {
  try {
    const batches = await prisma.purchaseBatch.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Enriquecer con cálculo de avance de venta real
    const enriched = batches.map((batch) => {
      let totalSoldKg = 0;
      let totalSellableKg = 0;
      let actualRevenueGenerated = 0;

      for (const item of batch.items) {
        totalSellableKg += item.quantityKg;
        totalSoldKg += item.soldQuantity;
        actualRevenueGenerated += item.soldQuantity * item.actualSellPrice;
      }

      const progressPercent = totalSellableKg > 0
        ? Number(((totalSoldKg / totalSellableKg) * 100).toFixed(1))
        : 0;

      const breakEvenRatio = batch.totalCost > 0
        ? Number(((actualRevenueGenerated / batch.totalCost) * 100).toFixed(1))
        : 0;

      return {
        ...batch,
        totalSellableKg,
        totalSoldKg,
        actualRevenueGenerated,
        progressPercent,
        breakEvenRatio, // >= 100% significa que ya recuperó el costo del lote
        isBreakEvenReached: actualRevenueGenerated >= batch.totalCost,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener lotes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      batchNumber,
      supplier,
      invoiceNumber,
      batchType = "MEAT_WHOLESALE",
      totalCost,
      totalWeightKg,
      notes,
      items = [], // Array de { productId, quantityKg, wasteKg, costAttributed, actualSellPrice, suggestedSellPrice }
    } = body;

    if (!batchNumber || !totalCost || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Número de lote, costo total y al menos un producto son requeridos" },
        { status: 400 }
      );
    }

    // Calcular facturación proyectada
    let projectedRevenue = 0;
    for (const item of items) {
      const subtotal = Number(item.quantityKg) * Number(item.actualSellPrice);
      projectedRevenue += subtotal;
    }

    const projectedRealMargin = calculateRealMargin(Number(totalCost), projectedRevenue);

    // Transacción de Prisma para crear lote y actualizar existencias de productos
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.purchaseBatch.create({
        data: {
          batchNumber,
          supplier: supplier || "Proveedor Mayorista",
          invoiceNumber: invoiceNumber || null,
          batchType,
          totalCost: Number(totalCost),
          totalWeightKg: totalWeightKg ? Number(totalWeightKg) : null,
          notes: notes || null,
          projectedRevenue,
          projectedRealMargin,
          status: "ACTIVE",
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantityKg: Number(item.quantityKg),
              wasteKg: Number(item.wasteKg || 0),
              costAttributed: Number(item.costAttributed || 0),
              suggestedSellPrice: Number(item.suggestedSellPrice || 0),
              actualSellPrice: Number(item.actualSellPrice),
              projectedSubtotal: Number(item.quantityKg) * Number(item.actualSellPrice),
              soldQuantity: 0,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // Actualizar stock y costos en la tabla de productos
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              increment: Number(item.quantityKg),
            },
            costPrice: Number(item.costAttributed) > 0 ? Number(item.costAttributed) : undefined,
            sellPrice: Number(item.actualSellPrice) > 0 ? Number(item.actualSellPrice) : undefined,
          },
        });
      }

      return batch;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error creating batch:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar el lote de compra" },
      { status: 500 }
    );
  }
}
