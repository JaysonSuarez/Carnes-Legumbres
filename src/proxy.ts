import { NextRequest, NextResponse } from "next/server";

const TENANT_COOKIE = "carne_legumbre_tenant";
const SERVICE_ACCESS_TABLE = "cl_tenant_service_access";

async function isAndresServiceActive(): Promise<boolean | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wgqcfxsjswfcifovvecd.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  try {
    const endpoint = new URL(`/rest/v1/${SERVICE_ACCESS_TABLE}`, supabaseUrl);
    endpoint.search = new URLSearchParams({
      select: "active",
      tenantId: "eq.andres",
      limit: "1",
    }).toString();

    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const rows = (await response.json()) as Array<{ active?: boolean }>;
    return rows[0]?.active !== false;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname.startsWith("/api/superadmin/") ||
    pathname === "/api/tenant-service-status"
  ) {
    return NextResponse.next();
  }

  const tenantValues = [
    request.headers.get("x-tenant-id"),
    request.cookies.get(TENANT_COOKIE)?.value,
    searchParams.get("tenant"),
  ].filter(Boolean);
  const isApi = pathname.startsWith("/api/");
  const isAndresRequest =
    tenantValues.includes("andres") ||
    (isApi && !tenantValues.includes("demo"));

  if (!isAndresRequest) return NextResponse.next();

  const active = await isAndresServiceActive();
  if (active !== false) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      {
        success: false,
        code: "SERVICE_SUSPENDED",
        error: "El servicio está suspendido. Contacta a la administración.",
      },
      { status: 402 }
    );
  }

  return NextResponse.rewrite(new URL("/service-suspended", request.url));
}

export const config = {
  matcher: ["/", "/mostrador/:path*", "/despensa/:path*", "/api/:path*"],
};
