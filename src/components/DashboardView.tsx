"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency, formatWeight } from "@/lib/finance";
import {
  TrendingUp,
  DollarSign,
  Beef,
  Scale,
  AlertCircle,
  CheckCircle,
  Package,
  ShoppingCart,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  kpi: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    overallRealMarginPercent: number;
    totalExpenses?: number;
    netProfit?: number;
    netMarginPercent?: number;
    totalQuantityKg: number;
    salesCount: number;
    targetMarginSatisfied: boolean;
  };
  expensesKpi?: {
    totalExpenses: number;
    byCategory: Record<string, number>;
    count: number;
  };
  timelineData: Array<{
    date: string;
    ventas: number;
    costo: number;
    utilidad: number;
    margenReal: number;
  }>;
  batchesProgress: Array<{
    id: string;
    batchNumber: string;
    supplier: string;
    date: string;
    totalCost: number;
    projectedRevenue: number;
    projectedProfit: number;
    projectedRealMargin: number;
    revenueGenerated: number;
    totalKg: number;
    soldKg: number;
    progressKgRatio: number;
    breakEvenRatio: number;
    isBreakEvenReached: boolean;
    itemsCount: number;
  }>;
  categoryStats: Array<{
    name: string;
    ventas: number;
    costo: number;
    utilidad: number;
    margenReal: number;
  }>;
  productsBelowTarget: Array<{
    id: string;
    name: string;
    category: string;
    costPrice: number;
    sellPrice: number;
    realMargin: number;
  }>;
  waste: {
    totalWasteCost: number;
    totalWasteKg: number;
  };
}

interface DashboardViewProps {
  onNavigateToPos?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToExpenses?: () => void;
}

interface StockAlertProduct {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  isOutOfStock: boolean;
  categoryName?: string;
}

export function DashboardView({
  onNavigateToPos,
  onNavigateToInventory,
  onNavigateToExpenses,
}: DashboardViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlertProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setErrorMessage(null);
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([analyticsRes, productsRes]) => {
        if (analyticsRes.success && analyticsRes.data) {
          setData(analyticsRes.data);
        } else {
          setErrorMessage(analyticsRes.error || "No se pudieron obtener las métricas.");
        }
        if (productsRes.success && Array.isArray(productsRes.data)) {
          const critical = productsRes.data
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
              categoryName: p.category?.name,
            }));
          setStockAlerts(critical);
        }
      })
      .catch((e) => {
        console.error(e);
        setErrorMessage("Error de conexión al cargar el panel.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-44" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <Card className="border-red-200 bg-red-50/50 p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-900">
            {errorMessage || "No se pudieron cargar los datos del sistema"}
          </h2>
          <p className="text-xs text-red-600 mt-2">
            No se pudo establecer conexión con la base de datos o los reportes.
          </p>
          <Button onClick={loadData} className="mt-5 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer">
            Reintentar carga
          </Button>
        </Card>
      </div>
    );
  }

  const { kpi, timelineData, batchesProgress, categoryStats, productsBelowTarget, waste } = data;
  const hasSales = kpi.salesCount > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabecera Principal */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Resumen General: "¿Cómo Vamos?"
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Estado de ingresos, rentabilidad sobre venta y avance de lotes de carne y legumbres.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasSales ? (
              <Badge
                variant={kpi.targetMarginSatisfied ? "success" : "destructive"}
                className="px-3 py-1 text-xs font-semibold"
              >
                {kpi.targetMarginSatisfied ? (
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                )}
                Margen Real Global: {kpi.overallRealMarginPercent}%{" "}
                {kpi.targetMarginSatisfied ? "(Meta ≥ 30% OK)" : "(Bajo Meta)"}
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1 text-xs font-medium text-slate-600 border-slate-300">
                Estado Inicial • Sin Ventas Registradas
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aviso de Inventario Crítico o Bajo Stock */}
      {stockAlerts.length > 0 && (
        <Card className="border-rose-300 bg-gradient-to-r from-rose-50 via-white to-amber-50 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Atención de Inventario: {stockAlerts.length} producto(s) en nivel crítico o agotados</span>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold">
                      {stockAlerts.filter((p) => p.isOutOfStock).length} Agotados
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Hay existencias por debajo del umbral mínimo configurado para ventas en mostrador.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {onNavigateToInventory && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onNavigateToInventory}
                    className="text-xs border-rose-300 text-rose-900 hover:bg-rose-100/60 font-semibold cursor-pointer"
                  >
                    Ver en Inventario <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-rose-100/80 flex flex-wrap gap-1.5">
              {stockAlerts.slice(0, 8).map((p) => (
                <span
                  key={p.id}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${
                    p.isOutOfStock
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      p.isOutOfStock ? "bg-rose-500" : "bg-amber-500"
                    }`}
                  />
                  <strong className="font-semibold">{p.name}</strong>
                  <span className="text-[10px] opacity-80">
                    ({p.currentStock} {p.unit})
                  </span>
                </span>
              ))}
              {stockAlerts.length > 8 && (
                <span className="text-[11px] text-slate-400 self-center px-1">
                  +{stockAlerts.length - 8} más...
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de 4 Métricas Clave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Ventas Totales */}
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Ventas Totales
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900">
              {formatCurrency(kpi.totalRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            {kpi.salesCount === 0 ? "0 tickets cobrados" : `${kpi.salesCount} tickets cobrados`}
          </CardContent>
        </Card>

        {/* Costo Mercancía */}
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Costo de lo Vendido
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900">
              {formatCurrency(kpi.totalCost)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            Reposición de inventario
          </CardContent>
        </Card>

        {/* Utilidad Bruta */}
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Utilidad Bruta Real
            </CardDescription>
            <CardTitle className={`text-xl font-bold ${kpi.totalProfit > 0 ? "text-emerald-700" : "text-slate-900"}`}>
              {kpi.totalProfit > 0 ? `+${formatCurrency(kpi.totalProfit)}` : formatCurrency(0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            Ganancia neta sobre ventas
          </CardContent>
        </Card>

        {/* Volumen en Kg */}
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Volumen Vendido
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900">
              {formatWeight(kpi.totalQuantityKg)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500">
            Despachado en balanza
          </CardContent>
        </Card>
      </div>

      {/* Resumen Financiero Integral: Verdadera Ganancia Neta */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 rounded-xl p-4 sm:p-5 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Resultado Operativo Real
              </span>
              <span className="text-xs text-slate-400">
                (Deduciendo Mercancía y Gastos)
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {(kpi.netProfit ?? kpi.totalProfit) >= 0
                  ? `+${formatCurrency(kpi.netProfit ?? kpi.totalProfit)}`
                  : `-${formatCurrency(Math.abs(kpi.netProfit ?? kpi.totalProfit))}`}
              </h3>
              <span className="text-xs font-semibold text-slate-300">
                Ganancia Neta en Bolsillo ({kpi.netMarginPercent ?? kpi.overallRealMarginPercent}% sobre ventas)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ingresos reales descontando costo de compras y gastos operativos (arriendo, servicios, nómina, insumos).
            </p>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-700/60 pt-3 md:pt-0 md:pl-5 text-xs shrink-0">
            <div className="space-y-1">
              <div className="text-slate-400 text-[11px] font-medium">Gastos Registrados:</div>
              <div className="font-black text-rose-400 text-base">
                -{formatCurrency(kpi.totalExpenses || 0)}
              </div>
            </div>
            {onNavigateToExpenses && (
              <Button
                size="sm"
                variant="outline"
                onClick={onNavigateToExpenses}
                className="ml-auto md:ml-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer"
              >
                Ver Gastos <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Proyección y Seguimiento de Lotes de Carne */}
      <Card className="shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Beef className="w-4.5 h-4.5 text-slate-700" />
                Seguimiento de Lotes de Carne y Punto de Equilibrio
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Progreso de recuperación de inversión por cada compra mayorista o desposte.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2">
          {batchesProgress.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No hay lotes registrados actualmente.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batchesProgress.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {batch.batchNumber}
                      </span>
                      <div className="text-xs text-slate-500">
                        {batch.supplier} • {new Date(batch.date).toLocaleDateString("es-CO")}
                      </div>
                    </div>
                    <Badge variant="success" className="text-xs">
                      {batch.projectedRealMargin}% Margen Proyectado
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white p-2.5 rounded-md border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Gasto Total</span>
                      <strong className="text-slate-900">{formatCurrency(batch.totalCost)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Venta Estimada</span>
                      <strong className="text-slate-900">{formatCurrency(batch.projectedRevenue)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">Utilidad Proy.</span>
                      <strong className="text-emerald-700">+{formatCurrency(batch.projectedProfit)}</strong>
                    </div>
                  </div>

                  {/* Barra de Recuperación */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Recuperado:</span>
                      <strong className="text-slate-900">
                        {formatCurrency(batch.revenueGenerated)} ({batch.breakEvenRatio}%)
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          batch.isBreakEvenReached ? "bg-emerald-600" : "bg-slate-900"
                        }`}
                        style={{ width: `${Math.min(100, batch.breakEvenRatio)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>
                        {batch.isBreakEvenReached
                          ? "✓ Inversión cubierta al 100%"
                          : `Falta ${formatCurrency(Math.max(0, batch.totalCost - batch.revenueGenerated))} para punto de equilibrio.`}
                      </span>
                      <span>
                        {batch.soldKg.toFixed(1)} / {batch.totalKg.toFixed(1)} kg ({batch.progressKgRatio}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfica de Ventas y Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfica */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-sm font-bold text-slate-900">
              Tendencia de Ventas y Ganancia
            </CardTitle>
            <CardDescription className="text-xs">
              Evolución diaria de facturación y utilidad neta real.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            {timelineData.length > 0 && hasSales ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" fontSize={10} stroke="#94a3b8" />
                    <YAxis
                      fontSize={10}
                      stroke="#94a3b8"
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: any) => formatCurrency(Number(v))}
                      contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      name="Venta"
                      stroke="#0f172a"
                      fill="#f8fafc"
                    />
                    <Area
                      type="monotone"
                      dataKey="utilidad"
                      name="Utilidad"
                      stroke="#059669"
                      fill="#ecfdf5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/40">
                <ShoppingCart className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  Aún no se han registrado transacciones de venta.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                  Al cobrar tus primeras ventas en el mostrador, la gráfica mostrará la evolución de tus ingresos y utilidades en vivo.
                </p>
                {onNavigateToPos && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNavigateToPos}
                    className="mt-3 text-xs"
                  >
                    Ir al Punto de Venta <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desglose por Categoría */}
        <Card className="shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900">
                Margen por Categoría
              </CardTitle>
              <CardDescription className="text-xs">
                Rendimiento de carnes vs legumbres.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-2">
              {categoryStats.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Sin ventas por categoría aún.
                </div>
              ) : (
                categoryStats.map((cat) => (
                  <div
                    key={cat.name}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs"
                  >
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{cat.name}</span>
                      <span className={cat.margenReal >= 30 ? "text-emerald-700" : "text-amber-700"}>
                        {cat.margenReal}% Real
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px] mt-0.5">
                      <span>Ventas: {formatCurrency(cat.ventas)}</span>
                      <span>+{formatCurrency(cat.utilidad)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>

          <div className="p-5 pt-0 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs text-slate-500 pt-3">
              <span>Pérdidas por Mermas:</span>
              <strong className="text-rose-700">-{formatCurrency(waste.totalWasteCost)}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerta si hay productos bajo 30% */}
      {productsBelowTarget.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Atención: {productsBelowTarget.length} producto(s) están configurados por debajo del 30% de margen real:
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {productsBelowTarget.map((p) => (
                <div key={p.id} className="bg-white p-2.5 rounded border border-amber-200 text-xs">
                  <span className="font-semibold text-slate-900 block">{p.name}</span>
                  <div className="flex justify-between text-slate-500 text-[11px] mt-1">
                    <span>Costo: {formatCurrency(p.costPrice)}</span>
                    <strong className="text-amber-700">Margen: {p.realMargin}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
