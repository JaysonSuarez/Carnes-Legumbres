"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  AlertTriangle,
  PackageX,
  Check,
  CheckCheck,
  ChevronRight,
  X,
  Volume2,
  ExternalLink,
  ShieldAlert,
  Boxes,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  StockAlertItem,
  playAlertChime,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "@/lib/stockAlerts";
import { getSession } from "@/lib/auth";

export interface StockToast {
  id: string;
  title: string;
  message: string;
  type?: "warning" | "destructive" | "info";
  timestamp: number;
}

export interface AdminNotification {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  readByAdmin: boolean;
  createdAt: string;
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

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Hace un momento";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return new Date(isoString).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
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
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [unreadSecurityCount, setUnreadSecurityCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"security" | "stock">("security");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<StockToast[]>([]);
  const [browserPerm, setBrowserPerm] = useState<string>("default");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

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

  // Cargar notificaciones de seguridad para el Administrador (Andrés)
  const fetchAdminNotifications = async () => {
    const session = getSession();
    if (!session || session.role !== "admin") return;

    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const notifs: AdminNotification[] = data.data;
        setAdminNotifications(notifs);
        const unread = notifs.filter((n) => !n.readByAdmin);
        setUnreadSecurityCount(unread.length);

        // Notificar en tiempo real al Admin (Andrés) con push, chime y toast
        unread.forEach((n) => {
          if (!notifiedIdsRef.current.has(n.id)) {
            notifiedIdsRef.current.add(n.id);
            if (initialLoadDoneRef.current) {
              playAlertChime(true);
              sendBrowserNotification(n.title, {
                body: n.message,
                tag: n.id,
              });
              const newToast: StockToast = {
                id: n.id,
                title: n.title,
                message: n.message,
                type: "destructive",
                timestamp: Date.now(),
              };
              setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
            }
          }
        });
        initialLoadDoneRef.current = true;
      }
    } catch (e) {
      console.error("Error al consultar notificaciones de admin:", e);
    }
  };

  useEffect(() => {
    // Carga inicial al montar el componente
    fetchStockAlerts();
    fetchAdminNotifications();

    // Polling ligero EXCLUSIVO para notificaciones de seguridad de admin cada 50s
    // (NUNCA recarga el catálogo completo de productos en segundo plano)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAdminNotifications();
      }
    }, 50000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAdminNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
  const totalStockAlerts = products.length;
  const totalBadgeCount = unreadSecurityCount + totalStockAlerts;

  const handleRequestPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      setBrowserPerm("granted");
      sendBrowserNotification("Carne & Legumbre", {
        body: "¡Notificaciones de seguridad e inventario activadas con éxito!",
      });
    } else {
      setBrowserPerm("denied");
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readByAdmin: true } : n))
      );
      setUnreadSecurityCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Error al marcar como leída:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setAdminNotifications((prev) =>
        prev.map((n) => ({ ...n, readByAdmin: true }))
      );
      setUnreadSecurityCount(0);
    } catch (e) {
      console.error("Error al marcar todas como leídas:", e);
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
            if (!isOpen) {
              fetchStockAlerts();
              fetchAdminNotifications();
              if (unreadSecurityCount > 0) {
                setActiveTab("security");
              }
            }
          }}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
            totalBadgeCount > 0
              ? "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          }`}
          title={
            unreadSecurityCount > 0
              ? `${unreadSecurityCount} cambios de precio/stock no revisados`
              : totalStockAlerts > 0
              ? `${totalStockAlerts} alertas de inventario`
              : "Centro de notificaciones"
          }
        >
          <Bell className="w-5 h-5" />

          {totalBadgeCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-white shadow-xs ${
                unreadSecurityCount > 0
                  ? "bg-rose-600 animate-pulse ring-2 ring-white"
                  : "bg-amber-600"
              }`}
            >
              {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
            </span>
          )}
        </button>

        {/* Panel Desplegable de Notificaciones */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-[400px] rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Panel */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Centro de Notificaciones
                </span>
              </div>
              {totalBadgeCount > 0 && (
                <Badge
                  variant={unreadSecurityCount > 0 ? "destructive" : "warning"}
                  className="text-[10px] px-2 py-0.5 font-bold"
                >
                  {unreadSecurityCount > 0
                    ? `${unreadSecurityCount} seguridad`
                    : `${totalStockAlerts} stock`}
                </Badge>
              )}
            </div>

            {/* Pestañas: Seguridad Mostrador vs Stock Crítico */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "security"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Seguridad</span>
                {unreadSecurityCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
                    {unreadSecurityCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("stock")}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "stock"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                <span>Stock Crítico</span>
                {totalStockAlerts > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-black">
                    {totalStockAlerts}
                  </span>
                )}
              </button>
            </div>

            {/* Aviso de Permisos de Escritorio */}
            {browserPerm !== "granted" && (
              <div className="p-2.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900">
                <span className="text-[11px] font-medium leading-tight">
                  ¿Activar alertas push ante cambios de precio o stock?
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

            {/* Contenido Pestaña Seguridad: Modificaciones hechas desde el Mostrador */}
            {activeTab === "security" && (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {adminNotifications.length > 0 && unreadSecurityCount > 0 && (
                  <div className="p-2 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      Cambios realizados en mostrador
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Marcar todo leído
                    </button>
                  </div>
                )}

                {adminNotifications.length === 0 ? (
                  <div className="p-8 text-center space-y-1.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-800">
                      Sin Alertas de Seguridad
                    </p>
                    <p className="text-[11px] text-slate-400">
                      No se han registrado modificaciones de precios ni ajustes desde el mostrador.
                    </p>
                  </div>
                ) : (
                  adminNotifications.map((notif) => {
                    const isUnread = !notif.readByAdmin;
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 transition-colors ${
                          isUnread
                            ? "bg-rose-50/40 hover:bg-rose-50/60"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                              )}
                              <span
                                className={`font-bold block truncate ${
                                  isUnread ? "text-rose-950" : "text-slate-800"
                                }`}
                              >
                                {notif.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 mt-1 leading-snug">
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(notif.createdAt)}
                              </span>
                              <span>•</span>
                              <span className="font-medium text-slate-600">
                                Por: {notif.metadata?.changedBy || "mostrador"}
                              </span>
                            </div>
                          </div>

                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-white border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                              title="Marcar como visto"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Contenido Pestaña Stock: Productos Agotados y Bajos */}
            {activeTab === "stock" && (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {loading && products.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    Verificando inventario...
                  </div>
                ) : totalStockAlerts === 0 ? (
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
            )}

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
                  className="w-full text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Ir al Inventario <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
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
                  ? "bg-rose-950 text-white border-rose-800"
                  : "bg-amber-950 text-white border-amber-800"
              }`}
            >
              <div className="p-1 rounded-lg bg-white/10 shrink-0 mt-0.5">
                {toast.type === "destructive" ? (
                  <ShieldAlert className="w-4 h-4 text-rose-300" />
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
