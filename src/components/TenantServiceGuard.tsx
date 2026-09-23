"use client";

import { useCallback, useEffect, useState } from "react";
import { LockKeyhole, RefreshCw } from "lucide-react";
import { TenantId } from "@/lib/tenant";

type AccessState = "checking" | "active" | "suspended";

export function TenantServiceGuard({ tenantId }: { tenantId: TenantId }) {
  const [accessState, setAccessState] = useState<AccessState>("checking");

  const checkAccess = useCallback(async () => {
    if (tenantId !== "andres") {
      setAccessState("active");
      return;
    }

    try {
      const response = await fetch("/api/tenant-service-status", {
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok && typeof data.active === "boolean") {
        setAccessState(data.active ? "active" : "suspended");
      } else {
        setAccessState((current) => current === "checking" ? "active" : current);
      }
    } catch {
      setAccessState((current) => current === "checking" ? "active" : current);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId !== "andres") return;

    const initialCheck = window.setTimeout(() => void checkAccess(), 0);
    const interval = window.setInterval(() => void checkAccess(), 15_000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
    };
  }, [checkAccess, tenantId]);

  if (accessState !== "suspended") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 text-white"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="tenant-suspended-title"
      aria-describedby="tenant-suspended-description"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-7 text-center text-slate-800 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 id="tenant-suspended-title" className="text-xl font-bold">
          Servicio suspendido
        </h1>
        <p id="tenant-suspended-description" className="mt-3 text-sm leading-relaxed text-slate-600">
          El acceso a Carne &amp; Legumbre está suspendido temporalmente. Comunícate
          con la administración para reactivarlo.
        </p>
        <button
          type="button"
          onClick={() => void checkAccess()}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Comprobar de nuevo
        </button>
      </div>
    </div>
  );
}
