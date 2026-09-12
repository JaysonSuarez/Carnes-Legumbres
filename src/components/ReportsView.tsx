"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatCurrency, formatWeight } from "@/lib/finance";
import {
  Calendar,
  Receipt,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
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
  Filter,
  Eye,
  WalletCards,
  RefreshCw,
  X,
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
import { getColombiaDateString } from "@/lib/dateUtils";

type PeriodType = "daily" | "weekly" | "monthly" | "all";

export interface MovementItem {
  id: string;
  type: "VENTA" | "GASTO" | "COMPRA" | "ABONO_CREDITO";
  flow: "INGRESO" | "EGRESO";
  date: string;
  timeStr: string;
  title: string;
  subtitle: string;
  amount: number;
  paymentMethod?: string;
  category?: string;
  referenceId?: string;
  raw?: any;
}

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
  period: string;
  periodLabel: string;
  kpi: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    overallRealMarginPercent: number;
    totalExpenses?: number;
    totalPurchases?: number;
    totalCreditPayments?: number;
    totalIngresos?: number;
    totalEgresos?: number;
    netCashProfit?: number;
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
    expenses?: any[];
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
  periodExpenses?: any[];
  periodCreditPayments?: any[];
  movements?: MovementItem[];
  frequencyBenchmarks: Benchmark[];
}

export function ReportsView() {
  const [period, setPeriod] = useState<PeriodType>("daily");
  const [selectedDate, setSelectedDate] = useState<string>(getColombiaDateString());
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  const [data, setData] = useState<AnalyticsPeriodResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de Movimientos
  const [movementFilter, setMovementFilter] = useState<"ALL" | "INGRESO" | "EGRESO">("ALL");
  const [movementSearch, setMovementSearch] = useState("");

  // Diálogos para auditoría de facturas
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoiceData | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Simulador de presupuesto de compra semanal
  const [simWeeklyBudget, setSimWeeklyBudget] = useState<number>(2500000);
  const [mobileFreqTab, setMobileFreqTab] = useState<number>(3); // 1, 2, 3, 4 compras/sem

  const fetchReports = async (p: string, customD?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = customD
        ? `/api/analytics?date=${customD}&_t=${Date.now()}`
        : `/api/analytics?period=${p}&_t=${Date.now()}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "No se pudieron obtener las finanzas.");
      }
    } catch (e) {
      console.error("Error al cargar finanzas:", e);
      setError("Error de conexión al cargar finanzas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCustomDate) {
      fetchReports("", selectedDate);
    } else {
      fetchReports(period);
    }
  }, [period, isCustomDate, selectedDate]);

  const handleSelectPeriodTab = (p: PeriodType) => {
    setIsCustomDate(false);
    setPeriod(p);
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setSelectedDate(newDate);
    setIsCustomDate(true);
  };

  const handleOpenInvoice = (sale: any) => {
    setSelectedInvoice(sale);
    setIsInvoiceOpen(true);
  };

  const periodTabs: Array<{ id: PeriodType; label: string; desc: string }> = [
    { id: "daily", label: "Diario", desc: "Hoy" },
    { id: "weekly", label: "Semanal", desc: "Esta semana (Lun-Dom)" },
    { id: "monthly", label: "Mensual", desc: "Mes actual completo" },
    { id: "all", label: "Todo", desc: "Histórico completo" },
  ];

  // Cálculos consolidados de Ingresos, Egresos y Ganancia
  const totalIngresos = useMemo(() => {
    if (!data) return 0;
    return (
      data.kpi.totalIngresos ??
      (data.kpi.totalRevenue + (data.kpi.totalCreditPayments || 0))
    );
  }, [data]);

  const totalEgresos = useMemo(() => {
    if (!data) return 0;
    return (
      data.kpi.totalEgresos ??
      ((data.kpi.totalExpenses || 0) + (data.purchasesKpi.totalSpent || 0))
    );
  }, [data]);

  const gananciaNeta = useMemo(() => {
    if (!data) return 0;
    return data.kpi.netCashProfit ?? (totalIngresos - totalEgresos);
  }, [data, totalIngresos, totalEgresos]);

  // Lista de Movimientos Unificada y Filtrada
  const allMovements = useMemo(() => {
    return data?.movements || [];
  }, [data]);

  const filteredMovements = useMemo(() => {
    let list = allMovements;
    if (movementFilter !== "ALL") {
      list = list.filter((m) => m.flow === movementFilter);
    }
    if (movementSearch.trim()) {
      const q = movementSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.subtitle.toLowerCase().includes(q) ||
          (m.paymentMethod && m.paymentMethod.toLowerCase().includes(q)) ||
          (m.category && m.category.toLowerCase().includes(q)) ||
          (m.referenceId && m.referenceId.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allMovements, movementFilter, movementSearch]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Selector de Período y Fecha Superior */}
      <Card className="shadow-xs border-slate-200">
        <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-700" />
              <h1 className="text-lg font-bold text-slate-900">
                Finanzas y Flujo de Caja
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Control consolidado de ingresos, egresos, rentabilidad y auditoría de movimientos diarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Selector de Fecha Específica */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <span className="text-[11px] font-medium text-slate-500">Día:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`text-xs px-2 py-1 rounded bg-white border cursor-pointer font-mono font-medium outline-none transition-all ${
                  isCustomDate
                    ? "border-emerald-500 text-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-400 font-bold"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              />
            </div>

            {/* Segmented Control de Período */}
            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              {periodTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleSelectPeriodTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    !isCustomDate && period === tab.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rango Activo y Zona Horaria */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Mostrando finanzas para:</span>
          <strong className="text-slate-900 font-medium">
            {isCustomDate ? `Día seleccionado (${selectedDate})` : data?.periodLabel || "Cargando período..."}
          </strong>
          {isCustomDate && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
              Filtro por Fecha
            </Badge>
          )}
        </div>

        <Badge variant="outline" className="text-[11px] font-mono border-slate-300 text-slate-700">
          Zona Horaria: Colombia (UTC-5)
        </Badge>
      </div>

      {/* Tarjetas KPI Principales: INGRESOS, EGRESOS, GANANCIA */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : !data ? (
        <Card className="border-red-200 bg-red-50/50 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-900">
            {error || "No se pudieron cargar los datos de finanzas"}
          </p>
          <Button
            onClick={() => (isCustomDate ? fetchReports("", selectedDate) : fetchReports(period))}
            className="mt-3 text-xs bg-slate-900 text-white cursor-pointer"
          >
            Reintentar
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. INGRESOS */}
            <Card className="shadow-xs border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    Ingresos
                  </span>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                    Entradas
                  </Badge>
                </CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">
                  +{formatCurrency(totalIngresos)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Ventas cobradas:</span>
                  <strong className="font-mono text-slate-800">
                    {formatCurrency(data.kpi.totalRevenue)} ({data.kpi.salesCount} tickets)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Abonos a crédito:</span>
                  <strong className="font-mono text-emerald-700">
                    +{formatCurrency(data.kpi.totalCreditPayments || 0)}
                  </strong>
                </div>
              </CardContent>
            </Card>

            {/* 2. EGRESOS */}
            <Card className="shadow-xs border-rose-200/80 bg-gradient-to-br from-white to-rose-50/30">
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    Egresos
                  </span>
                  <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                    Salidas
                  </Badge>
                </CardDescription>
                <CardTitle className="text-2xl sm:text-3xl font-black text-rose-700 font-mono tracking-tight">
                  -{formatCurrency(totalEgresos)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Gastos operativos:</span>
                  <strong className="font-mono text-slate-800">
                    -{formatCurrency(data.kpi.totalExpenses || 0)} ({data.expensesKpi?.count || 0} reg)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Compras de lotes:</span>
                  <strong className="font-mono text-rose-700">
                    -{formatCurrency(data.purchasesKpi.totalSpent || 0)} ({data.purchasesKpi.batchesCount} lotes)
                  </strong>
                </div>
              </CardContent>
            </Card>

            {/* 3. GANANCIA NETA */}
            <Card
              className={`shadow-xs border-2 ${
                gananciaNeta >= 0
                  ? "border-emerald-500/80 bg-gradient-to-br from-emerald-50/40 to-white"
                  : "border-rose-500/80 bg-gradient-to-br from-rose-50/40 to-white"
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription
                  className={`text-xs font-black uppercase tracking-wider flex items-center justify-between ${
                    gananciaNeta >= 0 ? "text-emerald-900" : "text-rose-900"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {gananciaNeta >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    )}
                    Ganancia Neta
                  </span>
                  <Badge
                    variant={gananciaNeta >= 0 ? "success" : "destructive"}
                    className="text-[10px] font-bold"
                  >
                    {gananciaNeta >= 0 ? "Superávit" : "Déficit"}
                  </Badge>
                </CardDescription>
                <CardTitle
                  className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                    gananciaNeta >= 0 ? "text-emerald-800" : "text-rose-800"
                  }`}
                >
                  {gananciaNeta >= 0
                    ? `+${formatCurrency(gananciaNeta)}`
                    : `-${formatCurrency(Math.abs(gananciaNeta))}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Fórmula:</span>
                  <span className="font-medium text-slate-700">Ingresos - Egresos</span>
                </div>
                <div className="flex justify-between">
                  <span>Margen s/ Ingresos:</span>
                  <strong className="font-bold text-slate-800">
                    {totalIngresos > 0
                      ? `${Math.round((gananciaNeta / totalIngresos) * 100)}%`
                      : "N/A"}
                  </strong>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra Informativa Secundaria (Mermas & Margen Mercancía) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center justify-between px-2">
              <span className="text-slate-500">Margen Real Mercancía:</span>
              <Badge
                variant={data.kpi.overallRealMarginPercent >= 30 ? "success" : "destructive"}
                className="text-[11px] font-mono font-bold"
              >
                {data.kpi.overallRealMarginPercent}% Real
              </Badge>
            </div>
            <div className="flex items-center justify-between px-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0">
              <span className="text-slate-500">Mermas / Descartes:</span>
              <strong className="font-mono text-rose-600">
                -{formatCurrency(data.waste.totalWasteCost)} ({formatWeight(data.waste.totalWasteKg)})
              </strong>
            </div>
            <div className="flex items-center justify-between px-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0">
              <span className="text-slate-500">Peso Total Despachado:</span>
              <strong className="font-mono text-slate-800">
                {formatWeight(data.kpi.totalQuantityKg)}
              </strong>
            </div>
          </div>

          {/* SECCIÓN PRINCIPAL: MOVIMIENTOS Y LIBRO DIARIO DE CAJA */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <WalletCards className="w-5 h-5 text-slate-700" />
                    Movimientos del {isCustomDate ? "Día Seleccionado" : "Período"}
                    <Badge variant="outline" className="ml-1 text-xs font-mono font-medium">
                      {filteredMovements.length} registro{filteredMovements.length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {isCustomDate ? `Auditoría detallada del ${selectedDate}` : data?.periodLabel || ""} • Historial cronológico de ventas, abonos, gastos y compras.
                  </CardDescription>
                </div>

                {/* Filtros de Flujo y Buscador */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setMovementFilter("ALL")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        movementFilter === "ALL"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Todos ({allMovements.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementFilter("INGRESO")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        movementFilter === "INGRESO"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-emerald-700 hover:text-emerald-900"
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Ingresos ({allMovements.filter((m) => m.flow === "INGRESO").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovementFilter("EGRESO")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        movementFilter === "EGRESO"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "text-rose-700 hover:text-rose-900"
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Egresos ({allMovements.filter((m) => m.flow === "EGRESO").length})
                    </button>
                  </div>

                  {/* Buscador de Movimientos */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Buscar ticket, cliente, gasto..."
                      value={movementSearch}
                      onChange={(e) => setMovementSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-white"
                    />
                    {movementSearch && (
                      <button
                        onClick={() => setMovementSearch("")}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0">
              {filteredMovements.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <WalletCards className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    No hay movimientos registrados {movementSearch ? "para esta búsqueda" : `en este ${isCustomDate ? "día" : "período"}`}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Las ventas cobradas, abonos a crédito, gastos operativos y compras de lotes aparecerán automáticamente aquí.
                  </p>
                </div>
              ) : (
                <>
                  {/* Tarjetas Móviles de Movimientos (< md) */}
                  <div className="md:hidden space-y-2.5">
                    {filteredMovements.map((m) => {
                      const isIncome = m.flow === "INGRESO";
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border bg-white shadow-xs space-y-2 ${
                            isIncome
                              ? "border-emerald-100 hover:border-emerald-300"
                              : "border-rose-100 hover:border-rose-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isIncome ? (
                                <span className="p-1 rounded bg-emerald-100 text-emerald-700">
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="p-1 rounded bg-rose-100 text-rose-700">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <Badge
                                variant={
                                  m.type === "VENTA"
                                    ? "default"
                                    : m.type === "ABONO_CREDITO"
                                    ? "success"
                                    : m.type === "GASTO"
                                    ? "destructive"
                                    : "outline"
                                }
                                className="text-[10px] font-bold"
                              >
                                {m.type === "VENTA" && "Venta"}
                                {m.type === "ABONO_CREDITO" && "Abono Fiado"}
                                {m.type === "GASTO" && "Gasto Operativo"}
                                {m.type === "COMPRA" && "Compra Lote"}
                              </Badge>
                              {m.paymentMethod && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                                  {m.paymentMethod}
                                </span>
                              )}
                            </div>

                            <span
                              className={`font-mono font-black text-sm ${
                                isIncome ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {isIncome ? `+${formatCurrency(m.amount)}` : `-${formatCurrency(m.amount)}`}
                            </span>
                          </div>

                          <div className="text-xs">
                            <div className="font-bold text-slate-900">{m.title}</div>
                            <div className="text-slate-500 text-[11px] truncate">{m.subtitle}</div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
                            <span className="font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {m.timeStr}
                              {isCustomDate ? "" : ` • ${new Date(m.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`}
                            </span>

                            {m.type === "VENTA" && m.raw && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenInvoice(m.raw)}
                                className="h-6 text-[10px] px-2 gap-1 border-slate-200 hover:bg-slate-50 cursor-pointer"
                              >
                                <Printer className="w-3 h-3 text-slate-500" />
                                Factura
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tabla Desktop de Movimientos (>= md) */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Hora / Fecha</th>
                          <th className="py-2.5 px-3">Flujo / Tipo</th>
                          <th className="py-2.5 px-3">Concepto y Detalle</th>
                          <th className="py-2.5 px-3">Medio de Pago / Categoría</th>
                          <th className="py-2.5 px-3 text-right">Monto</th>
                          <th className="py-2.5 px-3 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMovements.map((m) => {
                          const isIncome = m.flow === "INGRESO";
                          return (
                            <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 text-slate-600 font-mono whitespace-nowrap">
                                <div className="font-bold text-slate-900">{m.timeStr}</div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(m.date).toLocaleDateString("es-CO", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {isIncome ? (
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  )}
                                  <Badge
                                    variant={
                                      m.type === "VENTA"
                                        ? "default"
                                        : m.type === "ABONO_CREDITO"
                                        ? "success"
                                        : m.type === "GASTO"
                                        ? "destructive"
                                        : "outline"
                                    }
                                    className="text-[10px] font-bold"
                                  >
                                    {m.type === "VENTA" && "Venta"}
                                    {m.type === "ABONO_CREDITO" && "Abono Fiado"}
                                    {m.type === "GASTO" && "Gasto Operativo"}
                                    {m.type === "COMPRA" && "Compra Lote"}
                                  </Badge>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{m.title}</div>
                                <div className="text-slate-500 text-[11px] truncate max-w-md">
                                  {m.subtitle}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                                  {m.paymentMethod || m.category || "General"}
                                </span>
                                {m.category && m.category !== m.paymentMethod && (
                                  <span className="ml-1 text-[10px] text-slate-400">
                                    ({m.category})
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                <span className={isIncome ? "text-emerald-700" : "text-rose-700"}>
                                  {isIncome ? `+${formatCurrency(m.amount)}` : `-${formatCurrency(m.amount)}`}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {m.type === "VENTA" && m.raw ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenInvoice(m.raw)}
                                    className="h-7 text-[11px] gap-1 px-2.5 cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3 text-slate-500" />
                                    Ver Factura
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
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

        <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Selector de Frecuencia Móvil (< md) */}
          <div className="md:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMobileFreqTab(1)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mobileFreqTab === 1
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              1/Sem
            </button>
            <button
              type="button"
              onClick={() => setMobileFreqTab(2)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mobileFreqTab === 2
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              2/Sem
            </button>
            <button
              type="button"
              onClick={() => setMobileFreqTab(3)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                mobileFreqTab === 3
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              <span>3/Sem</span>
              <span className="text-[10px] text-emerald-600 font-black">★</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileFreqTab(4)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mobileFreqTab === 4
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              4+/Sem
            </button>
          </div>

          {/* Tarjeta Única Seleccionada en Móvil (< md) */}
          <div className="md:hidden">
            {mobileFreqTab === 1 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-bold border-slate-300 text-slate-800">
                    1 Compra / Semana
                  </Badge>
                  <span className="text-xs font-mono text-rose-600 font-semibold">Merma ~8.5%</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Compra Semanal Masiva</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Adquieres todo el lunes. Gran parte del producto pasa 5 a 7 días en cámara fría o mostrador.
                </p>
                <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-100 text-xs space-y-1.5">
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
                <p className="text-[11px] text-slate-500 italic pt-1">
                  ⚠ Alta merma por deshidratación en carne y deterioro acelerado en verduras de hoja.
                </p>
              </div>
            )}

            {mobileFreqTab === 2 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-bold border-blue-200 bg-blue-50 text-blue-800">
                    2 Compras / Semana
                  </Badge>
                  <span className="text-xs font-mono text-amber-700 font-semibold">Merma ~4.5%</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Reposición Lunes y Jueves</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Divides el pedido en 2 bloques. Mercadería fresca antes del pico de ventas de fin de semana.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
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
                <p className="text-[11px] text-slate-500 pt-1">
                  ✓ Buen equilibrio entre tiempo operativo de pedidos y reducción del 50% de la merma.
                </p>
              </div>
            )}

            {mobileFreqTab === 3 && (
              <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/20 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs font-bold border-emerald-300 bg-emerald-100 text-emerald-900">
                      3 Compras / Semana
                    </Badge>
                    <Badge variant="success" className="text-[10px] uppercase font-bold">
                      ★ Recomendado
                    </Badge>
                  </div>
                  <span className="text-xs font-mono text-emerald-700 font-semibold">Merma ~2.5%</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Lunes, Miércoles, Viernes</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Rotación rápida de 48h. El producto llega fresco, se vende rápido y el capital no queda congelado.
                </p>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs space-y-1.5 shadow-2xs">
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
                <p className="text-[11px] text-emerald-800 font-medium pt-1">
                  ★ Punto dorado: maximiza el margen real al 30-34% al suprimir el descarte por maduración.
                </p>
              </div>
            )}

            {mobileFreqTab === 4 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-bold border-purple-200 bg-purple-50 text-purple-800">
                    4+ Compras / Semana
                  </Badge>
                  <span className="text-xs font-mono text-purple-700 font-semibold">Merma ~1.5%</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Just-in-Time / Diaria</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Solo pides lo que vendes al día siguiente. Merma mínima, máxima frescura en mostrador.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
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
                <p className="text-[11px] text-slate-500 pt-1">
                  ✓ Excelente si el proveedor no cobra recargo por flete frecuente y el volumen lo amerita.
                </p>
              </div>
            )}
          </div>

          {/* Vista Desktop: 4 Columnas Lado a Lado (>= md) */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* SECCIÓN: REGISTRO DE COMPRAS Y LOTES ADQUIRIDOS */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4.5 h-4.5 text-slate-700" />
                Registro de Compras y Lotes Adquiridos
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {data?.periodLabel} • Avance y recuperación de capital.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          {(data?.periodBatches || []).length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                No hay compras o pedidos registrados en {data?.periodLabel || "este período"}.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Utiliza el "Simulador de Desposte" para cargar nuevos lotes de compra.
              </p>
            </div>
          ) : (
            <>
              {/* Tarjetas Móviles de Lotes (< md) */}
              <div className="md:hidden space-y-2.5">
                {data?.periodBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {batch.batchNumber}
                      </span>
                      <Badge
                        variant={batch.projectedRealMargin >= 30 ? "success" : "destructive"}
                        className="text-[10px] font-bold"
                      >
                        {batch.projectedRealMargin}% Margen
                      </Badge>
                    </div>

                    <div className="flex justify-between items-baseline text-xs text-slate-600">
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {batch.supplier}
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {new Date(batch.date).toLocaleDateString("es-CO")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg text-center text-xs border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Peso
                        </span>
                        <strong className="text-slate-800 font-mono">
                          {formatWeight(batch.totalWeightKg || 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Inversión
                        </span>
                        <strong className="text-slate-900 font-mono">
                          {formatCurrency(batch.totalCost)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Venta Proy.
                        </span>
                        <strong className="text-emerald-700 font-mono">
                          +{formatCurrency(batch.projectedRevenue)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla Desktop de Lotes (>= md) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Factura / Ticket POS */}
      <InvoiceDialog
        sale={selectedInvoice}
        open={isInvoiceOpen}
        onOpenChange={setIsInvoiceOpen}
        allowProfitAudit={true}
      />
    </div>
  );
}
