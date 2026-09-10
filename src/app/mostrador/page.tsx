"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Store,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Clock,
  LogOut,
  User,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PosView } from "@/components/PosView";
import { CreditsView } from "@/components/CreditsView";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { LoginForm } from "@/components/LoginForm";
import { getSession, logout, AuthSession, hasRoleAccess } from "@/lib/auth";

export default function MostradorPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [activeView, setActiveView] = useState<"pos" | "credits">("pos");

  useEffect(() => {
    const s = getSession();
    if (s && hasRoleAccess(s, "cashier")) {
      setSession(s);
    }
    setAuthChecked(true);

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session || !hasRoleAccess(session, "cashier")) {
    return (
      <LoginForm
        requiredRole="cashier"
        title="Terminal de Mostrador & Caja"
        subtitle="Ingreso autorizado para personal de mostrador y ventas."
        onSuccess={(newSession) => setSession(newSession)}
      />
    );
  }

  const handleLogout = () => {
    logout();
    setSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col text-slate-800 antialiased">
      {/* Encabezado Exclusivo del Mostrador de Ventas */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate">
                  Carne & Legumbre
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-emerald-300 text-emerald-800 bg-emerald-50/70"
                >
                  Mostrador
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Terminal exclusiva para registro ágil de ventas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Reloj en tiempo real */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Identificador del Cajero / Usuario Activo */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs font-semibold">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span className="truncate max-w-[130px]">{session.name}</span>
            </div>

            <OfflineSyncIndicator />

            {/* Botón de pantalla completa para pantalla táctil */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              aria-label="Alternar pantalla completa"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Botón Cartera & Fiados */}
            <button
              type="button"
              onClick={() => setActiveView(activeView === "pos" ? "credits" : "pos")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                activeView === "credits"
                  ? "bg-slate-900 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-slate-950"
              }`}
              title={activeView === "pos" ? "Consultar fiados y registrar abonos" : "Volver a la caja de ventas"}
            >
              {activeView === "pos" ? (
                <>
                  <WalletCards className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cartera / Fiados</span>
                  <span className="sm:hidden">Fiados</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Volver a Caja</span>
                </>
              )}
            </button>

            {/* Enlace al panel principal solo si la sesión activa es de Administrador */}
            {session.role === "admin" && (
              <Link
                href="/"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                title="Volver al panel de administración"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Panel Admin</span>
              </Link>
            )}

            {/* Botón Cerrar Turno */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              title="Cerrar turno de mostrador"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Turno</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal del Mostrador */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-3 sm:px-6 sm:py-5 lg:p-6 pb-20 md:pb-6">
        {activeView === "pos" ? (
          <PosView showHeader={false} />
        ) : (
          <CreditsView />
        )}
      </main>

      {/* Footer Minimalista del Mostrador */}
      <footer className="border-t border-slate-200/80 bg-white py-3 text-xs text-slate-500 print:hidden hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Terminal de Mostrador & Caja
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Modo seguro sin exposición de utilidades ni costos internos
            </span>
          </div>
          <span className="text-slate-400 font-mono">
            Ruta: /mostrador
          </span>
        </div>
      </footer>
    </div>
  );
}
