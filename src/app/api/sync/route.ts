import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRealMargin } from "@/lib/finance";

export async function POST(request: Request) {
  try {
    const { actions } = await request.json();

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ success: true, processedIds: [] });
    }

    const processedIds: string[] = [];

    for (const action of actions) {
      const { id, type, payload } = action;

      try {
        if (type === "SALE") {
          const { customerName, paymentMethod, items } = payload;
          if (!Array.isArray(items) || items.length === 0) continue;

          // Buscar productos para calcular costos reales y márgenes
          const productIds = items.map((i: any) => i.productId);
          const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
          });
          const productMap = new Map(products.map((p) => [p.id, p]));

          let totalAmount = 0;
          let totalCost = 0;
          const saleItemsData: any[] = [];

          for (const item of items) {
            const product = productMap.get(item.productId);
            const unitCost = product ? product.costPrice : 0;
            const subtotal = item.quantity * item.unitPrice;
            const itemCost = item.quantity * unitCost;
            const profit = subtotal - itemCost;
            const realMarginPercent = subtotal > 0 ? calculateRealMargin(itemCost, subtotal) : 0;

            totalAmount += subtotal;
            totalCost += itemCost;

            saleItemsData.push({
              productId: item.productId,
              quantity: item.quantity,
              unitCost,
              unitPrice: item.unitPrice,
              subtotal,
              profit,
              realMarginPercent,
            });
          }

          const totalProfit = totalAmount - totalCost;
          const overallRealMarginPercent = totalAmount > 0 ? calculateRealMargin(totalCost, totalAmount) : 0;

          // Generar código de ticket correlativo
          const count = await prisma.sale.count();
          const saleCode = `TKT-${String(count + 1).padStart(4, "0")}`;

          await prisma.$transaction(async (tx) => {
            await tx.sale.create({
              data: {
                saleCode,
                customerName: customerName || "Cliente Mostrador",
                paymentMethod: paymentMethod || "EFECTIVO",
                totalAmount,
                totalCost,
                totalProfit,
                realMarginPercent: overallRealMarginPercent,
                items: {
                  create: saleItemsData,
                },
              },
            });

            // Descontar inventario de cada producto
            for (const item of items) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  currentStock: {
                    decrement: item.quantity,
                  },
                },
              });
            }
          });

          processedIds.push(id);
        } else if (type === "WASTE") {
          const { productId, quantity, reason, notes } = payload;
          const product = await prisma.product.findUnique({ where: { id: productId } });
          const costLoss = product ? (product.costPrice || 0) * quantity : 0;

          await prisma.$transaction([
            prisma.wasteLog.create({
              data: {
                productId,
                quantity,
                reason,
                costLoss,
                notes,
              },
            }),
            prisma.product.update({
              where: { id: productId },
              data: { currentStock: { decrement: quantity } },
            }),
          ]);

          processedIds.push(id);
        } else if (type === "BATCH") {
          const { batchNumber, supplier, totalCost, totalWeightKg, batchType, notes, items } = payload;

          await prisma.$transaction(async (tx) => {
            const batch = await tx.purchaseBatch.create({
              data: {
                batchNumber: batchNumber || `LOT-${Date.now().toString().slice(-4)}`,
                supplier,
                totalCost: Number(totalCost),
                totalWeightKg: totalWeightKg ? Number(totalWeightKg) : null,
                batchType: batchType || "MEAT_WHOLESALE",
                notes,
              },
            });

            if (Array.isArray(items)) {
              for (const item of items) {
                await tx.purchaseBatchItem.create({
                  data: {
                    batchId: batch.id,
                    productId: item.productId,
                    quantityKg: item.quantityKg,
                    wasteKg: item.wasteKg || 0,
                    costAttributed: item.costAttributed || 0,
                    suggestedSellPrice: item.suggestedSellPrice || 0,
                    actualSellPrice: item.actualSellPrice || 0,
                    projectedSubtotal: (item.quantityKg || 0) * (item.actualSellPrice || 0),
                  },
                });

                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    currentStock: { increment: item.quantityKg },
                    costPrice: item.costAttributed || undefined,
                    sellPrice: item.actualSellPrice || undefined,
                  },
                });
              }
            }
          });

          processedIds.push(id);
        }
      } catch (err) {
        console.error(`Error processing sync action ${id} (${type}):`, err);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processedIds.length,
      processedIds,
    });
  } catch (error) {
    console.error("Error in sync batch handler:", error);
    return NextResponse.json(
      { success: false, error: "Error al sincronizar transacciones offline" },
      { status: 500 }
    );
  }
}