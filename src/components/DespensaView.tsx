"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  calculateDespensaPrice,
  calculateRealMargin,
  formatCurrency,
  formatWeight,
} from "@/lib/finance";
import {
  Boxes,
  Scale,
  Package,
  Carrot,
  LeafyGreen,
  Banana,
  Sprout,
  Beef,
  Drumstick,
  Ham,
  Fish,
  Sparkles,
  Plus,
  Minus,
  Search,
  Save,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Trash2,
  RefreshCw,
  Printer,
  RotateCcw,
  Check,
  Store,
  Layers,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { Skeleton } from "@/components/ui/skeleton";

interface Category {
  id: string;
  name: string;
  slug: string;
  type: string;
}

interface Product {
  id: string;
  code: string | null;
  name: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  unit: string; // "kg" | "unidad"
  costPrice: number;
  sellPrice: number;
  currentStock: number;
  minStock: number;
  estimatedWastePercent: number;
  targetMarginPercent: number;
  realMargin?: number;
  isBelowTarget?: boolean;
}

export function DespensaView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Formulario de Registro Rápido
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formUnitType, setFormUnitType] = useState<"unidad" | "kg">("unidad");
  const [formStock, setFormStock] = useState<number>(0);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSellPrice, setFormSellPrice] = useState<number>(0);
  const [formMatchedProduct, setFormMatchedProduct] = useState<Product | null>(null);
  const [isSellPriceCustom, setIsSellPriceCustom] = useState(false);

  // Edición rápida en tabla
  const [tableEdits, setTableEdits] = useState<{
    [id: string]: { stock: number; cost: number; sellPrice: number; changed: boolean };
  }>({});

  // Cargar catálogo de productos y categorías
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resCat] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);
      const dataProd = await resProd.json();
      const dataCat = await resCat.json();

      if (dataProd.success) setProducts(dataProd.data);
      if (dataCat.success) {
        setCategories(dataCat.data);
        // Pre-seleccionar por defecto "Abarrotes y Despensa"
        const defaultCat = dataCat.data.find(
          (c: Category) =>
            c.slug.includes("abarrotes") || c.name.toLowerCase().includes("despensa")
        ) || dataCat.data[0];
        if (defaultCat && !formCategoryId) {
          setFormCategoryId(defaultCat.id);
        }
      }
    } catch (e) {
      console.error(e);
      showNotice("Error al cargar los datos del inventario", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [demoActionLoading, setDemoActionLoading] = useState(false);

  const showNotice = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStockDemoAction = async (action: "fill" | "empty") => {
    setDemoActionLoading(true);
    try {
      const res = await fetch("/api/inventory/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(
          action === "fill"
            ? "Stock demo cargado con éxito en todo el sistema."
            : "Inventario vaciado a 0 con éxito.",
          "success"
        );
        fetchData();
      } else {
        showNotice(data.error || "Error al actualizar stock", "error");
      }
    } catch (e) {
      console.error(e);
      showNotice("Error de conexión al modificar inventario demo", "error");
    } finally {
      setDemoActionLoading(false);
    }
  };

  // Cálculo automático del precio de venta (Costo / 0.7 redondeado al $100 superior)
  const handleCostChange = (newCost: number) => {
    setFormCostPrice(newCost);
    if (!isSellPriceCustom || formSellPrice === 0) {
      const autoPrice = calculateDespensaPrice(newCost, 0.3);
      setFormSellPrice(autoPrice);
    }
  };

  // Autocompletado inteligente al escribir el nombre del producto
  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!name.trim()) {
      setFormMatchedProduct(null);
      return;
    }
    const cleanQuery = name.trim().toLowerCase();
    const match = products.find((p) => p.name.toLowerCase() === cleanQuery);
    if (match) {
      setFormMatchedProduct(match);
      setFormCategoryId(match.categoryId);
      setFormUnitType(match.unit === "kg" ? "kg" : "unidad");
      setFormCostPrice(match.costPrice);
      setFormSellPrice(match.sellPrice);
      setFormStock(match.currentStock);
      setIsSellPriceCustom(true);
    } else {
      setFormMatchedProduct(null);
    }
  };

  const selectExistingProduct = (p: Product) => {
    setFormMatchedProduct(p);
    setFormName(p.name);
    setFormCategoryId(p.categoryId);
    setFormUnitType(p.unit === "kg" ? "kg" : "unidad");
    setFormCostPrice(p.costPrice);
    setFormSellPrice(p.sellPrice);
    setFormStock(p.currentStock);
    setIsSellPriceCustom(true);
  };

  // Guardar producto nuevo o actualizar existente
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showNotice("Por favor ingresa el nombre del producto", "error");
      return;
    }
    if (!formCategoryId) {
      showNotice("Por favor selecciona una categoría", "error");
      return;
    }

    setSaving(true);
    try {
      const autoCalculated = calculateDespensaPrice(formCostPrice, 0.3);
      const finalSellPrice = formSellPrice > 0 ? formSellPrice : autoCalculated;

      if (formMatchedProduct) {
        // Actualizar producto existente
        const res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: formMatchedProduct.id,
            name: formName.trim(),
            categoryId: formCategoryId,
            unit: formUnitType,
            costPrice: formCostPrice,
            sellPrice: finalSellPrice,
            currentStock: formStock,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showNotice(`"${formName}" actualizado correctamente en inventario`, "success");
          resetForm();
          fetchData();
        } else {
          showNotice(data.error || "Error al actualizar", "error");
        }
      } else {
        // Crear producto nuevo
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            categoryId: formCategoryId,
            unit: formUnitType,
            costPrice: formCostPrice,
            sellPrice: finalSellPrice,
            currentStock: formStock,
            minStock: formUnitType === "kg" ? 5 : 3,
            estimatedWastePercent: formUnitType === "kg" ? 5 : 0,
            targetMarginPercent: 30,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showNotice(`"${formName}" registrado exitosamente con margen 30%`, "success");
          resetForm();
          fetchData();
        } else {
          showNotice(data.error || "Error al crear producto", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showNotice("Error de conexión al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormMatchedProduct(null);
    setFormStock(0);
    setFormCostPrice(0);
    setFormSellPrice(0);
    setIsSellPriceCustom(false);
  };

  // Helper para recalcular a 30% en el formulario
  const handleRecalculateFormPrice = () => {
    const auto = calculateDespensaPrice(formCostPrice, 0.3);
    setFormSellPrice(auto);
    setIsSellPriceCustom(false);
  };

  // Edición directa en tabla
  const handleTableFieldChange = (
    id: string,
    field: "stock" | "cost" | "sellPrice",
    value: number
  ) => {
    const current = tableEdits[id] || {
      stock: products.find((p) => p.id === id)?.currentStock || 0,
      cost: products.find((p) => p.id === id)?.costPrice || 0,
      sellPrice: products.find((p) => p.id === id)?.sellPrice || 0,
      changed: false,
    };

    const updated = {
      ...current,
      [field]: value,
      changed: true,
    };

    // Si cambió el costo y se desea recalcular automáticamente el precio:
    if (field === "cost") {
      updated.sellPrice = calculateDespensaPrice(value, 0.3);
    }

    setTableEdits((prev) => ({ ...prev, [id]: updated }));
  };

  const handleSaveTableRow = async (product: Product) => {
    const edit = tableEdits[product.id];
    if (!edit) return;

    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          currentStock: edit.stock,
          costPrice: edit.cost,
          sellPrice: edit.sellPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(`Actualizado: ${product.name}`, "success");
        setTableEdits((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
      showNotice("Error al guardar fila", "error");
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Estás seguro de eliminar "${product.name}" del catálogo?`)) return;
    try {
      const res = await fetch(`/api/products?id=${product.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showNotice(`Producto "${product.name}" eliminado`, "success");
        fetchData();
      } else {
        showNotice(data.error || "No se pudo eliminar", "error");
      }
    } catch (e) {
      console.error(e);
      showNotice("Error al eliminar", "error");
    }
  };

  // Helper de icono por categoría
  const getCategoryIcon = (slug?: string) => {
    if (!slug) return <Boxes className="w-4 h-4 text-indigo-600" />;
    const s = slug.toLowerCase();
    if (s.includes("legumbre") || s.includes("verdura"))
      return <LeafyGreen className="w-4 h-4 text-emerald-600" />;
    if (s.includes("pescado") || s.includes("marisco"))
      return <Fish className="w-4 h-4 text-cyan-600" />;
    if (s.includes("carne-res") || s.includes("carnes-res") || s.includes("bovino") || s === "res" || (s.includes("carne") && !s.includes("cerdo") && !s.includes("pollo") && !s.includes("legumbre")))
      return <Beef className="w-4 h-4 text-rose-600" />;
    if (s.includes("pollo") || s.includes("ave"))
      return <Drumstick className="w-4 h-4 text-amber-600" />;
    if (s.includes("cerdo"))
      return <Ham className="w-4 h-4 text-pink-600" />;
    return <Boxes className="w-4 h-4 text-indigo-600" />;
  };

  // Helper de icono específico por producto (Papa, Plátano, Tomate, etc.)
  const getProductOrCategoryIcon = (name?: string, slug?: string) => {
    const norm = (name || "").toLowerCase();
    if (
      norm.includes("platano") ||
      norm.includes("plátano") ||
      norm.includes("banan") ||
      norm.includes("harton") ||
      norm.includes("hartón")
    ) {
      return <Banana className="w-4 h-4 text-amber-500" />;
    }
    if (
      norm.includes("papa") ||
      norm.includes("patata") ||
      norm.includes("yuca") ||
      norm.includes("pastusa") ||
      norm.includes("criolla")
    ) {
      return <Sprout className="w-4 h-4 text-lime-600" />;
    }
    if (
      norm.includes("tomate") ||
      norm.includes("cebolla") ||
      norm.includes("aguacate") ||
      norm.includes("zanahoria") ||
      norm.includes("lechuga")
    ) {
      return <LeafyGreen className="w-4 h-4 text-emerald-600" />;
    }
    return getCategoryIcon(slug);
  };

  // Filtrado de productos en tabla
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategoryFilter === "ALL" || p.categoryId === selectedCategoryFilter;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryFilter, searchTerm]);

  // Cálculos de resumen
  const totals = useMemo(() => {
    let totalItems = products.length;
    let totalStockKg = 0;
    let totalStockUnits = 0;
    let totalCostVal = 0;
    let totalSellVal = 0;

    for (const p of products) {
      if (p.unit === "kg") totalStockKg += p.currentStock;
      else totalStockUnits += p.currentStock;

      totalCostVal += p.currentStock * p.costPrice;
      totalSellVal += p.currentStock * p.sellPrice;
    }

    const overallMargin =
      totalSellVal > 0 ? ((totalSellVal - totalCostVal) / totalSellVal) * 100 : 0;

    return {
      totalItems,
      totalStockKg,
      totalStockUnits,
      totalCostVal,
      totalSellVal,
      overallMargin: Number(overallMargin.toFixed(1)),
    };
  }, [products]);

  // Cálculo en vivo para el formulario
  const formCalculatedMargin = useMemo(() => {
    return calculateRealMargin(formCostPrice, formSellPrice);
  }, [formCostPrice, formSellPrice]);

  const formRawDivided = formCostPrice > 0 ? Math.round(formCostPrice / 0.7) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notificación */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : "bg-rose-50 text-rose-900 border-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Despensa & Conteo de Inventario
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Ingreso ágil de abarrotes, legumbres y carnes. Precio automático al dividir entre 0.7 redondeado a $100.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="px-2.5 py-1 text-xs font-semibold hidden sm:inline-flex">
            Margen Objetivo: ≥ 30% (Costo / 0.7)
          </Badge>

          {(totals.totalStockKg + totals.totalStockUnits) > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={demoActionLoading}
              onClick={() => handleStockDemoAction("empty")}
              className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 print:hidden"
              title="Establecer todas las existencias físicas en 0"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>{demoActionLoading ? "Vaciando..." : "Vaciar a 0"}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={demoActionLoading}
              onClick={() => handleStockDemoAction("fill")}
              className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 print:hidden"
              title="Cargar existencias de demostración para pruebas"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>{demoActionLoading ? "Cargando..." : "Llenar Stock Demo"}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs flex items-center gap-1.5 print:hidden"
            title="Imprimir hoja de conteo"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Hoja</span>
          </Button>
        </div>
      </div>

      {/* 4 Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        <Card className="p-4 shadow-xs border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Referencias en Inventario
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-xl sm:text-2xl font-bold text-slate-900">
              {totals.totalItems}
            </strong>
            <span className="text-xs text-slate-400">productos</span>
          </div>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Stock Físico Contado
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-base sm:text-lg font-bold text-slate-900">
              {totals.totalStockKg.toFixed(1)} kg / {totals.totalStockUnits} und
            </strong>
          </div>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Inversión en Mercancía (Costo)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
              {formatCurrency(totals.totalCostVal)}
            </strong>
          </div>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 bg-gradient-to-br from-white to-emerald-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Venta Total Proyectada
            </span>
            <Badge variant={totals.overallMargin >= 30 ? "success" : "destructive"} className="text-[10px] px-1.5 py-0">
              {totals.overallMargin}% margen
            </Badge>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <strong className="text-lg sm:text-xl font-bold text-emerald-950 font-mono">
              {formatCurrency(totals.totalSellVal)}
            </strong>
          </div>
        </Card>
      </div>

      {/* Panel Superior: Registro Rápido / Conteo Ágil */}
      <Card className="shadow-xs border-indigo-100 bg-white overflow-hidden print:hidden">
        <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-white px-5 py-3 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-indigo-700" />
            <h2 className="text-sm font-bold text-slate-900">
              {formMatchedProduct ? "Actualizar Existencias de Producto Existente" : "Registro Rápido de Producto / Conteo al Vuelo"}
            </h2>
          </div>
          {formMatchedProduct && (
            <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50/50 text-[11px]">
              Modo: Actualización de "{formMatchedProduct.name}"
            </Badge>
          )}
        </div>

        <CardContent className="p-5">
          <form onSubmit={handleSubmitProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Nombre de Producto con Autocompletado */}
              <div className="md:col-span-5 relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Producto *
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Ej: Aceite Premier 1000ml, Salsa Tártara, Bulto Papa Pastusa..."
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="pr-8 text-sm font-medium"
                    required
                  />
                  {formName && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                      title="Limpiar"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sugerencias de productos si coincide */}
                {formName && !formMatchedProduct && (
                  <div className="mt-1">
                    {products
                      .filter(
                        (p) =>
                          p.name.toLowerCase().includes(formName.toLowerCase()) &&
                          p.name.toLowerCase() !== formName.toLowerCase()
                      )
                      .slice(0, 3)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectExistingProduct(p)}
                          className="inline-flex items-center gap-1.5 mr-1.5 mb-1 px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3 text-indigo-600" />
                          <span>Cargar "{p.name}"</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Categoría */}
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Medida: Unidad vs Pesaje */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modalidad de Venta
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormUnitType("unidad")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      formUnitType === "unidad"
                        ? "bg-white text-indigo-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Por Unidad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormUnitType("kg")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      formUnitType === "kg"
                        ? "bg-white text-indigo-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Por Pesaje (kg)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Fila Numérica: Cantidad Contada, Costo de Compra, Precio Venta Automático */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              {/* Cantidad Física Contada */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Cantidad Contada ({formUnitType === "kg" ? "kg" : "unidades"}) *
                  </label>
                  <span className="text-[10px] text-slate-400">Existencia en tienda</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CleanNumberInput
                    value={formStock}
                    onChange={setFormStock}
                    placeholder="0"
                    allowDecimals={formUnitType === "kg"}
                    className="h-10 text-sm font-bold text-slate-900"
                  />
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormStock((prev) => Math.max(0, prev + (formUnitType === "kg" ? 5 : 1)))}
                      className="h-10 px-2 text-xs"
                      title={formUnitType === "kg" ? "+5 kg" : "+1 unidad"}
                    >
                      +{formUnitType === "kg" ? "5" : "1"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormStock((prev) => Math.max(0, prev + (formUnitType === "kg" ? 50 : 12)))}
                      className="h-10 px-2 text-xs"
                      title={formUnitType === "kg" ? "+50 kg (Bulto)" : "+12 (Docena)"}
                    >
                      +{formUnitType === "kg" ? "50" : "12"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Precio de Compra / Costo ($) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Precio de Compra / Costo ($) *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Por {formUnitType === "kg" ? "kg" : "unidad"}
                  </span>
                </div>
                <CurrencyInput
                  prefix="$"
                  placeholder="0"
                  value={formCostPrice}
                  onChange={handleCostChange}
                  className="h-10 text-sm font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ej: $2.500 el kg de papa o $8.000 la salsa
                </span>
              </div>

              {/* Precio de Venta Automático (Costo / 0.7 -> Redondeado a $100) */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Precio Venta (Margen 30%)</span>
                  </label>
                  {formCostPrice > 0 && (
                    <button
                      type="button"
                      onClick={handleRecalculateFormPrice}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                      title="Recalcular a fórmula Costo / 0.7"
                    >
                      Recalcular
                    </button>
                  )}
                </div>

                <div className="mt-1">
                  <CurrencyInput
                    prefix="$"
                    placeholder="0"
                    value={formSellPrice}
                    onChange={(val) => {
                      setFormSellPrice(val);
                      setIsSellPriceCustom(true);
                    }}
                    className="h-9 text-base font-extrabold text-emerald-900 bg-white"
                  />
                </div>

                {/* Explicación de la fórmula aplicada */}
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  {formCostPrice > 0 ? (
                    <>
                      <span className="text-slate-500 font-mono">
                        {formCostPrice} / 0.7 = {formRawDivided} $\to$ <strong>{formatCurrency(formSellPrice)}</strong>
                      </span>
                      <Badge
                        variant={formCalculatedMargin >= 30 ? "success" : "destructive"}
                        className="text-[10px] px-1.5 py-0 font-bold"
                      >
                        {formCalculatedMargin}% margen
                      </Badge>
                    </>
                  ) : (
                    <span className="text-slate-400">Ingresa el costo para calcular</span>
                  )}
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2.5 pt-2">
              {formMatchedProduct && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="text-xs w-full sm:w-auto h-10 sm:h-9"
                >
                  Cancelar Edición
                </Button>
              )}
              <Button
                type="submit"
                disabled={saving || !formName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 sm:h-9 px-5 shadow-xs w-full sm:w-auto"
              >
                {saving ? (
                  <span>Guardando...</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {formMatchedProduct ? "Actualizar en Inventario" : "Registrar Producto en Inventario"}
                    </span>
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sección Inferior: Tabla de Inventario en Vivo con Conteo y Ajuste Rápido */}
      <Card className="shadow-xs border-slate-200 bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <span>Inventario Físico en Tienda</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Ajusta existencias, costos y precios directamente sobre las filas.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 sm:h-8 text-xs w-full"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="h-9 sm:h-8 px-3 sm:px-2 text-xs shrink-0"
              title="Refrescar catálogo"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            </Button>
          </div>
        </CardHeader>

        {/* Pestañas de Filtro por Categoría */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex gap-1.5 overflow-x-auto scrollbar-none print:hidden">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter("ALL")}
            className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategoryFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            const isSelected = selectedCategoryFilter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {getCategoryIcon(c.slug)}
                <span>{c.name}</span>
                <span className={`text-[10px] px-1 rounded ${isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* VISTA MÓVIL: Tarjetas de Conteo y Edición de Inventario (md:hidden) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No se encontraron productos en esta categoría o con ese término de búsqueda.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const edit = tableEdits[p.id];
              const currentStock = edit ? edit.stock : p.currentStock;
              const currentCost = edit ? edit.cost : p.costPrice;
              const currentSell = edit ? edit.sellPrice : p.sellPrice;
              const realMargin = calculateRealMargin(currentCost, currentSell);
              const isChanged = Boolean(edit && edit.changed);
              const totalRowValue = currentStock * currentCost;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 space-y-3 transition-colors ${
                    isChanged ? "bg-amber-50/40" : ""
                  }`}
                >
                  {/* Encabezado: Icono, Nombre, Categoría, Estado y Eliminar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0">{getProductOrCategoryIcon(p.name, p.category?.slug)}</div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 leading-snug">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400">
                            {p.category?.name || "Sin categoría"}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {p.unit === "kg" ? "Pesaje (kg)" : "Unidad"}
                          </span>
                          {currentStock <= 0 ? (
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              Agotado
                            </span>
                          ) : currentStock <= (p.minStock || 5) ? (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Bajo
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(p)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 shrink-0"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Fila de Stock con Controles Táctiles Cómodos */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">Existencia Físico</span>
                      <span className="text-[10px] text-slate-400">
                        Total valor: <strong className="text-slate-700">{formatCurrency(totalRowValue)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleTableFieldChange(
                            p.id,
                            "stock",
                            Math.max(0, currentStock - (p.unit === "kg" ? 1 : 1))
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer text-sm shadow-2xs active:bg-slate-200"
                        title="Disminuir"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-20">
                        <CleanNumberInput
                          value={currentStock}
                          onChange={(val) => handleTableFieldChange(p.id, "stock", val)}
                          allowDecimals={p.unit === "kg"}
                          className="h-8 text-right font-bold text-xs bg-white"
                          placeholder="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleTableFieldChange(
                            p.id,
                            "stock",
                            currentStock + (p.unit === "kg" ? 1 : 1)
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer text-sm shadow-2xs active:bg-slate-200"
                        title="Aumentar"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fila de Costo y Venta */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Costo Compra ($)</label>
                      <CurrencyInput
                        prefix="$"
                        value={currentCost}
                        onChange={(val) => handleTableFieldChange(p.id, "cost", val)}
                        className="h-8 text-right text-xs bg-white"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-900">Precio Venta ($)</label>
                        <Badge
                          variant={realMargin >= 30 ? "success" : "destructive"}
                          className="text-[9px] font-bold px-1.5 py-0"
                        >
                          {realMargin}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const auto = calculateDespensaPrice(currentCost, 0.3);
                            handleTableFieldChange(p.id, "sellPrice", auto);
                          }}
                          className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center cursor-pointer border border-amber-200 shrink-0"
                          title="Fijar 30% automáticamente"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <CurrencyInput
                          prefix="$"
                          value={currentSell}
                          onChange={(val) => handleTableFieldChange(p.id, "sellPrice", val)}
                          className="h-8 text-right font-bold text-xs text-emerald-950 bg-emerald-50/40 border border-emerald-200 focus:bg-white w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Si fue modificado: Botón Guardar fila */}
                  {isChanged && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveTableRow(p)}
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Guardar Cambios de este Producto
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* VISTA ESCRITORIO: Tabla de Productos Completa (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto touch-scroll">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No se encontraron productos en esta categoría o con ese término de búsqueda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 text-[11px] font-bold text-slate-600">
                  <TableHead className="w-[280px]">Producto</TableHead>
                  <TableHead className="w-[110px]">Modalidad</TableHead>
                  <TableHead className="text-right w-[150px]">Stock Contado</TableHead>
                  <TableHead className="text-right w-[140px]">Costo Compra</TableHead>
                  <TableHead className="text-right w-[160px]">Precio Venta</TableHead>
                  <TableHead className="text-center w-[110px]">Margen Real</TableHead>
                  <TableHead className="text-right w-[130px]">Valor Stock</TableHead>
                  <TableHead className="text-center w-[90px] print:hidden">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const edit = tableEdits[p.id];
                  const currentStock = edit ? edit.stock : p.currentStock;
                  const currentCost = edit ? edit.cost : p.costPrice;
                  const currentSell = edit ? edit.sellPrice : p.sellPrice;
                  const realMargin = calculateRealMargin(currentCost, currentSell);
                  const isChanged = Boolean(edit && edit.changed);
                  const totalRowValue = currentStock * currentCost;

                  return (
                    <TableRow
                      key={p.id}
                      className={`text-xs hover:bg-slate-50/70 transition-colors ${
                        isChanged ? "bg-amber-50/40" : ""
                      }`}
                    >
                      {/* Nombre y Categoría */}
                      <TableCell className="font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="shrink-0">{getProductOrCategoryIcon(p.name, p.category?.slug)}</div>
                          <div>
                            <span className="font-semibold block">{p.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                {p.category?.name || "Sin categoría"}
                              </span>
                              {currentStock <= 0 ? (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                  Agotado
                                </span>
                              ) : currentStock <= (p.minStock || 5) ? (
                                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                  Bajo
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Modalidad */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold border-slate-200 text-slate-700 uppercase"
                        >
                          {p.unit === "kg" ? "Pesaje (kg)" : "Por Unidad"}
                        </Badge>
                      </TableCell>

                      {/* Stock Contado con ajuste rápido */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleTableFieldChange(
                                p.id,
                                "stock",
                                Math.max(0, currentStock - (p.unit === "kg" ? 1 : 1))
                              )
                            }
                            className="w-7 h-7 sm:w-6 sm:h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer text-xs print:hidden active:bg-slate-300"
                            title="Disminuir"
                          >
                            <Minus className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
                          </button>
                          <div className="w-18 sm:w-16">
                            <CleanNumberInput
                              value={currentStock}
                              onChange={(val) => handleTableFieldChange(p.id, "stock", val)}
                              allowDecimals={p.unit === "kg"}
                              className="h-8 sm:h-7 text-right font-bold text-xs"
                              placeholder="0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleTableFieldChange(
                                p.id,
                                "stock",
                                currentStock + (p.unit === "kg" ? 1 : 1)
                              )
                            }
                            className="w-7 h-7 sm:w-6 sm:h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer text-xs print:hidden active:bg-slate-300"
                            title="Aumentar"
                          >
                            <Plus className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Costo de Compra */}
                      <TableCell className="text-right">
                        <div className="w-24 ml-auto">
                          <CurrencyInput
                            prefix="$"
                            value={currentCost}
                            onChange={(val) => handleTableFieldChange(p.id, "cost", val)}
                            className="h-7 text-right text-xs"
                            placeholder="0"
                          />
                        </div>
                      </TableCell>

                      {/* Precio de Venta con Botón de Recálculo 30% */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const auto = calculateDespensaPrice(currentCost, 0.3);
                              handleTableFieldChange(p.id, "sellPrice", auto);
                            }}
                            className="w-5 h-5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center cursor-pointer text-xs border border-amber-200 print:hidden"
                            title="Recalcular con fórmula Costo / 0.7 redondeado a $100"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                          </button>
                          <div className="w-24">
                            <CurrencyInput
                              prefix="$"
                              value={currentSell}
                              onChange={(val) => handleTableFieldChange(p.id, "sellPrice", val)}
                              className="h-7 text-right font-bold text-xs text-emerald-950 bg-slate-50 focus:bg-white"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Margen Real */}
                      <TableCell className="text-center">
                        <Badge
                          variant={realMargin >= 30 ? "success" : "destructive"}
                          className="text-[10px] font-bold px-1.5 py-0.2"
                        >
                          {realMargin}%
                        </Badge>
                      </TableCell>

                      {/* Valor Total del Stock */}
                      <TableCell className="text-right font-mono text-slate-700 font-semibold">
                        {formatCurrency(totalRowValue)}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-center print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          {isChanged && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveTableRow(p)}
                              className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-xs"
                              title="Guardar cambios"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(p)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
