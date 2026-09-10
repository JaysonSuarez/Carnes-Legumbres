"use client";

import { TenantId, DEFAULT_TENANT_ID, TENANT_COOKIE_NAME } from "./tenant";

export type UserRole = "admin" | "cashier";

export interface AuthSession {
  username: string;
  role: UserRole;
  name: string;
  tenantId: TenantId;
  loginAt: string;
}

const STORAGE_KEY = "carne_legumbre_auth_session";

export function authenticate(
  usernameInput: string,
  passwordInput: string
): { success: boolean; session?: AuthSession; error?: string } {
  const user = usernameInput.trim().toLowerCase();
  const pass = passwordInput.trim();

  // 1. Administrador Principal (Andrés) - Permite "admin" o "andresadmin"
  if ((user === "admin" || user === "andresadmin") && pass === "carnesAA") {
    const session: AuthSession = {
      username: "admin",
      role: "admin",
      name: "Administrador",
      tenantId: "andres",
      loginAt: new Date().toISOString(),
    };
    saveSession(session);
    return { success: true, session };
  }

  // 2. Administrador Demo (Entorno de pruebas totalmente aislado)
  if ((user === "admindemo" || user === "demo") && (pass === "demo123" || pass === "demo2026")) {
    const session: AuthSession = {
      username: "admindemo",
      role: "admin",
      name: "Administrador (Demo)",
      tenantId: "demo",
      loginAt: new Date().toISOString(),
    };
    saveSession(session);
    return { success: true, session };
  }

  // 3. Encargado de Mostrador / Caja
  if (user === "mostrador" && pass === "mostrador1") {
    const session: AuthSession = {
      username: "mostrador",
      role: "cashier",
      name: "Encargado de Mostrador",
      tenantId: "andres",
      loginAt: new Date().toISOString(),
    };
    saveSession(session);
    return { success: true, session };
  }

  return {
    success: false,
    error: "Usuario o contraseña incorrectos. Verifica tus datos de acceso.",
  };
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    // Guardar cookie de tenant para que viaje automáticamente en cada fetch hacia la API
    document.cookie = `${TENANT_COOKIE_NAME}=${session.tenantId}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    console.error("Error saving auth session:", e);
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const session = JSON.parse(data) as AuthSession;
    // Asegurar retrocompatibilidad con sesiones previas que no tenían tenantId
    if (!session.tenantId) {
      session.tenantId = DEFAULT_TENANT_ID;
    }
    return session;
  } catch (e) {
    console.error("Error reading auth session:", e);
    return null;
  }
}

export function logout(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${TENANT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch (e) {
    console.error("Error clearing auth session:", e);
  }
}

export function hasRoleAccess(
  session: AuthSession | null,
  requiredRole: UserRole
): boolean {
  if (!session) return false;
  if (requiredRole === "cashier") {
    // Tanto el admin como el cajero pueden acceder al mostrador
    return session.role === "admin" || session.role === "cashier";
  }
  if (requiredRole === "admin") {
    // Solo el admin puede acceder al panel principal
    return session.role === "admin";
  }
  return false;
}
