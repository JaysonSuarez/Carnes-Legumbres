import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from("cl_categories")
      .select("*, products:cl_products(count)")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const formatted = (categories || []).map((cat: any) => ({
      ...cat,
      _count: {
        products: cat.products?.[0]?.count ?? 0,
      },
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}
