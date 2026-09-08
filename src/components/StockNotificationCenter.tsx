"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  AlertTriangle,
  PackageX,
  Check,
  ChevronRight,
  X,
  Volume2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  StockAlertItem,
  playAlertChime,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "@/lib/stockAlerts";

export interface StockToast {
  id: string;
  title: string;
  message: string;
  type?: "warning" | "destructive" | "info";
  timestamp: number;
}

/**
 * Función global para despachar una notificación toast de stock desde cualquier parte
 */
export function dispatchStockToast(toast: {
  title: string;
  message: string;
  type?: "warning" | "destructive" | "info";
  isCritical?: boolean;
}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("stock-toast-alert", { detail: toast })
    );
  }
}

interface StockNotificationCenterProps {
  onNavigateToInventory?: () => void;
}

export function StockNotificationCenter({
  onNavigateToInventory,
}: StockNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<StockAlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<StockToast[]>([]);
  const [browserPerm, setBrowserPerm] = useState<string>("default");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Consultar estado de permisos de notificación
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPerm(Notification.permission);
    }
  }, []);

  // Cargar productos y detectar alertas de stock
  const fetchStockAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const alertItems: StockAlertItem[] = data.data
          .filter(
            (p: any) =>
              p.currentStock <= 0 || p.currentStock <= (p.minStock || 5)
          )
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            unit: p.unit,
            currentStock: p.currentStock,
            minStock: p.minStock || 5,
            isOutOfStock: p.currentStock <= 0,
            isLowStock: p.currentStock > 0 && p.currentStock <= (p.minStock || 5),
            categoryName: p.category?.name,
          }));
        setProducts(alertItems);
      }
    } catch (e) {
      console.error("Error al consultar alertas de inventario:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockAlerts();

    // Actualizar periódicamente cada 60s
    const interval = setInterval(fetchStockAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Escuchar eventos de toast despachados por ventas u otras acciones
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        title: string;
        message: string;
        type?: "warning" | "destructive" | "info";
        isCritical?: boolean;
      }>;
      const { title, message, type = "warning", isCritical = false } =
        customEvent.detail;

      // Sonido de alerta
      playAlertChime(isCritical);

      // Notificación nativa de escritorio si está otorgado el permiso
      sendBrowserNotification(title, { body: message });

      // Agregar toast a la lista flotante
      const newToast: StockToast = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        message,
        type,
        timestamp: Date.now(),
      };
      setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

      // Refrescar lista de alertas
      fetchStockAlerts();
    };

    window.addEventListener("stock-toast-alert", handleToastEvent);
    return () => {
      window.removeEventListener("stock-toast-alert", handleToastEvent);
    };
  }, []);

  // Autocierre de toasts después de 6 segundos
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const outOfStock = products.filter((p) => p.isOutOfStock);
  const lowStock = products.filter((p) => p.isLowStock);
  const totalAlerts = products.length;

  const handleRequestPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      setBrowserPerm("granted");
      sendBrowserNotification("Carne & Legumbre", {
        body: "¡Notificaciones de inventario activadas con éxito!",
      });
    } else {
      setBrowserPerm("denied");
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* Botón de Campana en la barra superior */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) fetchStockAlerts();
          }}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
            totalAlerts > 0
              ? "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          }`}
          title={
            totalAlerts > 0
              ? `${totalAlerts} alertas de inventario bajo o agotado`
              : "Sin alertas de inventario"
          }
        >
          <Bell className="w-5 h-5" />

          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow-xs animate-pulse">
              {totalAlerts > 99 ? "99+" : totalAlerts}
            </span>
          )}
        </button>

        {/* Panel Desplegable de Notificaciones */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-[380px] rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Panel */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Alertas de Inventario
                </span>
              </div>
              <Badge
                variant={totalAlerts > 0 ? "destructive" : "secondary"}
                className="text-[10px] px-2 py-0.5 font-bold"
              >
                {totalAlerts} {totalAlerts === 1 ? "alerta" : "alertas"}
              </Badge>
            </div>

            {/* Aviso de Permisos de Escritorio */}
            {browserPerm !== "granted" && (
              <div className="p-2.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900">
                <span className="text-[11px] font-medium leading-tight">
                  ¿Deseas recibir avisos de escritorio al agotarse un producto?
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestPermission}
                  className="h-6 text-[11px] px-2 border-amber-300 hover:bg-amber-100 text-amber-950 font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Activar
                </Button>
              </div>
            )}

            {/* Lista de Alertas */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
              {loading && products.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Verificando inventario...
                </div>
              ) : totalAlerts === 0 ? (
                <div className="p-8 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-800">
                    Inventario en Buen Estado
                  </p>
                  <p className="text-[11px] text-slate-400">
                    No hay productos agotados ni por debajo del umbral mínimo.
                  </p>
                </div>
              ) : (
                <>
                  {/* Agotados */}
                  {outOfStock.length > 0 && (
                    <div className="p-2 bg-rose-50/40">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider px-2 block mb-1">
                        Agotados ({outOfStock.length})
                      </span>
                      <div className="space-y-1">
                        {outOfStock.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 bg-white rounded-lg border border-rose-200 flex items-center justify-between shadow-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-900 block truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {p.categoryName || "General"} • Mínimo req:{" "}
                                {p.minStock} {p.unit}
                              </span>
                            </div>
                            <Badge
                              variant="destructive"
                              className="text-[10px] font-bold shrink-0"
                            >
                              0 {p.unit}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bajo Stock */}
                  {lowStock.length > 0 && (
                    <div className="p-2 bg-amber-50/40">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider px-2 block mb-1">
                        Stock Bajo ({lowStock.length})
                      </span>
                      <div className="space-y-1">
                        {lowStock.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 bg-white rounded-lg border border-amber-200 flex items-center justify-between shadow-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-900 block truncate">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Mínimo: {p.minStock} {p.unit}
                              </span>
                            </div>
                            <span className="text-right shrink-0">
                              <strong className="text-amber-700 font-bold block">
                                {p.currentStock} {p.unit}
                              </strong>
                              <span className="text-[9px] text-amber-600 font-medium">
                                Reponer
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pie con Acciones Rápidas */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              {onNavigateToInventory && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToInventory();
                  }}
                  className="w-full text-xs font-semibold text-slate-700"
                >
                  Ir al Inventario <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
              <a
                href="/despensa"
                className="inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shrink-0"
                title="Abrir hoja de conteo privada"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Despensa
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Contenedor de Toasts Flotantes en la Pantalla */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200 ${
                toast.type === "destructive"
                  ? "bg-rose-900 text-white border-rose-800"
                  : "bg-amber-900 text-white border-amber-800"
              }`}
            >
              <div className="p-1 rounded-lg bg-white/10 shrink-0 mt-0.5">
                {toast.type === "destructive" ? (
                  <PackageX className="w-4 h-4 text-rose-300" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold leading-tight flex items-center justify-between">
                  <span>{toast.title}</span>
                </h4>
                <p className="text-[11px] text-white/90 mt-1 leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-white/60 hover:text-white p-1 rounded transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
