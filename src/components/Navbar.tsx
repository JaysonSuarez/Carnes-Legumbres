"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Beef,
  Calculator,
  Package,
  ShoppingCart,
  Trash2,
  Store,
  Receipt,
  Menu,
  X,
  Boxes,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  LogOut,
  WalletCards,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StockNotificationCenter } from "@/components/StockNotificationCenter";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";

export type ActiveTab =
  | "dashboard"
  | "reports"
  | "meat-batch"
  | "smart-pricing"
  | "inventory"
  | "pos"
  | "waste"
  | "credits"
  | "expenses";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  marginAlertCount?: number;
  stockAlertCount?: number;
  currentUser?: string;
  tenantId?: string;
  onLogout?: () => void;
}

interface DesktopTabItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  alertCount?: number;
}

export function Navbar({
  activeTab,
  setActiveTab,
  marginAlertCount = 0,
  stockAlertCount = 0,
  currentUser,
  tenantId,
  onLogout,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopTabs: DesktopTabItem[] = [
    {
      id: "dashboard" as ActiveTab,
      label: "Cómo Vamos",
      icon: TrendingUp,
    },
    {
      id: "pos" as ActiveTab,
      label: "Punto de Venta",
      icon: ShoppingCart,
    },
    {
      id: "credits" as ActiveTab,
      label: "Cartera & Fiados",
      icon: WalletCards,
    },
    {
      id: "expenses" as ActiveTab,
      label: "Gastos Operativos",
      icon: ReceiptText,
    },
    {
      id: "reports" as ActiveTab,
      label: "Registro & Facturas",
      icon: Receipt,
    },
    {
      id: "smart-pricing" as ActiveTab,
      label: "Calculadora de Precios",
      icon: Calculator,
    },
    {
      id: "inventory" as ActiveTab,
      label: "Inventario",
      icon: Package,
      alertCount: stockAlertCount > 0 ? stockAlertCount : marginAlertCount,
    },
  ];

  // 4 pestañas de uso frecuente en el celular
  const mobileNavItems = [
    {
      id: "pos" as ActiveTab,
      label: "Venta",
      icon: ShoppingCart,
    },
    {
      id: "inventory" as ActiveTab,
      label: "Inventario",
      icon: Package,
      alertCount: stockAlertCount > 0 ? stockAlertCount : marginAlertCount,
    },
    {
      id: "dashboard" as ActiveTab,
      label: "Inicio",
      icon: TrendingUp,
    },
    {
      id: "reports" as ActiveTab,
      label: "Facturas",
      icon: Receipt,
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const isMoreTabActive = activeTab === "smart-pricing";

  return (
    <>
      {/* Header Superior (Desktop y Móvil) */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs shrink-0">
                <Store className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                    Carne & Legumbre
                  </span>
                  {tenantId === "demo" ? (
                    <Badge
                      variant="destructive"
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] tracking-wide px-2 py-0.5 shadow-xs border-0 uppercase animate-pulse"
                      title="Estás en el entorno de pruebas aislado (Demo). No afecta los datos de producción."
                    >
                      MODO DEMO
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="hidden md:inline-flex text-[10px] font-medium py-0 h-4 border-slate-200 text-slate-600"
                    >
                      Gestión Operativa
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <OfflineSyncIndicator />
              <Link
                href="/mostrador"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                title="Abrir apartado exclusivo de mostrador y ventas"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mostrador y Ventas</span>
                <span className="sm:hidden">Mostrador</span>
              </Link>
              <Badge
                variant="success"
                className="hidden lg:inline-flex px-2.5 py-0.5 text-xs font-semibold"
              >
                Meta ≥ 30%
              </Badge>
              <StockNotificationCenter
                onNavigateToInventory={() => handleSelectTab("inventory")}
              />
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                  title="Cerrar sesión de administrador"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              )}
            </div>
          </div>

          {/* Navegación Desktop (Visible en pantallas medianas y grandes >= md) */}
          <nav className="hidden md:flex space-x-1.5 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
            {desktopTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 min-h-[36px] ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isActive
                          ? "bg-slate-800 text-emerald-300"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {Boolean(tab.alertCount && tab.alertCount > 0) && (
                    <Badge
                      variant="destructive"
                      className="h-4 px-1 text-[10px] font-bold"
                    >
                      {tab.alertCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Barra de Navegación Inferior Móvil (Thumb Zone fija en < md) */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto items-center">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer select-none ${
                  isActive
                    ? "text-slate-900 font-bold bg-slate-100/90"
                    : "text-slate-500 hover:text-slate-800 active:scale-95"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? "scale-110 text-slate-900" : "text-slate-500"
                    }`}
                  />
                  {Boolean(item.alertCount && item.alertCount > 0) && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                      {item.alertCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Botón "Más" para abrir Bottom Sheet con herramientas secundarias */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer select-none ${
              isMoreTabActive || mobileMenuOpen
                ? "text-slate-900 font-bold bg-slate-100/90"
                : "text-slate-500 hover:text-slate-800 active:scale-95"
            }`}
          >
            <Menu
              className={`w-5 h-5 transition-transform ${
                isMoreTabActive || mobileMenuOpen
                  ? "scale-110 text-slate-900"
                  : "text-slate-500"
              }`}
            />
            <span className="text-[10px] mt-0.5 tracking-tight">Más</span>
            {isMoreTabActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute top-1 right-3" />
            )}
          </button>
        </div>
      </nav>

      {/* Drawer / Bottom Sheet Móvil "Más Opciones" */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tirador visual superior */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Herramientas y Gestión
                </h3>
                <p className="text-xs text-slate-500">
                  Simuladores, mermas y auditorías especializadas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opciones secundarias reorganizadas para el pulgar */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Apartado Único de Mostrador (/mostrador) */}
              <Link
                href="/mostrador"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3.5 rounded-xl border bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 text-slate-800 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>Mostrador y Ventas</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1 border-emerald-300 text-emerald-700 bg-white"
                      >
                        Terminal de Caja
                      </Badge>
                    </div>
                    <div className="text-[11px] text-emerald-800/80">
                      Pantalla exclusiva para registro ágil de ventas
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500" />
              </Link>

              {/* Cartera & Fiados */}
              <button
                type="button"
                onClick={() => handleSelectTab("credits")}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "credits"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      activeTab === "credits"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <WalletCards className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">
                      Cartera & Fiados
                    </div>
                    <div
                      className={`text-[11px] ${
                        activeTab === "credits"
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      Cuentas por cobrar, tasa 1% diario y abonos
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Control de Gastos */}
              <button
                type="button"
                onClick={() => handleSelectTab("expenses")}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "expenses"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      activeTab === "expenses"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">
                      Control de Gastos Operativos
                    </div>
                    <div
                      className={`text-[11px] ${
                        activeTab === "expenses"
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      Arriendo, servicios, nóminas e insumos
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Calculadora de Precios */}
              <button
                type="button"
                onClick={() => handleSelectTab("smart-pricing")}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "smart-pricing"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      activeTab === "smart-pricing"
                        ? "bg-slate-800 text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">
                      Calculadora de Precios
                    </div>
                    <div
                      className={`text-[11px] ${
                        activeTab === "smart-pricing"
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      Simula precios asegurando margen real del 30%
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Cerrar Sesión Móvil */}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="p-3.5 rounded-xl border bg-rose-50/70 hover:bg-rose-100 border-rose-200 text-rose-800 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-rose-950">
                        Cerrar Sesión de Administrador
                      </div>
                      <div className="text-[11px] text-rose-800/80">
                        Salir del panel de control
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

