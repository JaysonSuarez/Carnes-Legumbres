"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccessStatus = {
  active: boolean;
  updatedAt: string | null;
  updatedBy: string;
};

export default function SuperadminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadAccessStatus = useCallback(async () => {
    const response = await fetch("/api/superadmin/access", { cache: "no-store" });
    if (response.status === 401) {
      setAuthenticated(false);
      return false;
    }

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "No se pudo consultar el servicio.");
    }

    setAccessStatus({
      active: Boolean(data.active),
      updatedAt: data.updatedAt || null,
      updatedBy: data.updatedBy || "system",
    });
    setAuthenticated(true);
    return true;
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await loadAccessStatus();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo conectar.");
      } finally {
        setCheckingSession(false);
      }
    };

    const timeout = window.setTimeout(() => void checkSession(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadAccessStatus]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo iniciar sesión.");
      }

      setPassword("");
      await loadAccessStatus();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
      setCheckingSession(false);
    }
  };

  const changeServiceAccess = async () => {
    if (!accessStatus) return;
    const nextActive = !accessStatus.active;
    const action = nextActive ? "reactivar" : "suspender";
    if (!window.confirm(`¿Confirmas ${action} el servicio del tenant Andrés?`)) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/superadmin/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar el cambio.");
      }
      setAccessStatus({
        active: Boolean(data.active),
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || "super",
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo guardar el cambio.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/superadmin/logout", { method: "POST" });
    setAuthenticated(false);
    setAccessStatus(null);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-900">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          ← Volver a Carne &amp; Legumbre
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Superadmin</h1>
            <p className="text-sm text-slate-500">Control de acceso del tenant Andrés</p>
          </div>
        </div>

        {checkingSession ? (
          <div className="mt-8 flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          </div>
        ) : authenticated && accessStatus ? (
          <div className="mt-8 space-y-5">
            <div className={`rounded-xl border p-5 ${accessStatus.active ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="flex items-center gap-3">
                {accessStatus.active ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                ) : (
                  <ShieldOff className="h-6 w-6 text-rose-700" aria-hidden="true" />
                )}
                <div>
                  <p className={`font-bold ${accessStatus.active ? "text-emerald-900" : "text-rose-900"}`}>
                    Servicio {accessStatus.active ? "activo" : "suspendido"}
                  </p>
                  <p className="text-xs text-slate-600">Tenant: Andrés</p>
                </div>
              </div>
              {accessStatus.updatedAt && (
                <p className="mt-3 text-xs text-slate-600">
                  Último cambio: {new Intl.DateTimeFormat("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Bogota",
                  }).format(new Date(accessStatus.updatedAt))}
                </p>
              )}
            </div>

            <Button
              type="button"
              disabled={busy}
              onClick={changeServiceAccess}
              variant={accessStatus.active ? "destructive" : "default"}
              className="h-12 w-full font-bold"
            >
              {busy
                ? "Guardando…"
                : accessStatus.active
                  ? "Suspender servicio de Andrés"
                  : "Reactivar servicio de Andrés"}
            </Button>

            {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}

            <Button type="button" variant="outline" disabled={busy} onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              Usuario
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
            <Button type="submit" disabled={busy} className="h-11 w-full font-semibold">
              {busy ? "Ingresando…" : "Ingresar como superadmin"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          El control de suspensión solo afecta al tenant Andrés.
        </p>
      </section>
    </main>
  );
}
