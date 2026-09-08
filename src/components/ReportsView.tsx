"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency, formatWeight } from "@/lib/finance";
import {
  Calendar,
  Receipt,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Zap,
  DollarSign,
  Package,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDialog, SaleInvoiceData } from "@/components/InvoiceDialog";

type PeriodType = "daily" | "weekly" | "biweekly" | "monthly";

interface Benchmark {
  frequency: string;
  description: string;
  mermaEstimada: string;
  rotacionCapital: string;
  flujoCaja: string;
  impactoMargen: string;
  recomendacion: string;
}

interface AnalyticsPeriodResponse {
  period: PeriodType;
  periodLabel: string;
  kpi: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    overallRealMarginPercent: number;
    totalQuantityKg: number;
    salesCount: number;
    targetMarginSatisfied: boolean;
  };
  purchasesKpi: {
    totalSpent: number;
    totalKg: number;
    batchesCount: number;
  };
  waste: {
    totalWasteCost: number;
    totalWasteKg: number;
    logsCount: number;
  };
  periodSales: any[];
  periodBatches: any[];
  frequencyBenchmarks: Benchmark[];
}

export function ReportsView() {
  const [period, setPeriod] = useState<PeriodType>("daily");
  const [data, setData] = useState<AnalyticsPeriodResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros y diálogos
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoiceData | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Simulador de presupuesto de compra semanal
  const [simWeeklyBudget, setSimWeeklyBudget] = useState<number>(2500000);

  const fetchReports = async (p: PeriodType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Error al cargar reportes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  const handleOpenInvoice = (sale: any) => {
    setSelectedInvoice(sale);
    setIsInvoiceOpen(true);
  };

  const periodTabs: Array<{ id: PeriodType; label: string; desc: string }> = [
    { id: "daily", label: "Diario", desc: "Hoy" },
    { id: "weekly", label: "Semanal", desc: "Esta semana (Lun-Dom)" },
    { id: "biweekly", label: "Quincenal", desc: "Quincena en curso" },
    { id: "monthly", label: "Mensual", desc: "Mes actual completo" },
  ];

  const filteredSales = (data?.periodSales || []).filter((sale) => {
    const q = ticketSearch.toLowerCase();
    return (
      sale.saleCode?.toLowerCase().includes(q) ||
      sale.customerName?.toLowerCase().includes(q) ||
      sale.paymentMethod?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Selector de Período Superior */}
      <Card className="shadow-xs border-slate-200">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-700" />
              <h1 className="text-lg font-bold text-slate-900">
                Registro de Ventas, Compras y Rentabilidad
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoría periódica de tickets emitidos, lotes adquiridos y comparación de compras por frecuencia.
            </p>
          </div>

          {/* Segmented Control de Período */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
            {periodTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  period === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rango Activo */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Mostrando datos para:</span>
          <strong className="text-slate-900 font-medium">
            {data?.periodLabel || "Cargando período..."}
          </strong>
        </div>

        <Badge variant="outline" className="text-[11px] font-mono border-slate-300 text-slate-700">
          Objetivo de Margen: ≥ 30% Real
        </Badge>
      </div>

      {/* Tarjetas KPI del Período */}
      {loading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Ventas */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Ventas Totales</span>
                <Receipt className="w-4 h-4 text-slate-400" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-slate-900 font-mono">
                {formatCurrency(data.kpi.totalRevenue)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex justify-between items-center">
              <span>{data.kpi.salesCount} tickets cobrados</span>
              <span>{formatWeight(data.kpi.totalQuantityKg)}</span>
            </CardContent>
          </Card>

          {/* Compras / Inversión */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Compras / Lotes</span>
                <ShoppingBag className="w-4 h-4 text-slate-400" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-slate-900 font-mono">
                {formatCurrency(data.purchasesKpi.totalSpent)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex justify-between items-center">
              <span>{data.purchasesKpi.batchesCount} compras registradas</span>
              <span>{formatWeight(data.purchasesKpi.totalKg)} comprados</span>
            </CardContent>
          </Card>

          {/* Utilidad Bruta Real */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Utilidad Real</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </CardDescription>
              <CardTitle
                className={`text-xl font-bold font-mono ${
                  data.kpi.totalProfit > 0 ? "text-emerald-700" : "text-slate-900"
                }`}
              >
                {data.kpi.totalProfit > 0 ? `+${formatCurrency(data.kpi.totalProfit)}` : formatCurrency(0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] flex justify-between items-center">
              <span className="text-slate-500">Margen Efectivo:</span>
              <Badge
                variant={data.kpi.overallRealMarginPercent >= 30 ? "success" : "destructive"}
                className="text-[10px] font-bold"
              >
                {data.kpi.overallRealMarginPercent}% Real
              </Badge>
            </CardContent>
          </Card>

          {/* Pérdidas por Merma */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Mermas / Pérdidas</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-rose-600 font-mono">
                -{formatCurrency(data.waste.totalWasteCost)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-slate-500 flex justify-between items-center">
              <span>{data.waste.logsCount} descartes</span>
              <span>-{formatWeight(data.waste.totalWasteKg)}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECCIÓN 1: COMPARATIVA DE FRECUENCIA DE COMPRA (1, 2, 3, 4 VECES POR SEMANA) */}
      <Card className="shadow-xs border-slate-200 overflow-hidden">
        <CardHeader className="p-5 pb-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <CardTitle className="text-base font-bold text-white">
                  Comparador de Rentabilidad por Frecuencia de Compra
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-300 mt-1">
                ¿Qué pasa cuando compras 1, 2, 3 o 4 veces por semana? Impacto real en mermas, liquidez y margen.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-mono shrink-0">Presupuesto Semanal:</span>
              <div className="w-36">
                <CurrencyInput
                  prefix="$"
                  value={simWeeklyBudget}
                  onChange={setSimWeeklyBudget}
                  className="h-8 text-xs bg-slate-800 border-slate-600 text-white font-mono placeholder:text-slate-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Opción 1: 1 Compra/Semana */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs font-bold border-slate-300 text-slate-800">
                    1 Compra / Semana
                  </Badge>
                  <span className="text-[11px] font-mono text-rose-600 font-semibold">Merma ~8.5%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Compra Semanal Masiva</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Adquieres todo el lunes. Gran parte del producto pasa 5 a 7 días en cámara fría o mostrador.
                </p>

                <div className="mt-3 p-2.5 bg-rose-50/60 rounded-lg border border-rose-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Pérdida est. en merma:</span>
                    <strong className="text-rose-700 font-mono">
                      -{formatCurrency(simWeeklyBudget * 0.085)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Rotación de caja:</span>
                    <strong className="text-slate-800">Lenta (7 días)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Impacto en Margen:</span>
                    <strong className="text-rose-600">-4.5% de utilidad</strong>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic border-t border-slate-100 pt-2">
                ⚠ Alta merma por deshidratación en carne y deterioro acelerado en verduras de hoja.
              </p>
            </div>

            {/* Opción 2: 2 Compras/Semana */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs font-bold border-blue-200 bg-blue-50 text-blue-800">
                    2 Compras / Semana
                  </Badge>
                  <span className="text-[11px] font-mono text-amber-700 font-semibold">Merma ~4.5%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Reposición Lunes y Jueves</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Divides el pedido en 2 bloques. Mercadería fresca antes del pico de ventas de fin de semana.
                </p>

                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Pérdida est. en merma:</span>
                    <strong className="text-amber-700 font-mono">
                      -{formatCurrency(simWeeklyBudget * 0.045)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Rotación de caja:</span>
                    <strong className="text-slate-800">Media (3-4 días)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Ahorro vs 1 compra:</span>
                    <strong className="text-emerald-700 font-mono">
                      +{formatCurrency(simWeeklyBudget * 0.04)} / sem
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                ✓ Buen equilibrio entre tiempo operativo de pedidos y reducción del 50% de la merma.
              </p>
            </div>

            {/* Opción 3: 3 Compras/Semana (RECOMENDADO) */}
            <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/20 p-4 space-y-3 flex flex-col justify-between relative shadow-xs">
              <div className="absolute -top-2.5 right-3">
                <Badge variant="success" className="text-[10px] uppercase tracking-wider font-bold">
                  ★ Recomendado
                </Badge>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs font-bold border-emerald-300 bg-emerald-100 text-emerald-900">
                    3 Compras / Semana
                  </Badge>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">Merma ~2.5%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Lunes, Miércoles, Viernes</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Rotación rápida de 48h. El producto llega fresco, se vende rápido y el capital no queda congelado.
                </p>

                <div className="mt-3 p-2.5 bg-white rounded-lg border border-emerald-200 text-xs space-y-1.5 shadow-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Pérdida est. en merma:</span>
                    <strong className="text-emerald-700 font-mono">
                      -{formatCurrency(simWeeklyBudget * 0.025)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Rotación de caja:</span>
                    <strong className="text-emerald-800">Rápida (48 horas)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Ahorro mensual neto:</span>
                    <strong className="text-emerald-700 font-bold font-mono">
                      +{formatCurrency(simWeeklyBudget * 0.06 * 4)}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-emerald-800 font-medium border-t border-emerald-200/60 pt-2">
                ★ Punto dorado: maximiza el margen real al 30-34% al suprimir el descarte por maduración.
              </p>
            </div>

            {/* Opción 4: 4+ Compras/Semana */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs font-bold border-purple-200 bg-purple-50 text-purple-800">
                    4+ Compras / Semana
                  </Badge>
                  <span className="text-[11px] font-mono text-purple-700 font-semibold">Merma ~1.5%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Just-in-Time / Diaria</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Solo pides lo que vendes al día siguiente. Merma mínima, máxima frescura en mostrador.
                </p>

                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Pérdida est. en merma:</span>
                    <strong className="text-purple-700 font-mono">
                      -{formatCurrency(simWeeklyBudget * 0.015)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Rotación de caja:</span>
                    <strong className="text-slate-800">Inmediata (24h)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Flete / Logística:</span>
                    <strong className="text-amber-700">Revisar costos</strong>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                ✓ Excelente si el proveedor no cobra recargo por flete frecuente y el volumen lo amerita.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 2: REGISTRO DE TICKETS Y FACTURAS DEL PERÍODO */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5 text-slate-700" />
                Registro de Facturas y Tickets de Venta ({data?.periodLabel})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Consulta y reimprime cualquier factura de este período con desglose comercial y auditoría de rentabilidad.
              </CardDescription>
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Buscar ticket o cliente..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-0">
          {filteredSales.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                No hay tickets registrados en {data?.periodLabel || "este período"}.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cuando realices ventas en el Punto de Venta (POS), aparecerán aquí con opción de reimpresión.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Ticket / Código</th>
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Medio de Pago</th>
                    <th className="py-2.5 px-3 text-right">Items</th>
                    <th className="py-2.5 px-3 text-right">Total Facturado</th>
                    <th className="py-2.5 px-3 text-center">Margen Real</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {sale.saleCode}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(sale.date).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {sale.customerName || "Cliente Mostrador"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        {sale.items?.length || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={sale.realMarginPercent >= 30 ? "success" : "destructive"}
                          className="text-[10px] font-bold"
                        >
                          {sale.realMarginPercent}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenInvoice(sale)}
                          className="h-7 text-[11px] gap-1 px-2.5"
                        >
                          <Printer className="w-3 h-3 text-slate-500" />
                          Ver Factura
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓN 3: REGISTRO DE COMPRAS Y LOTES DEL PERÍODO */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4.5 h-4.5 text-slate-700" />
                Registro de Compras y Lotes Adquiridos ({data?.periodLabel})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Seguimiento de costos de compra por mayor y estado de avance de recuperación de capital.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-0">
          {(data?.periodBatches || []).length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                No hay compras o pedidos de carne registrados en {data?.periodLabel || "este período"}.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Utiliza el "Simulador de Desposte" para cargar nuevos lotes de carne o recepcionar compras de legumbres.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Lote #</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Proveedor</th>
                    <th className="py-2.5 px-3 text-right">Peso Total</th>
                    <th className="py-2.5 px-3 text-right">Costo Invertido</th>
                    <th className="py-2.5 px-3 text-right">Venta Proyectada</th>
                    <th className="py-2.5 px-3 text-center">Margen Proyectado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.periodBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {batch.batchNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(batch.date).toLocaleDateString("es-CO")}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {batch.supplier}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatWeight(batch.totalWeightKg || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(batch.totalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatCurrency(batch.projectedRevenue)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={batch.projectedRealMargin >= 30 ? "success" : "destructive"}
                          className="text-[10px] font-bold"
                        >
                          {batch.projectedRealMargin}% Real
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Factura / Ticket POS */}
      <InvoiceDialog
        sale={selectedInvoice}
        open={isInvoiceOpen}
        onOpenChange={setIsInvoiceOpen}
      />
    </div>
  );
}
