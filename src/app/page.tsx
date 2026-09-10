"use client";

import React, { useState, useEffect } from "react";
import { Navbar, ActiveTab } from "@/components/Navbar";
import { DashboardView } from "@/components/DashboardView";
import { SmartPricingView } from "@/components/SmartPricingView";
import { InventoryView } from "@/components/InventoryView";
import { PosView } from "@/components/PosView";
import { ReportsView } from "@/components/ReportsView";
import { CreditsView } from "@/components/CreditsView";

import { LoginForm } from "@/components/LoginForm";
import { getSession, logout, AuthSession } from "@/lib/auth";

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [marginAlertCount, setMarginAlertCount] = useState(0);
  const [stockAlertCount, setStockAlertCount] = useState(0);

  useEffect(() => {
    const s = getSession();
    if (s && s.role === "admin") {
      setSession(s);
    }
    setAuthChecked(true);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as ActiveTab;
      if (tab && tab !== "meat-batch" && tab !== "waste") {
        setActiveTab(tab);
      } else if (tab === "meat-batch" || tab === "waste") {
        setActiveTab("dashboard");
      }
    }
  }, []);

  const checkAlerts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success && data.data) {
        const belowCount = data.data.filter((p: any) => p.isBelowTarget).length;
        const lowStock = data.data.filter(
          (p: any) => p.currentStock <= 0 || p.currentStock <= (p.minStock || 5)
        ).length;
        setMarginAlertCount(belowCount);
        setStockAlertCount(lowStock);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkAlerts();
  }, [activeTab]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session || session.role !== "admin") {
    return (
      <LoginForm
        requiredRole="admin"
        title="Panel de Administración"
        subtitle="Ingreso exclusivo para administración y gestión operativa."
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
      {/* Barra de Navegación Principal */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        marginAlertCount={marginAlertCount}
        stockAlertCount={stockAlertCount}
        currentUser={session.name}
        tenantId={session.tenantId}
        onLogout={handleLogout}
      />

      {/* Contenedor Principal con espacio para la barra de navegación inferior móvil */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-3 sm:px-6 sm:py-6 lg:p-8 pb-24 md:pb-8">
        {activeTab === "dashboard" && (
          <DashboardView
            onNavigateToPos={() => setActiveTab("pos")}
            onNavigateToInventory={() => setActiveTab("inventory")}
          />
        )}

        {activeTab === "reports" && <ReportsView />}

        {activeTab === "smart-pricing" && <SmartPricingView />}

        {activeTab === "inventory" && <InventoryView />}

        {activeTab === "pos" && (
          <PosView
            onSaleCompleted={() => {
              checkAlerts();
            }}
          />
        )}

        {activeTab === "credits" && <CreditsView />}
      </main>

      {/* Footer Minimalista (Oculto en móvil para no estorbar con la navegación inferior) */}
      <footer className="hidden md:block border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Carne & Legumbre • Sistema de Gestión Comercial y Control Operativo
          </span>
          <span className="text-slate-400">
            Punto de Venta e Inventario
          </span>
        </div>
      </footer>
    </div>
  );
}
