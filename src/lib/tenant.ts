/**
 * Helper para resolución de tenant multi-inquilino en Carne & Legumbre.
 * Permite aislar completamente el espacio de datos de Andrés del espacio de pruebas Demo.
 */

export type TenantId = "andres" | "demo";

export const DEFAULT_TENANT_ID: TenantId = "andres";
export const TENANT_COOKIE_NAME = "carne_legumbre_tenant";
export const TENANT_HEADER_NAME = "x-tenant-id";

/**
 * Resuelve el tenantId a partir de la Request (header, cookie o query param).
 * Fallback seguro: "andres" para garantizar 100% de compatibilidad con datos existentes.
 */
export function getTenantId(request?: Request): TenantId {
  if (!request) return DEFAULT_TENANT_ID;

  try {
    // 1. Header prioritario (útil para llamadas de cliente explícitas o scripts de test)
    const headerVal = request.headers.get(TENANT_HEADER_NAME);
    if (headerVal === "demo" || headerVal === "andres") {
      return headerVal;
    }

    // 2. Cookie de sesión (enviada automáticamente por el navegador en cada fetch)
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TENANT_COOKIE_NAME}=([^;]+)`));
      if (match && (match[1] === "demo" || match[1] === "andres")) {
        return match[1] as TenantId;
      }
    }

    // 3. Query param opcional (?tenant=demo)
    const url = new URL(request.url);
    const paramVal = url.searchParams.get("tenant");
    if (paramVal === "demo" || paramVal === "andres") {
      return paramVal;
    }
  } catch {
    // Si ocurre algún error en parsing, usar fallback seguro
  }

  return DEFAULT_TENANT_ID;
}
