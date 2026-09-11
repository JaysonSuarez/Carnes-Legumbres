"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Building2,
  Zap,
  Users,
  Package,
  Wrench,
  Truck,
  DollarSign,
  Calendar,
  CreditCard,
  Trash2,
  Edit2,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface Expense {
  id: string;
  tenantId: string;
  category: "ARRIENDO" | "SERVICIOS" | "NOMINA" | "INSUMOS" | "MANTENIMIENTO" | "TRANSPORTE" | "OTRO";
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  recipient?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
  registeredBy?: string;
  createdAt: string;
}

export const EXPENSE_CATEGORIES = [
  {
    id: "ARRIENDO",
    label: "Arriendo / Local",
    icon: Building2,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    description: "Alquiler del punto de venta, bodega o espacios",
  },
  {
    id: "SERVICIOS",
    label: "Servicios Públicos",
    icon: Zap,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    description: "Energía eléctrica, refrigeración, agua, gas, internet",
  },
  {
    id: "NOMINA",
    label: "Nómina & Pagos de Personal",
    icon: Users,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    description: "Sueldos, jornales a carniceros, turnos, adelantos",
  },
  {
    id: "INSUMOS",
    label: "Insumos & Empaques",
    icon: Package,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    badge: "bg-purple-100 text-purple-800",
    description: "Bolsas de 50kg, vinipel, bandejas, químicos y aseo",
  },
  {
    id: "MANTENIMIENTO",
    label: "Mantenimiento & Reparación",
    icon: Wrench,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    badge: "bg-orange-100 text-orange-800",
    description: "Arreglo de cavas, sierras, molinos, cuchillos, balanzas",
  },
  {
    id: "TRANSPORTE",
    label: "Transporte / Fletes",
    icon: Truck,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    badge: "bg-cyan-100 text-cyan-800",
    description: "Acarreos, combustible, fletes de mercancía o domicilios",
  },
  {
    id: "OTRO",
    label: "Otros Gastos",
    icon: DollarSign,
    color: "bg-slate-50 text-slate-700 border-slate-200",
    badge: "bg-slate-100 text-slate-800",
    description: "Gastos menores imprevistos o administrativos",
  },
] as const;

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "biweekly" | "monthly" | "all">("monthly");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del formulario
  const [formCategory, setFormCategory] = useState<string>("INSUMOS");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formPaymentMethod, setFormPaymentMethod] = useState("EFECTIVO");
  const [formRecipient, setFormRecipient] = useState("");
  const [formReceiptNumber, setFormReceiptNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Modal de Confirmación para Eliminar
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (period !== "all") query.set("period", period);
      if (selectedCategory !== "ALL") query.set("category", selectedCategory);

      const res = await fetch(`/api/expenses?${query.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setExpenses(data.data);
      }
    } catch (e) {
      console.error("Error al obtener gastos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [period, selectedCategory]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormCategory("INSUMOS");
    setFormDescription("");
    setFormAmount("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormPaymentMethod("EFECTIVO");
    setFormRecipient("");
    setFormReceiptNumber("");
    setFormNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormCategory(exp.category);
    setFormDescription(exp.description);
    setFormAmount(exp.amount.toString());
    setFormDate(exp.expenseDate.slice(0, 10));
    setFormPaymentMethod(exp.paymentMethod || "EFECTIVO");
    setFormRecipient(exp.recipient || "");
    setFormReceiptNumber(exp.receiptNumber || "");
    setFormNotes(exp.notes || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDescription.trim()) {
      setFormError("Por favor ingresa la descripción del gasto.");
      return;
    }

    const numAmount = parseFloat(formAmount.replace(/[^0-9.]/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Ingresa un monto válido mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category: formCategory,
        description: formDescription.trim(),
        amount: numAmount,
        expenseDate: new Date(formDate).toISOString(),
        paymentMethod: formPaymentMethod,
        recipient: formRecipient.trim() || null,
        receiptNumber: formReceiptNumber.trim() || null,
        notes: formNotes.trim() || null,
      };

      const url = "/api/expenses";
      const method = editingExpense ? "PUT" : "POST";
      const body = editingExpense ? { id: editingExpense.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resData = await res.json();
      if (!resData.success) {
        setFormError(resData.error || "No se pudo guardar el gasto.");
        return;
      }

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      setFormError("Error de conexión al guardar el gasto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses?id=${expenseToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setExpenseToDelete(null);
        fetchExpenses();
      }
    } catch (e) {
      console.error("Error al eliminar gasto:", e);
    } finally {
      setDeleting(false);
    }
  };

  // Filtrar localmente por búsqueda
  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(term) ||
        (e.recipient && e.recipient.toLowerCase().includes(term)) ||
        (e.receiptNumber && e.receiptNumber.toLowerCase().includes(term)) ||
        (e.notes && e.notes.toLowerCase().includes(term))
    );
  }, [expenses, searchTerm]);

  // Cálculos de Resumen
  const totalAmount = useMemo(
    () => filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    [filteredExpenses]
  );

  const fixedCostsTotal = useMemo(
    () =>
      filteredExpenses
        .filter((e) => ["ARRIENDO", "SERVICIOS", "NOMINA"].includes(e.category))
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    [filteredExpenses]
  );

  const variableCostsTotal = useMemo(
    () =>
      filteredExpenses
        .filter((e) => ["INSUMOS", "MANTENIMIENTO", "TRANSPORTE", "OTRO"].includes(e.category))
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    [filteredExpenses]
  );

  const categoryMetaMap = useMemo(() => {
    const map = new Map<string, (typeof EXPENSE_CATEGORIES)[number]>();
    EXPENSE_CATEGORIES.forEach((c) => map.set(c.id, c));
    return map;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Control de Gastos Operativos
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registra arriendos, servicios, nóminas, bolsas e insumos para deducirlos y conocer la <strong>verdadera ganancia en tu bolsillo</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={openCreateModal}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm cursor-pointer text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Selector de Período */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">
            Período:
          </span>
          {[
            { id: "daily", label: "Hoy" },
            { id: "weekly", label: "Esta Semana" },
            { id: "biweekly", label: "Esta Quincena" },
            { id: "monthly", label: "Este Mes" },
            { id: "all", label: "Histórico Total" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                period === p.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Buscador Rápido */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar gasto o persona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gastos */}
        <Card className="border-rose-200 bg-rose-50/40 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Gasto Total del Período
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-rose-950 mt-1">
              {formatCurrency(totalAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-rose-700 font-medium">
              {filteredExpenses.length} desembolsos registrados
            </p>
          </CardContent>
        </Card>

        {/* Gastos Fijos (Arriendo, Servicios, Nómina) */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Costos Fijos Operativos
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(fixedCostsTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-slate-500">
              Arriendo + Servicios + Nóminas
            </p>
          </CardContent>
        </Card>

        {/* Insumos y Variables */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Insumos, Aseo y Fletes
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(variableCostsTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-slate-500">
              Bolsas, vinipel, aseo y transporte
            </p>
          </CardContent>
        </Card>

        {/* Promedio por Registro */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Promedio por Desembolso
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {filteredExpenses.length > 0
                ? formatCurrency(Math.round(totalAmount / filteredExpenses.length))
                : "$0"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-slate-500">
              Control de salida de dinero
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro por Categorías Rápidas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Todas ({expenses.length})
        </button>
        {EXPENSE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = expenses.filter((e) => e.category === cat.id).length;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? "bg-white text-rose-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tabla de Gastos */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-bold">Fecha</th>
                <th className="py-3 px-4 font-bold">Categoría</th>
                <th className="py-3 px-4 font-bold">Descripción</th>
                <th className="py-3 px-4 font-bold">Beneficiario / Destino</th>
                <th className="py-3 px-4 font-bold">Método</th>
                <th className="py-3 px-4 font-bold text-right">Monto ($)</th>
                <th className="py-3 px-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Cargando gastos operativos...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">
                        No hay gastos registrados en este período
                      </p>
                      <p className="text-xs text-slate-400">
                        Comienza a ingresar tus costos de arriendo, servicios, pagos de nómina o insumos para calcular la utilidad neta real.
                      </p>
                      <Button
                        size="sm"
                        onClick={openCreateModal}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Registrar Primer Gasto
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const meta = categoryMetaMap.get(exp.category) || EXPENSE_CATEGORIES[6];
                  const Icon = meta.icon;
                  const dateStr = new Date(exp.expenseDate).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${meta.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {exp.description}
                        </span>
                        {exp.notes && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                            {exp.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {exp.recipient ? (
                          <span className="font-semibold">{exp.recipient}</span>
                        ) : (
                          <span className="text-slate-400 italic">No especificado</span>
                        )}
                        {exp.receiptNumber && (
                          <span className="block text-[10px] text-slate-400">
                            Recibo: #{exp.receiptNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-slate-600 border-slate-200"
                        >
                          {exp.paymentMethod || "EFECTIVO"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <strong className="text-sm font-black text-rose-700">
                          {formatCurrency(exp.amount)}
                        </strong>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(exp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Editar gasto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Crear / Editar Gasto */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              {editingExpense ? "Editar Gasto Operativo" : "Registrar Nuevo Gasto"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Selector de Categoría */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Categoría del Gasto *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formCategory === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setFormCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-rose-600 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isSelected ? "text-rose-700 font-bold" : "text-slate-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <span
                          className={`text-xs block font-bold truncate ${
                            isSelected ? "text-rose-950" : "text-slate-800"
                          }`}
                        >
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block line-clamp-1">
                          {cat.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monto ($) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monto Pagado ($ COP) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="Ej: 85000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              {formAmount && !isNaN(Number(formAmount)) && (
                <p className="text-[11px] text-emerald-700 font-bold mt-1">
                  Equivale a: {formatCurrency(Number(formAmount))}
                </p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción del Gasto *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Paca de bolsas de 50kg (40 unid) y rollo de vinipel"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Beneficiario / A quién se pagó */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Beneficiario / Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Distribuidora Plásticos / Don Ramón"
                  value={formRecipient}
                  onChange={(e) => setFormRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha del Desembolso *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="EFECTIVO">Efectivo de Caja</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="OTRO">Otro Medio</option>
                </select>
              </div>

              {/* Nro. Recibo / Factura */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  N° Recibo / Soporte (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: REC-10492"
                  value={formReceiptNumber}
                  onChange={(e) => setFormReceiptNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Notas Adicionales */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notas o Detalles Internos (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Pagado con dinero de la venta de la mañana"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
              >
                {submitting ? "Guardando..." : editingExpense ? "Guardar Cambios" : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog
        open={Boolean(expenseToDelete)}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              ¿Eliminar este gasto?
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-slate-600 space-y-2 py-2">
            <p>
              Estás a punto de eliminar el siguiente gasto registrado:
            </p>
            {expenseToDelete && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block">
                  {expenseToDelete.description}
                </span>
                <span className="text-rose-700 font-black text-sm block mt-0.5">
                  {formatCurrency(expenseToDelete.amount)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Categoría: {expenseToDelete.category} • {expenseToDelete.expenseDate.slice(0, 10)}
                </span>
              </div>
            )}
            <p className="text-rose-600 font-semibold">
              Esta acción revertirá la deducción del gasto en los reportes de ganancia neta.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpenseToDelete(null)}
              className="text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteExpense}
              className="text-xs font-bold cursor-pointer bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? "Eliminando..." : "Sí, Eliminar Gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
