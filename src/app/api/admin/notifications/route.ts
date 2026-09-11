import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);

    const { data: notifications, error } = await supabase
      .from("cl_notifications")
      .select("*")
      .eq("tenantId", tenantId)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const unreadCount = (notifications || []).filter((n: any) => !n.readByAdmin).length;

    return NextResponse.json({
      success: true,
      data: notifications || [],
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching admin notifications:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
      const { error } = await supabase
        .from("cl_notifications")
        .update({ readByAdmin: true })
        .eq("tenantId", tenantId)
        .eq("readByAdmin", false);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Todas marcadas como leídas" });
    }

    if (id) {
      const { error } = await supabase
        .from("cl_notifications")
        .update({ readByAdmin: true })
        .eq("id", id)
        .eq("tenantId", tenantId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: "Notificación marcada como leída" });
    }

    return NextResponse.json({ success: false, error: "ID o markAll requerido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al actualizar notificaciones" },
      { status: 500 }
    );
  }
}
