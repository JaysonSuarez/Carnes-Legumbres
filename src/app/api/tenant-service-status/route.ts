import { NextResponse } from "next/server";
import { getTenantId } from "@/lib/tenant";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const tenantId = getTenantId(request);
  if (tenantId === "demo") {
    return NextResponse.json({ success: true, active: true });
  }

  try {
    const { data, error } = await supabase
      .from("cl_tenant_service_access")
      .select("active,updatedAt")
      .eq("tenantId", "andres")
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({
      success: true,
      active: data?.active ?? true,
      updatedAt: data?.updatedAt ?? null,
    });
  } catch (error) {
    console.error("Unable to check tenant service status:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo consultar el estado del servicio." },
      { status: 503 }
    );
  }
}

