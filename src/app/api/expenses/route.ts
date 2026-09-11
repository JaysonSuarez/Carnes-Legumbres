import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

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

    const now = new Date();
    if (period === "daily") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      query = query.gte("expenseDate", start.toISOString()).lte("expenseDate", end.toISOString());
    } else if (period === "weekly") {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      query = query.gte("expenseDate", start.toISOString()).lte("expenseDate", end.toISOString());
    } else if (period === "biweekly") {
      const currentDay = now.getDate();
      if (currentDay <= 15) {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999);
        query = query.gte("expenseDate", start.toISOString()).lte("expenseDate", end.toISOString());
      } else {
        const start = new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0, 0);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const end = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59, 999);
        query = query.gte("expenseDate", start.toISOString()).lte("expenseDate", end.toISOString());
      }
    } else if (period === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const end = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59, 999);
      query = query.gte("expenseDate", start.toISOString()).lte("expenseDate", end.toISOString());
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
          "Cache-Control": "private, max-age=5, stale-while-revalidate=15",
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
      expenseDate: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
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
