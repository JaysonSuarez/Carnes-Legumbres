import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateRealMargin } from "@/lib/finance";
import { getTenantId } from "@/lib/tenant";
import {
  getColombiaDateParts,
  getColombiaDayRange,
  getColombiaWeekRange,
  getColombiaBiweekRange,
  getColombiaMonthRange,
} from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly"; // "daily" | "weekly" | "biweekly" | "monthly" | "all"
    const dateParam = searchParams.get("date"); // "YYYY-MM-DD"

    const colParts = getColombiaDateParts();
    let startDate = new Date();
    let endDate = new Date();
    let periodLabel = "";

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    if (dateParam) {
      const { startIso, endIso } = getColombiaDayRange(dateParam);
      startDate = new Date(startIso);
      endDate = new Date(endIso);
      const [y, m, d] = dateParam.split("-").map(Number);
      periodLabel = `${d} de ${monthNames[(m || 1) - 1]} de ${y}`;
    } else if (period === "daily") {
      const { startIso, endIso } = getColombiaDayRange();
      startDate = new Date(startIso);
      endDate = new Date(endIso);
      periodLabel = `Hoy (${colParts.day} de ${monthNames[colParts.month - 1]})`;
    } else if (period === "weekly") {
      const { startIso, endIso } = getColombiaWeekRange();
      startDate = new Date(startIso);
      endDate = new Date(endIso);
      const startDay = new Date(startDate.getTime() - 5 * 3600000).getUTCDate();
      const endDay = new Date(endDate.getTime() - 5 * 3600000).getUTCDate();
      periodLabel = `Esta Semana (${startDay} - ${endDay} de ${monthNames[colParts.month - 1]})`;
    } else if (period === "biweekly") {
      const { startIso, endIso } = getColombiaBiweekRange();
      startDate = new Date(startIso);
      endDate = new Date(endIso);
      if (colParts.day <= 15) {
        periodLabel = `1ra Quincena (1 - 15 de ${monthNames[colParts.month - 1]})`;
      } else {
        const lastDay = new Date(Date.UTC(colParts.year, colParts.month, 0)).getUTCDate();
        periodLabel = `2da Quincena (16 - ${lastDay} de ${monthNames[colParts.month - 1]})`;
      }
    } else if (period === "all") {
      startDate = new Date(0);
      endDate = new Date("2099-12-31T23:59:59.999Z");
      periodLabel = "Todo el Histórico";
    } else {
      // monthly
      const { startIso, endIso } = getColombiaMonthRange();
      startDate = new Date(startIso);
      endDate = new Date(endIso);
      periodLabel = `Mes Actual (${monthNames[colParts.month - 1]} ${colParts.year})`;
    }

    const tenantId = getTenantId(request);

    // Consultar datos de ventas, compras, mermas, productos, gastos y pagos de créditos desde Supabase filtrados por tenantId
    const [salesRes, batchesRes, wasteRes, productsRes, expensesRes, creditPaymentsRes] = await Promise.all([
      supabase
        .from("cl_sales")
        .select(`
          *,
          items:cl_sale_items(
            *,
            product:cl_products(
              *,
              category:cl_categories(*)
            )
          )
        `)
        .eq("tenantId", tenantId)
        .order("date", { ascending: false }),
      supabase
        .from("cl_batches")
        .select(`
          *,
          items:cl_batch_items(
            *,
            product:cl_products(*)
          )
        `)
        .eq("tenantId", tenantId)
        .order("date", { ascending: false }),
      supabase
        .from("cl_waste_logs")
        .select(`
          *,
          product:cl_products(*)
        `)
        .eq("tenantId", tenantId)
        .order("date", { ascending: false }),
      supabase
        .from("cl_products")
        .select("*, category:cl_categories(*)")
        .eq("tenantId", tenantId),
      supabase
        .from("cl_expenses")
        .select("*")
        .eq("tenantId", tenantId)
        .order("expenseDate", { ascending: false }),
      supabase
        .from("cl_credit_payments")
        .select("*")
        .eq("tenantId", tenantId)
        .order("paymentDate", { ascending: false }),
    ]);

    const allSales = (salesRes.data || []) as any[];
    const allBatches = (batchesRes.data || []) as any[];
    const allWasteLogs = (wasteRes.data || []) as any[];
    const products = (productsRes.data || []) as any[];
    const allExpenses = (expensesRes.data || []) as any[];
    const allCreditPayments = (creditPaymentsRes.data || []) as any[];

    // Filtrar por el período seleccionado
    const periodSales = allSales.filter((s) => {
      const d = new Date(s.date);
      return d >= startDate && d <= endDate;
    });

    const periodBatches = allBatches.filter((b) => {
      const d = new Date(b.date);
      return d >= startDate && d <= endDate;
    });

    const periodWasteLogs = allWasteLogs.filter((w) => {
      const d = new Date(w.date);
      return d >= startDate && d <= endDate;
    });

    const periodExpenses = allExpenses.filter((e) => {
      const d = new Date(e.expenseDate);
      return d >= startDate && d <= endDate;
    });

    const periodCreditPayments = allCreditPayments.filter((p) => {
      const d = new Date(p.paymentDate || p.createdAt);
      return d >= startDate && d <= endDate;
    });

    let periodCreditPaymentsTotal = 0;
    periodCreditPayments.forEach((p) => {
      periodCreditPaymentsTotal += Number(p.amountPaid) || 0;
    });

    let periodExpensesTotal = 0;
    const periodExpensesByCategory: Record<string, number> = {
      ARRIENDO: 0,
      SERVICIOS: 0,
      NOMINA: 0,
      INSUMOS: 0,
      MANTENIMIENTO: 0,
      TRANSPORTE: 0,
      OTRO: 0,
    };

    periodExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      periodExpensesTotal += amt;
      periodExpensesByCategory[exp.category] =
        (periodExpensesByCategory[exp.category] || 0) + amt;
    });

    // 1. Métricas de Ventas en el Período
    let periodRevenue = 0;
    let periodCost = 0;
    let periodProfit = 0;
    let periodQuantityKg = 0;

    for (const sale of periodSales) {
      periodRevenue += sale.totalAmount;
      periodCost += sale.totalCost;
      periodProfit += sale.totalProfit;
      for (const item of sale.items) {
        if (item.product.unit === "kg") {
          periodQuantityKg += item.quantity;
        }
      }
    }

    const periodRealMarginPercent = periodRevenue > 0
      ? calculateRealMargin(periodCost, periodRevenue)
      : 0;

    // 2. Métricas de Compras en el Período
    let periodPurchasesCost = 0;
    let periodPurchasesKg = 0;

    for (const batch of periodBatches) {
      periodPurchasesCost += batch.totalCost;
      if (batch.totalWeightKg) {
        periodPurchasesKg += batch.totalWeightKg;
      }
    }

    // 3. Mermas en el Período
    const periodWasteCost = periodWasteLogs.reduce((acc, l) => acc + l.costLoss, 0);
    const periodWasteKg = periodWasteLogs.reduce((acc, l) => acc + l.quantity, 0);

    // 4. Comparativa de Frecuencia de Compra Semanal (1, 2, 3, 4 veces por semana)
    // Agrupar compras históricas por semana para análisis real
    const weeksMap = new Map<string, { weekId: string; purchasesCount: number; totalSpent: number; totalSales: number; totalWaste: number }>();

    for (const batch of allBatches) {
      const d = new Date(batch.date);
      const weekKey = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
      const existing = weeksMap.get(weekKey) || {
        weekId: weekKey,
        purchasesCount: 0,
        totalSpent: 0,
        totalSales: 0,
        totalWaste: 0,
      };
      existing.purchasesCount += 1;
      existing.totalSpent += batch.totalCost;
      weeksMap.set(weekKey, existing);
    }

    // Modelo de análisis de rentabilidad por frecuencia de compra
    const frequencyBenchmarks = [
      {
        frequency: "1 compra / semana",
        description: "Compra semanal masiva",
        mermaEstimada: "7.0% - 9.5%",
        rotacionCapital: "Lenta (7 días)",
        flujoCaja: "Alto capital inmovilizado al inicio",
        impactoMargen: "Pérdida de ~3% a 5% del margen real por deshidratación y recorte final",
        recomendacion: "Aceptable para cortes congelados o abarrotes. No recomendado para legumbres de hoja o cortes frescos.",
      },
      {
        frequency: "2 compras / semana",
        description: "Reponedor intermedio (Ej. Lunes y Jueves)",
        mermaEstimada: "4.0% - 5.5%",
        rotacionCapital: "Media (3 a 4 días)",
        flujoCaja: "Equilibrado, menor riesgo",
        impactoMargen: "Margen real protegido en torno al 30% - 33%",
        recomendacion: "Punto óptimo para locales medianos: mercadería fresca para fin de semana sin saturar bodega.",
      },
      {
        frequency: "3 compras / semana",
        description: "Alta rotación fresca (Lunes, Miércoles, Viernes)",
        mermaEstimada: "2.0% - 3.0%",
        rotacionCapital: "Rápida (48 horas)",
        flujoCaja: "Excelente liquidez diaria",
        impactoMargen: "Máxima utilidad real (+4% a favor frente a 1 compra semanal)",
        recomendacion: "Estrategia ganadora para carnicería y legumbrería con alto flujo de público.",
      },
      {
        frequency: "4+ compras / semana",
        description: "Just-in-Time / Diaria",
        mermaEstimada: "1.0% - 2.0%",
        rotacionCapital: "Inmediata (24 horas)",
        flujoCaja: "Mínimo capital inmovilizado",
        impactoMargen: "Mínima merma, pero revisar costos de transporte y tiempo logístico",
        recomendacion: "Ideal si los proveedores no cobran flete adicional por entrega diaria.",
      },
    ];

    // 5. Agrupación temporal para la gráfica del período
    const timelineMap = new Map<string, { date: string; ventas: number; compras: number; utilidad: number }>();

    for (const sale of periodSales) {
      const key = new Date(sale.date).toISOString().split("T")[0];
      const ex = timelineMap.get(key) || { date: key, ventas: 0, compras: 0, utilidad: 0 };
      ex.ventas += sale.totalAmount;
      ex.utilidad += sale.totalProfit;
      timelineMap.set(key, ex);
    }

    for (const batch of periodBatches) {
      const key = new Date(batch.date).toISOString().split("T")[0];
      const ex = timelineMap.get(key) || { date: key, ventas: 0, compras: 0, utilidad: 0 };
      ex.compras += batch.totalCost;
      timelineMap.set(key, ex);
    }

    const timelineData = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 6. Lista de Lotes Activos (Progreso de recuperación)
    const batchesProgress = allBatches.map((batch) => {
      let soldKg = 0;
      let totalKg = 0;
      let revenueGenerated = 0;

      for (const item of batch.items) {
        totalKg += item.quantityKg;
        soldKg += item.soldQuantity;
        revenueGenerated += item.soldQuantity * item.actualSellPrice;
      }

      const breakEvenRatio = batch.totalCost > 0
        ? Number(((revenueGenerated / batch.totalCost) * 100).toFixed(1))
        : 0;

      const progressKgRatio = totalKg > 0
        ? Number(((soldKg / totalKg) * 100).toFixed(1))
        : 0;

      return {
        id: batch.id,
        batchNumber: batch.batchNumber,
        supplier: batch.supplier,
        date: batch.date,
        totalCost: batch.totalCost,
        projectedRevenue: batch.projectedRevenue,
        projectedProfit: batch.projectedRevenue - batch.totalCost,
        projectedRealMargin: batch.projectedRealMargin,
        revenueGenerated,
        totalKg,
        soldKg,
        progressKgRatio,
        breakEvenRatio,
        isBreakEvenReached: revenueGenerated >= batch.totalCost,
        itemsCount: batch.items.length,
      };
    });

    // 7. Categorías en el período
    const categoryMap = new Map<string, { name: string; ventas: number; utilidad: number }>();
    for (const sale of periodSales) {
      for (const item of sale.items) {
        const cat = item.product.category.name;
        const ex = categoryMap.get(cat) || { name: cat, ventas: 0, utilidad: 0 };
        ex.ventas += item.subtotal;
        ex.utilidad += item.profit;
        categoryMap.set(cat, ex);
      }
    }

    const categoryStats = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      margenReal: c.ventas > 0 ? Number(((c.utilidad / c.ventas) * 100).toFixed(2)) : 0,
    }));

    // 8. Productos con alerta de margen
    const productsBelowTarget = products
      .map((p) => {
        const realMargin = calculateRealMargin(p.costPrice, p.sellPrice);
        return {
          id: p.id,
          name: p.name,
          category: p.category.name,
          costPrice: p.costPrice,
          sellPrice: p.sellPrice,
          realMargin,
          isUnderTarget: realMargin < 30.0,
        };
      })
      .filter((p) => p.isUnderTarget);

    // 9. Consolidación de Movimientos Unificados (Libro de Caja y Operaciones)
    const movements: Array<{
      id: string;
      type: "VENTA" | "GASTO" | "COMPRA" | "ABONO_CREDITO";
      flow: "INGRESO" | "EGRESO";
      date: string;
      timeStr: string;
      title: string;
      subtitle: string;
      amount: number;
      paymentMethod?: string;
      category?: string;
      referenceId?: string;
      raw?: any;
    }> = [];

    for (const sale of periodSales) {
      const d = new Date(sale.date);
      const timeStr = d.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Bogota",
      });
      const itemsCount = sale.items ? sale.items.length : 0;
      const itemsText = sale.items
        ? sale.items.slice(0, 3).map((i: any) => `${i.product?.name || "Item"} (${i.quantity}${i.product?.unit || ""})`).join(", ") + (itemsCount > 3 ? "..." : "")
        : "";

      movements.push({
        id: sale.id,
        type: "VENTA",
        flow: "INGRESO",
        date: sale.date,
        timeStr,
        title: `Venta #${sale.saleCode || sale.id.slice(-6)}`,
        subtitle: `Cliente: ${sale.customerName || "Cliente Mostrador"}${itemsText ? ` • ${itemsText}` : ""}`,
        amount: Number(sale.totalAmount) || 0,
        paymentMethod: sale.paymentMethod,
        category: "VENTAS",
        referenceId: sale.saleCode,
        raw: sale,
      });
    }

    for (const exp of periodExpenses) {
      const d = new Date(exp.expenseDate || exp.createdAt);
      const timeStr = d.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Bogota",
      });

      movements.push({
        id: exp.id,
        type: "GASTO",
        flow: "EGRESO",
        date: exp.expenseDate || exp.createdAt,
        timeStr,
        title: exp.description || `Gasto ${exp.category}`,
        subtitle: `Categoría: ${exp.category}${exp.recipient ? ` • A: ${exp.recipient}` : ""}${exp.registeredBy ? ` • Por: ${exp.registeredBy}` : ""}`,
        amount: Number(exp.amount) || 0,
        paymentMethod: exp.paymentMethod || "EFECTIVO",
        category: exp.category,
        referenceId: exp.id,
        raw: exp,
      });
    }

    for (const batch of periodBatches) {
      const d = new Date(batch.date);
      const timeStr = d.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Bogota",
      });

      movements.push({
        id: batch.id,
        type: "COMPRA",
        flow: "EGRESO",
        date: batch.date,
        timeStr,
        title: `Compra Lote: ${batch.batchNumber || batch.id.slice(-6)}`,
        subtitle: `Proveedor: ${batch.supplier || "Sin proveedor"}${batch.totalWeightKg ? ` • ${batch.totalWeightKg} kg` : ""}`,
        amount: Number(batch.totalCost) || 0,
        paymentMethod: "TRANSFERENCIA",
        category: "COMPRA_MERCANCIA",
        referenceId: batch.batchNumber,
        raw: batch,
      });
    }

    for (const payment of periodCreditPayments) {
      const d = new Date(payment.paymentDate || payment.createdAt);
      const timeStr = d.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Bogota",
      });

      movements.push({
        id: payment.id,
        type: "ABONO_CREDITO",
        flow: "INGRESO",
        date: payment.paymentDate || payment.createdAt,
        timeStr,
        title: `Abono de Fiado: ${payment.customerName || "Cliente"}`,
        subtitle: `Recibo${payment.receiptNumber ? ` #${payment.receiptNumber}` : ""}${payment.notes ? ` • "${payment.notes}"` : ""}`,
        amount: Number(payment.amountPaid) || 0,
        paymentMethod: payment.paymentMethod || "EFECTIVO",
        category: "ABONOS",
        referenceId: payment.receiptNumber,
        raw: payment,
      });
    }

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIngresos = periodRevenue + periodCreditPaymentsTotal;
    const totalEgresos = periodPurchasesCost + periodExpensesTotal;
    const netCashProfit = totalIngresos - totalEgresos;

    const netProfit = periodProfit - periodExpensesTotal;
    const netMarginPercent = periodRevenue > 0
      ? Number(((netProfit / periodRevenue) * 100).toFixed(2))
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        period,
        periodLabel,
        kpi: {
          totalRevenue: periodRevenue,
          totalCost: periodCost,
          totalProfit: periodProfit, // Ganancia Bruta (Ventas - Costo productos)
          overallRealMarginPercent: periodRealMarginPercent,
          totalExpenses: periodExpensesTotal, // Gastos Operativos
          totalPurchases: periodPurchasesCost, // Compras de Lotes
          totalCreditPayments: periodCreditPaymentsTotal, // Abonos recibidos
          totalIngresos, // Ventas + Abonos
          totalEgresos, // Gastos + Compras
          netCashProfit, // Ingresos - Egresos
          netProfit, // Verdadera Ganancia Neta
          netMarginPercent,
          totalQuantityKg: periodQuantityKg,
          salesCount: periodSales.length,
          targetMarginSatisfied: periodRealMarginPercent >= 30.0,
        },
        expensesKpi: {
          totalExpenses: periodExpensesTotal,
          byCategory: periodExpensesByCategory,
          count: periodExpenses.length,
          expenses: periodExpenses,
        },
        purchasesKpi: {
          totalSpent: periodPurchasesCost,
          totalKg: periodPurchasesKg,
          batchesCount: periodBatches.length,
        },
        waste: {
          totalWasteCost: periodWasteCost,
          totalWasteKg: periodWasteKg,
          logsCount: periodWasteLogs.length,
        },
        periodSales, // Tickets para imprimir/ver factura
        periodBatches, // Compras del período
        periodExpenses, // Gastos del período
        periodCreditPayments, // Abonos del período
        movements, // Flujo unificado cronológico
        timelineData,
        batchesProgress,
        categoryStats,
        productsBelowTarget,
        frequencyBenchmarks,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error en API analytics:", error);
    return NextResponse.json(
      { success: false, error: "Error al calcular reportes periódicos" },
      { status: 500 }
    );
  }
}
