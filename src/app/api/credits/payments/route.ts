import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";
import { calculateCreditState } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const creditId = searchParams.get("creditId");
    const customerName = searchParams.get("customerName");

    let query = supabase
      .from("cl_credit_payments")
      .select("*")
      .eq("tenantId", tenantId)
      .order("paymentDate", { ascending: false });

    if (creditId) {
      query = query.eq("creditId", creditId);
    }
    if (customerName) {
      query = query.ilike("customerName", `%${customerName}%`);
    }

    const { data: payments, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: payments || [] });
  } catch (error: any) {
    console.error("Error fetching credit payments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener pagos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();

    const {
      creditId,
      customerName,
      amountPaid,
      capitalAmount: explicitCapital,
      interestAmount: explicitInterest,
      paymentMethod = "EFECTIVO",
      notes = "",
    } = body;

    const totalPaid = Number(amountPaid);
    if (isNaN(totalPaid) || totalPaid <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto a pagar debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const now = new Date();
    const createdPayments = [];

    // CASO 1: Pago a un crédito específico
    if (creditId) {
      const { data: credit, error: crErr } = await supabase
        .from("cl_credits")
        .select("*")
        .eq("id", creditId)
        .eq("tenantId", tenantId)
        .single();

      if (crErr || !credit) {
        return NextResponse.json(
          { success: false, error: "Crédito no encontrado" },
          { status: 404 }
        );
      }

      const calc = calculateCreditState(
        credit.currentBalance,
        credit.creditDate,
        credit.dailyInterestRate || 0.01,
        now
      );

      let capitalToPay: number;
      let interestToPay: number;

      if (explicitCapital !== undefined && explicitInterest !== undefined) {
        capitalToPay = Math.min(credit.currentBalance, Math.max(0, Number(explicitCapital)));
        interestToPay = Math.max(0, Number(explicitInterest));
      } else {
        // Auto-distribución: primero cancela interés causado, resto a capital
        interestToPay = Math.min(calc.accruedInterest, totalPaid);
        capitalToPay = Math.min(credit.currentBalance, Math.max(0, totalPaid - interestToPay));
      }

      const newBalance = Math.max(0, credit.currentBalance - capitalToPay);
      const newStatus = newBalance <= 0 ? "PAGADO" : "PENDIENTE";
      const newTotalCapitalPaid = (credit.totalCapitalPaid || 0) + capitalToPay;
      const newTotalInterestPaid = (credit.totalInterestPaid || 0) + interestToPay;

      // Actualizar crédito
      const { error: updErr } = await supabase
        .from("cl_credits")
        .update({
          currentBalance: newBalance,
          status: newStatus,
          totalCapitalPaid: newTotalCapitalPaid,
          totalInterestPaid: newTotalInterestPaid,
          updatedAt: now.toISOString(),
        })
        .eq("id", creditId)
        .eq("tenantId", tenantId);

      if (updErr) throw updErr;

      // Registrar pago
      const paymentId = genId("cpay");
      const paymentData = {
        id: paymentId,
        tenantId,
        creditId,
        customerName: credit.customerName,
        amountPaid: totalPaid,
        capitalAmount: capitalToPay,
        interestAmount: interestToPay,
        paymentDate: now.toISOString(),
        paymentMethod,
        notes: notes ? String(notes).trim() : null,
      };

      const { data: newPayment, error: payErr } = await supabase
        .from("cl_credit_payments")
        .insert(paymentData)
        .select()
        .single();

      if (payErr) throw payErr;
      createdPayments.push(newPayment);

      return NextResponse.json({
        success: true,
        data: {
          payments: createdPayments,
          creditUpdated: {
            id: creditId,
            remainingCapital: newBalance,
            status: newStatus,
            capitalPaid: capitalToPay,
            interestPaid: interestToPay,
          },
        },
      });
    }

    // CASO 2: Abono general a los créditos de un cliente (FIFO: más antiguos primero)
    if (!customerName || customerName.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Debes especificar el ID del crédito o el nombre del cliente" },
        { status: 400 }
      );
    }

    const { data: clientCredits, error: listErr } = await supabase
      .from("cl_credits")
      .select("*")
      .ilike("customerName", customerName.trim())
      .eq("status", "PENDIENTE")
      .gt("currentBalance", 0)
      .eq("tenantId", tenantId)
      .order("creditDate", { ascending: true });

    if (listErr || !clientCredits || clientCredits.length === 0) {
      return NextResponse.json(
        { success: false, error: "No se encontraron créditos pendientes para este cliente" },
        { status: 404 }
      );
    }

    let remainingMoney = totalPaid;
    const updatedCreditsSummary: any[] = [];

    for (const credit of clientCredits) {
      if (remainingMoney <= 0) break;

      const calc = calculateCreditState(
        credit.currentBalance,
        credit.creditDate,
        credit.dailyInterestRate || 0.01,
        now
      );

      // Cobrar interés acumulado de este ticket primero
      const interestToPay = Math.min(calc.accruedInterest, remainingMoney);
      remainingMoney -= interestToPay;

      // El restante va a amortizar capital
      const capitalToPay = Math.min(credit.currentBalance, remainingMoney);
      remainingMoney -= capitalToPay;

      const ticketAmountPaid = interestToPay + capitalToPay;
      const newBalance = Math.max(0, credit.currentBalance - capitalToPay);
      const newStatus = newBalance <= 0 ? "PAGADO" : "PENDIENTE";

      await supabase
        .from("cl_credits")
        .update({
          currentBalance: newBalance,
          status: newStatus,
          totalCapitalPaid: (credit.totalCapitalPaid || 0) + capitalToPay,
          totalInterestPaid: (credit.totalInterestPaid || 0) + interestToPay,
          updatedAt: now.toISOString(),
        })
        .eq("id", credit.id)
        .eq("tenantId", tenantId);

      const paymentId = genId("cpay");
      const { data: pRec } = await supabase
        .from("cl_credit_payments")
        .insert({
          id: paymentId,
          tenantId,
          creditId: credit.id,
          customerName: credit.customerName,
          amountPaid: ticketAmountPaid,
          capitalAmount: capitalToPay,
          interestAmount: interestToPay,
          paymentDate: now.toISOString(),
          paymentMethod,
          notes: notes ? String(notes).trim() : `Abono a deuda ticket ${credit.id.slice(-6)}`,
        })
        .select()
        .single();

      if (pRec) createdPayments.push(pRec);

      updatedCreditsSummary.push({
        creditId: credit.id,
        capitalPaid: capitalToPay,
        interestPaid: interestToPay,
        remainingCapital: newBalance,
        status: newStatus,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReceived: totalPaid,
        appliedAmount: totalPaid - remainingMoney,
        changeOrRemainder: remainingMoney,
        payments: createdPayments,
        creditsUpdated: updatedCreditsSummary,
      },
    });
  } catch (error: any) {
    console.error("Error creating credit payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar el pago" },
      { status: 500 }
    );
  }
}
