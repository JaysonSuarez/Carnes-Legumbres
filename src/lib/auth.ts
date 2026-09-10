"use client";

export type UserRole = "admin" | "cashier";

export interface AuthSession {
  username: string;
  role: UserRole;
  name: string;
  loginAt: string;
}

const STORAGE_KEY = "carne_legumbre_auth_session";

export function authenticate(
  usernameInput: string,
  passwordInput: string
): { success: boolean; session?: AuthSession; error?: string } {
  const user = usernameInput.trim().toLowerCase();
  const pass = passwordInput.trim();

  if (user === "andresadmin" && pass === "carnesAA") {
    const session: AuthSession = {
      username: "andresadmin",
      role: "admin",
      name: "Andrés (Administrador)",
      loginAt: new Date().toISOString(),
    };
    saveSession(session);
    return { success: true, session };
  }

  if (user === "mostrador" && pass === "mostrador1") {
    const session: AuthSession = {
      username: "mostrador",
      role: "cashier",
      name: "Encargado de Mostrador",
      loginAt: new Date().toISOString(),
    };
    saveSession(session);
    return { success: true, session };
  }

  return {
    success: false,
    error: "Usuario o contraseña incorrectos. Verifica tus datos.",
  };
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Error saving auth session:", e);
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as AuthSession;
  } catch (e) {
    console.error("Error reading auth session:", e);
    return null;
  }
}

export function logout(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
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
