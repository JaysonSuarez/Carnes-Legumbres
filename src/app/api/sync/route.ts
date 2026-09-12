import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateRealMargin } from "@/lib/finance";
import { getTenantId } from "@/lib/tenant";
import { colombiaDateStringToIso } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
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

          // Buscar productos para calcular costos reales y márgenes dentro del tenant
          const productIds = items.map((i: any) => i.productId);
          const { data: products } = await supabase
            .from("cl_products")
            .select("*")
            .in("id", productIds)
            .eq("tenantId", tenantId);

          const productMap = new Map((products || []).map((p: any) => [p.id, p]));

          let totalAmount = 0;
          let totalCost = 0;
          const saleId = genId("sale");
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
              id: genId("sitem"),
              saleId,
              productId: item.productId,
              quantity: item.quantity,
              unitCost,
              unitPrice: item.unitPrice,
              subtotal,
              profit,
              realMarginPercent,
              tenantId,
            });
          }

          const totalProfit = totalAmount - totalCost;
          const overallRealMarginPercent = totalAmount > 0 ? calculateRealMargin(totalCost, totalAmount) : 0;

          const saleCode = `TKT-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

          // 1. Insertar venta con tenantId
          const { error: saleErr } = await supabase.from("cl_sales").insert({
            id: saleId,
            saleCode,
            customerName: customerName || "Cliente Mostrador",
            paymentMethod: paymentMethod || "EFECTIVO",
            totalAmount,
            totalCost,
            totalProfit,
            realMarginPercent: overallRealMarginPercent,
            tenantId,
          });

          if (saleErr) {
            throw saleErr;
          }

          // Si es venta a crédito, crear registro en cl_credits
          if (paymentMethod === "CREDITO") {
            await supabase.from("cl_credits").insert({
              id: genId("crd"),
              tenantId,
              saleId,
              customerName: customerName ? customerName.trim() : "Cliente Crédito",
              customerPhone: payload.customerPhone ? String(payload.customerPhone).trim() : null,
              originalAmount: totalAmount,
              currentBalance: totalAmount,
              dailyInterestRate: 0.01,
              creditDate: new Date().toISOString(),
              dueDate: payload.dueDate ? colombiaDateStringToIso(payload.dueDate) : null,
              status: "PENDIENTE",
              totalInterestPaid: 0,
              totalCapitalPaid: 0,
              notes: payload.notes ? String(payload.notes).trim() : "Sincronizado offline",
            });
          }

          // 2. Insertar items con tenantId
          const { error: itemsErr } = await supabase.from("cl_sale_items").insert(saleItemsData);
          if (itemsErr) {
            throw itemsErr;
          }

          // 3. Descontar inventario de cada producto dentro del mismo tenant
          for (const item of items) {
            const currentProd = productMap.get(item.productId);
            if (currentProd) {
              const newStock = Math.max(0, (currentProd.currentStock || 0) - item.quantity);
              await supabase
                .from("cl_products")
                .update({
                  currentStock: newStock,
                  updatedAt: new Date().toISOString(),
                })
                .eq("id", item.productId)
                .eq("tenantId", tenantId);
            }
          }

          processedIds.push(id);
        } else if (type === "WASTE") {
          const { productId, quantity, reason, notes } = payload;
          const { data: product } = await supabase
            .from("cl_products")
            .select("*")
            .eq("id", productId)
            .eq("tenantId", tenantId)
            .single();

          const costLoss = product ? (product.costPrice || 0) * quantity : 0;

          await supabase.from("cl_waste_logs").insert({
            id: genId("wlog"),
            productId,
            quantity,
            reason,
            costLoss,
            notes,
            tenantId,
          });

          if (product) {
            const newStock = Math.max(0, (product.currentStock || 0) - quantity);
            await supabase
              .from("cl_products")
              .update({
                currentStock: newStock,
                updatedAt: new Date().toISOString(),
              })
              .eq("id", productId)
              .eq("tenantId", tenantId);
          }

          processedIds.push(id);
        } else if (type === "BATCH") {
          const { batchNumber, supplier, totalCost, totalWeightKg, batchType, notes, items } = payload;
          const batchId = genId("batch");

          const { error: batchErr } = await supabase.from("cl_batches").insert({
            id: batchId,
            batchNumber: batchNumber || `LOT-${Date.now().toString().slice(-4)}`,
            supplier,
            totalCost: Number(totalCost),
            totalWeightKg: totalWeightKg ? Number(totalWeightKg) : null,
            batchType: batchType || "MEAT_WHOLESALE",
            notes,
            tenantId,
          });

          if (batchErr) {
            throw batchErr;
          }

          if (Array.isArray(items)) {
            const batchItemsData = items.map((item: any) => ({
              id: genId("bitem"),
              batchId,
              productId: item.productId,
              quantityKg: item.quantityKg,
              wasteKg: item.wasteKg || 0,
              costAttributed: item.costAttributed || 0,
              suggestedSellPrice: item.suggestedSellPrice || 0,
              actualSellPrice: item.actualSellPrice || 0,
              projectedSubtotal: (item.quantityKg || 0) * (item.actualSellPrice || 0),
              tenantId,
            }));

            await supabase.from("cl_batch_items").insert(batchItemsData);

            for (const item of items) {
              const { data: p } = await supabase
                .from("cl_products")
                .select("currentStock")
                .eq("id", item.productId)
                .eq("tenantId", tenantId)
                .single();

              const newStock = (p?.currentStock || 0) + (item.quantityKg || 0);
              const updateData: Record<string, any> = {
                currentStock: newStock,
                updatedAt: new Date().toISOString(),
              };
              if (item.costAttributed) updateData.costPrice = item.costAttributed;
              if (item.actualSellPrice) updateData.sellPrice = item.actualSellPrice;

              await supabase
                .from("cl_products")
                .update(updateData)
                .eq("id", item.productId)
                .eq("tenantId", tenantId);
            }
          }

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