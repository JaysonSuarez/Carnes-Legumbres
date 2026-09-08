"use client";

import React from "react";
import {
  TrendingUp,
  Beef,
  Calculator,
  Package,
  ShoppingCart,
  Trash2,
  Store,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StockNotificationCenter } from "@/components/StockNotificationCenter";

export type ActiveTab =
  | "dashboard"
  | "reports"
  | "meat-batch"
  | "smart-pricing"
  | "inventory"
  | "pos"
  | "waste";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  marginAlertCount?: number;
  stockAlertCount?: number;
}

export function Navbar({
  activeTab,
  setActiveTab,
  marginAlertCount = 0,
  stockAlertCount = 0,
}: NavbarProps) {
  const tabs = [
    {
      id: "dashboard" as ActiveTab,
      label: "Cómo Vamos",
      icon: TrendingUp,
    },
    {
      id: "reports" as ActiveTab,
      label: "Registro & Facturas",
      icon: Receipt,
    },
    {
      id: "meat-batch" as ActiveTab,
      label: "Simulador de Desposte",
      icon: Beef,
      badge: "≥ 30%",
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
    {
      id: "pos" as ActiveTab,
      label: "Punto de Venta",
      icon: ShoppingCart,
    },
    {
      id: "waste" as ActiveTab,
      label: "Mermas",
      icon: Trash2,
    },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Top Header */}
        <div className="flex items-center justify-between h-14 border-b border-slate-100">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs shrink-0">
              <Store className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                  Carne & Legumbre
                </span>
                <Badge variant="outline" className="hidden md:inline-flex text-[10px] font-medium py-0 h-4 border-slate-200 text-slate-600">
                  Gestión Operativa
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Badge variant="success" className="hidden sm:inline-flex px-2.5 py-0.5 text-xs font-semibold">
              Meta: Margen Real ≥ 30%
            </Badge>
            <StockNotificationCenter
              onNavigateToInventory={() => setActiveTab("inventory")}
            />
          </div>
        </div>

        {/* Tab Navigation con Scroll Táctil Inercial */}
        <nav className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none touch-scroll">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 min-h-[36px] ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
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
                  <Badge variant="destructive" className="h-4 px-1 text-[10px] font-bold">
                    {tab.alertCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
