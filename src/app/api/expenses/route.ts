import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";
import {
  getColombiaDayRange,
  getColombiaWeekRange,
  getColombiaBiweekRange,
  getColombiaMonthRange,
  colombiaDateStringToIso,
} from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const category = searchParams.get("category");

    let query = supabase
      .from("cl_expenses")
      .select("*")
      .eq("tenantId", tenantId);

    if (category && category !== "ALL") {
      query = query.eq("category", category);
    }

    if (period === "daily") {
      const { startIso, endIso } = getColombiaDayRange();
      query = query.gte("expenseDate", startIso).lte("expenseDate", endIso);
    } else if (period === "weekly") {
      const { startIso, endIso } = getColombiaWeekRange();
      query = query.gte("expenseDate", startIso).lte("expenseDate", endIso);
    } else if (period === "biweekly") {
      const { startIso, endIso } = getColombiaBiweekRange();
      query = query.gte("expenseDate", startIso).lte("expenseDate", endIso);
    } else if (period === "monthly") {
      const { startIso, endIso } = getColombiaMonthRange();
      query = query.gte("expenseDate", startIso).lte("expenseDate", endIso);
    }

    const { data: expenses, error } = await query.order("expenseDate", { ascending: false });

    if (error) {
      throw error;
    }

    const list = expenses || [];
    let totalAmount = 0;
    const byCategory: Record<string, number> = {};

    list.forEach((exp: any) => {
      const amt = Number(exp.amount) || 0;
      totalAmount += amt;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + amt;
    });

    return NextResponse.json(
      {
        success: true,
        data: list,
        summary: {
          totalAmount,
          count: list.length,
          byCategory,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al consultar los gastos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const {
      category,
      description,
      amount,
      expenseDate,
      paymentMethod = "EFECTIVO",
      recipient,
      receiptNumber,
      notes,
      registeredBy = "Administración",
    } = body;

    if (!category) {
      return NextResponse.json(
        { success: false, error: "La categoría del gasto es obligatoria." },
        { status: 400 }
      );
    }

    if (!description || description.trim() === "") {
      return NextResponse.json(
        { success: false, error: "La descripción del gasto es obligatoria." },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "El monto debe ser un número mayor a cero." },
        { status: 400 }
      );
    }

    const newExpense = {
      id: genId("exp"),
      tenantId,
      category,
      description: description.trim(),
      amount: parsedAmount,
      expenseDate: colombiaDateStringToIso(expenseDate),
      paymentMethod,
      recipient: recipient ? recipient.trim() : null,
      receiptNumber: receiptNumber ? receiptNumber.trim() : null,
      notes: notes ? notes.trim() : null,
      registeredBy: registeredBy ? registeredBy.trim() : "Administración",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("cl_expenses")
      .insert(newExpense)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al registrar el gasto" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del gasto es obligatorio." },
        { status: 400 }
      );
    }

    if (updates.amount) {
      updates.amount = Number(updates.amount);
    }
    if (updates.expenseDate) {
      updates.expenseDate = colombiaDateStringToIso(updates.expenseDate);
    }
    updates.updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("cl_expenses")
      .update(updates)
      .eq("id", id)
      .eq("tenantId", tenantId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al actualizar el gasto" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El ID del gasto es requerido para eliminarlo." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("cl_expenses")
      .delete()
      .eq("id", id)
      .eq("tenantId", tenantId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Gasto eliminado correctamente." });
  } catch (error: any) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al eliminar el gasto" },
      { status: 500 }
    );
  }
}
