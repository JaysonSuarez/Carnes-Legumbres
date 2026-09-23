import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hasSuperadminSession } from "@/lib/superadmin-auth";

export const dynamic = "force-dynamic";

async function readStatus() {
  const { data, error } = await supabase
    .from("cl_tenant_service_access")
    .select("active,updatedAt,updatedBy")
    .eq("tenantId", "andres")
    .maybeSingle();

  if (error) throw error;
  return {
    active: data?.active ?? true,
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? "system",
  };
}

export async function GET(request: NextRequest) {
  if (!hasSuperadminSession(request)) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json({ success: true, ...(await readStatus()) });
  } catch (error) {
    console.error("Unable to read tenant service access:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo consultar el estado del servicio." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasSuperadminSession(request)) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (typeof body.active !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Indica si el servicio debe estar activo." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("cl_tenant_service_access").upsert(
      {
        tenantId: "andres",
        active: body.active,
        updatedAt: new Date().toISOString(),
        updatedBy: "super",
      },
      { onConflict: "tenantId" }
    );
    if (error) throw error;

    return NextResponse.json({ success: true, ...(await readStatus()) });
  } catch (error) {
    console.error("Unable to update tenant service access:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo cambiar el estado del servicio." },
      { status: 500 }
    );
  }
}

