import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";
import { calculateCreditState } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "PENDIENTE"; // "PENDIENTE" | "PAGADO" | "ALL"
    const search = searchParams.get("search") || "";

    let query = supabase
      .from("cl_credits")
      .select(`
        *,
        sale:cl_sales(
          id,
          saleCode,
          date,
          totalAmount,
          customerName,
          items:cl_sale_items(
            id,
            quantity,
            unitPrice,
            subtotal,
            product:cl_products(id, name, unit)
          )
        )
      `)
      .eq("tenantId", tenantId)
      .order("creditDate", { ascending: false });

    if (statusFilter !== "ALL") {
      query = query.eq("status", statusFilter);
    }

    const { data: rawCredits, error } = await query;

    if (error) {
      throw error;
    }

    const now = new Date();

    // Calcular estado financiero y días para cada crédito
    const enrichedCredits = (rawCredits || []).map((credit: any) => {
      const calc = calculateCreditState(
        credit.currentBalance,
        credit.creditDate,
        credit.dailyInterestRate || 0.01,
        now
      );

      return {
        ...credit,
        calculation: calc,
      };
    });

    // Filtrar por término de búsqueda si aplica
    const filteredCredits = search
      ? enrichedCredits.filter(
          (c: any) =>
            c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
            c.customerPhone?.toLowerCase().includes(search.toLowerCase()) ||
            c.sale?.saleCode?.toLowerCase().includes(search.toLowerCase())
        )
      : enrichedCredits;

    // Agrupar por cliente para vista de cartera
    const customerMap = new Map<string, {
      customerName: string;
      customerPhone?: string | null;
      activeCapital: number;
      accruedInterest: number;
      totalDebt: number;
      dailyAccrualRate: number;
      creditsCount: number;
      oldestCreditDate: string;
      credits: any[];
    }>();

    let totalActiveCapital = 0;
    let totalAccruedInterest = 0;
    let totalOriginalLoaned = 0;

    for (const cr of enrichedCredits) {
      if (cr.status === "PENDIENTE" && cr.currentBalance > 0) {
        totalActiveCapital += cr.currentBalance;
        totalAccruedInterest += cr.calculation.accruedInterest;
        totalOriginalLoaned += cr.originalAmount;

        const custKey = cr.customerName.trim().toLowerCase();
        const existing = customerMap.get(custKey);

        if (!existing) {
          customerMap.set(custKey, {
            customerName: cr.customerName,
            customerPhone: cr.customerPhone,
            activeCapital: cr.currentBalance,
            accruedInterest: cr.calculation.accruedInterest,
            totalDebt: cr.calculation.totalDebt,
            dailyAccrualRate: cr.calculation.dailyAccrual,
            creditsCount: 1,
            oldestCreditDate: cr.creditDate,
            credits: [cr],
          });
        } else {
          existing.activeCapital += cr.currentBalance;
          existing.accruedInterest += cr.calculation.accruedInterest;
          existing.totalDebt += cr.calculation.totalDebt;
          existing.dailyAccrualRate += cr.calculation.dailyAccrual;
          existing.creditsCount += 1;
          if (new Date(cr.creditDate) < new Date(existing.oldestCreditDate)) {
            existing.oldestCreditDate = cr.creditDate;
          }
          existing.credits.push(cr);
        }
      }
    }

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.totalDebt - a.totalDebt
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalActiveCapital: Math.round(totalActiveCapital),
          totalAccruedInterest: Math.round(totalAccruedInterest),
          totalReceivableDebt: Math.round(totalActiveCapital + totalAccruedInterest),
          totalDebtorsCount: customers.length,
          totalOriginalLoaned: Math.round(totalOriginalLoaned),
        },
        customers,
        credits: filteredCredits,
      },
    });
  } catch (error: any) {
    console.error("Error fetching credits:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener los créditos" },
      { status: 500 }
    );
  }
}
