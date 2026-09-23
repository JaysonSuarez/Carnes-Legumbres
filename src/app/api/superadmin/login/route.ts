import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  createSuperadminSessionToken,
  SUPERADMIN_COOKIE,
  verifySuperadminCredentials,
} from "@/lib/superadmin-auth";

export const dynamic = "force-dynamic";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const sessionSecret = process.env.SUPERADMIN_SESSION_SECRET;
  if (!sessionSecret || !process.env.SUPERADMIN_PASSWORD_HASH || !process.env.SUPERADMIN_USERNAME) {
    return NextResponse.json(
      { success: false, error: "El acceso de superadmin no está configurado." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (username.length > 80 || password.length > 256) {
      return NextResponse.json({ success: false, error: "Credenciales inválidas." }, { status: 401 });
    }

    const ipHash = createHmac("sha256", sessionSecret)
      .update(getClientIp(request))
      .digest("hex");
    const { data: attempt, error: attemptError } = await supabase
      .from("cl_superadmin_login_attempts")
      .select("attempts,windowStartedAt,blockedUntil")
      .eq("ipHash", ipHash)
      .maybeSingle();
    if (attemptError) throw attemptError;

    const now = Date.now();
    const blockedUntil = attempt?.blockedUntil ? Date.parse(attempt.blockedUntil) : 0;
    if (blockedUntil > now) {
      const retrySeconds = Math.ceil((blockedUntil - now) / 1000);
      return NextResponse.json(
        { success: false, error: "Demasiados intentos. Intenta más tarde." },
        { status: 429, headers: { "Retry-After": String(retrySeconds) } }
      );
    }

    if (!verifySuperadminCredentials(username, password)) {
      const windowStartedAt = attempt?.windowStartedAt ? Date.parse(attempt.windowStartedAt) : 0;
      const windowIsActive = now - windowStartedAt < RATE_WINDOW_MS;
      const attempts = windowIsActive ? Number(attempt?.attempts || 0) + 1 : 1;
      const nextAttempt = {
        ipHash,
        attempts,
        windowStartedAt: windowIsActive
          ? new Date(windowStartedAt).toISOString()
          : new Date(now).toISOString(),
        blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS).toISOString() : null,
        updatedAt: new Date(now).toISOString(),
      };
      const { error } = await supabase
        .from("cl_superadmin_login_attempts")
        .upsert(nextAttempt, { onConflict: "ipHash" });
      if (error) throw error;
      return NextResponse.json(
        { success: false, error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const { error: clearError } = await supabase
      .from("cl_superadmin_login_attempts")
      .delete()
      .eq("ipHash", ipHash);
    if (clearError) throw clearError;

    const token = createSuperadminSessionToken();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "El acceso de superadmin no está configurado." },
        { status: 503 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SUPERADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Superadmin login failed:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo iniciar sesión. Intenta nuevamente." },
      { status: 500 }
    );
  }
}

