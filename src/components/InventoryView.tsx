"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatCurrency, formatWeight, calculatePriceForTargetMargin } from "@/lib/finance";
import { Plus, Search, Check, AlertCircle, Edit2, Package, Sparkles, RotateCcw, ShieldAlert, AlertTriangle, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  code: string | null;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
  unit: string;
  costPrice: number;
  estimatedWastePercent: number;
  targetMarginPercent: number;
  sellPrice: number;
  currentStock: number;
  minStock: number;
  isMeatCut: boolean;
  realMargin: number;
  suggestedPrice30: number;
  isBelowTarget: boolean;
}

interface Category {
  id: string;
  name: string;
}

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    categoryId: "",
    unit: "kg",
    costPrice: 0,
    estimatedWastePercent: 5,
    targetMarginPercent: 30,
    sellPrice: 0,
    currentStock: 10,
    minStock: 5,
    isMeatCut: false,
  });

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
      if (dataCat.success) setCategories(dataCat.data);
    } finally {
      setLoading(false);
    }
  };

  const [demoActionLoading, setDemoActionLoading] = useState(false);
  const totalStockCount = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);

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
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDemoActionLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply30Percent = async (product: Product) => {
    const suggested = calculatePriceForTargetMargin(
      product.costPrice,
      30,
      product.estimatedWastePercent
    );

    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, sellPrice: suggested }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Por favor ingresa el nombre del producto");
      return;
    }
    const catId = formData.categoryId || categories[0]?.id;
    if (!catId) {
      alert("Por favor selecciona una categoría válida");
      return;
    }

    setCreateLoading(true);
    try {
      const selectedCat = categories.find((c) => c.id === catId);
      const isMeat =
        selectedCat?.name?.toLowerCase().includes("res") ||
        selectedCat?.name?.toLowerCase().includes("carne") ||
        selectedCat?.name?.toLowerCase().includes("pollo") ||
        selectedCat?.name?.toLowerCase().includes("cerdo") ||
        Boolean(formData.isMeatCut);

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          categoryId: catId,
          isMeatCut: isMeat,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({
          name: "",
          code: "",
          categoryId: categories[0]?.id || "",
          unit: "kg",
          costPrice: 0,
          estimatedWastePercent: 5,
          targetMarginPercent: 30,
          sellPrice: 0,
          currentStock: 10,
          minStock: 5,
          isMeatCut: false,
        });
        fetchData();
      } else {
        alert(data.error || "Error al crear el producto");
      }
    } catch (err) {
      console.error("Error creando producto:", err);
      alert("Error de conexión al crear el producto");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products?id=${productToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (editingProduct?.id === productToDelete.id) {
          setEditingProduct(null);
        }
        setProductToDelete(null);
        fetchData();
      } else {
        alert(data.error || "No se pudo eliminar el producto");
      }
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      alert("Error de conexión al eliminar el producto");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");

  const outOfStockCount = useMemo(
    () => products.filter((p) => p.currentStock <= 0).length,
    [products]
  );
  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) => p.currentStock > 0 && p.currentStock <= (p.minStock || 5)
      ).length,
    [products]
  );

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === "ALL" || p.categoryId === selectedCategory;
    const matchesStock =
      stockFilter === "ALL"
        ? true
        : stockFilter === "OUT_OF_STOCK"
        ? p.currentStock <= 0
        : p.currentStock > 0 && p.currentStock <= (p.minStock || 5);

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Cabecera */}
      <Card className="shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Catálogo de Productos e Inventario
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de existencias físicas, costo unitario y margen real de cada producto.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalStockCount > 0 ? (
              <Button
                variant="outline"
                size="sm"
                disabled={demoActionLoading}
                onClick={() => handleStockDemoAction("empty")}
                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                title="Establecer todas las existencias físicas en 0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>{demoActionLoading ? "Vaciando..." : "Vaciar Inventario a 0"}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={demoActionLoading}
                onClick={() => handleStockDemoAction("fill")}
                className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                title="Cargar existencias de demostración para pruebas"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>{demoActionLoading ? "Cargando..." : "Llenar Stock Demo"}</span>
              </Button>
            )}

            <Button
              onClick={() => {
                if (categories.length > 0 && !formData.categoryId) {
                  setFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
                }
                setShowAddModal(true);
              }}
              size="sm"
              className="self-start sm:self-auto text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ingresar Nuevo Producto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Banner de Alerta de Stock en Inventario */}
      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <div className="p-3 sm:p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <span>Atención: {outOfStockCount + lowStockCount} productos requieren reposición física</span>
              </h4>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {outOfStockCount} agotados (0 stock) y {lowStockCount} por debajo del umbral mínimo configurado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              size="sm"
              variant={stockFilter === "ALL" ? "outline" : "secondary"}
              onClick={() => setStockFilter(stockFilter === "ALL" ? "LOW_STOCK" : "ALL")}
              className="text-xs h-7 px-2.5 bg-white border-rose-200 hover:bg-rose-100/60 text-rose-900 font-semibold cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
              {stockFilter !== "ALL" ? "Ver Todo el Catálogo" : "Filtrar Críticos"}
            </Button>
          </div>
        </div>
      )}

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre o código (ej: Lomo, Papa, RES-01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs sm:text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
        >
          <option value="ALL">Todas las Categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Filtros Rápidos de Estado de Stock */}
        <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setStockFilter("ALL")}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-center ${
              stockFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter("LOW_STOCK")}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
              stockFilter === "LOW_STOCK"
                ? "bg-white text-amber-900 shadow-xs font-semibold"
                : "text-amber-800 hover:bg-amber-50/50"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Bajo ({lowStockCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStockFilter("OUT_OF_STOCK")}
            className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
              stockFilter === "OUT_OF_STOCK"
                ? "bg-white text-rose-900 shadow-xs font-semibold"
                : "text-rose-800 hover:bg-rose-50/50"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Agotados ({outOfStockCount})</span>
          </button>
        </div>
      </div>

      {/* Contenedor de Productos: Tarjetas en Móvil (< md) y Tabla en Desktop (>= md) */}
      
      {/* Vista Móvil: Tarjetas Táctiles Adaptativas */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-14 w-full rounded-lg" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))
        ) : filteredProducts.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-400">
            No se encontraron productos con los criterios de búsqueda.
          </Card>
        ) : (
          filteredProducts.map((product) => {
            const isOutOfStock = product.currentStock <= 0;
            const isLow =
              product.currentStock > 0 && product.currentStock <= product.minStock;

            return (
              <div
                key={product.id}
                className={`p-3.5 rounded-xl border transition-all shadow-xs space-y-2.5 ${
                  isOutOfStock
                    ? "bg-rose-50/25 border-rose-200"
                    : isLow
                    ? "bg-amber-50/25 border-amber-200"
                    : "bg-white border-slate-200"
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isOutOfStock && (
                        <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                      )}
                      {isLow && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      <span className="text-sm font-bold text-slate-900 truncate block">
                        {product.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {product.category.name} • {product.code || "Sin código"}
                    </span>
                  </div>

                  {/* Estado de Stock */}
                  <div className="shrink-0">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-[10px] font-bold">
                        Agotado (0)
                      </Badge>
                    ) : isLow ? (
                      <Badge variant="warning" className="text-[10px] font-bold">
                        Bajo: {product.currentStock} {product.unit}
                      </Badge>
                    ) : (
                      <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {product.unit === "kg"
                          ? formatWeight(product.currentStock)
                          : `${product.currentStock} ${product.unit}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Métricas Financieras en 3 Columnas */}
                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-slate-50/80 rounded-lg border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Venta
                    </span>
                    <strong className="text-slate-900 font-mono text-sm block">
                      {formatCurrency(product.sellPrice)}
                    </strong>
                    <span className="text-[10px] text-slate-400">/{product.unit}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Costo Base
                    </span>
                    <span className="text-slate-700 font-mono text-xs block">
                      {formatCurrency(product.costPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Merma {product.estimatedWastePercent}%
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end justify-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                      Margen Real
                    </span>
                    <Badge
                      variant={product.realMargin >= 30 ? "success" : "destructive"}
                      className="text-[10px] font-bold"
                    >
                      {product.realMargin}%
                    </Badge>
                  </div>
                </div>

                {/* Acciones para el Pulgar (Botones de altura adecuada >= 36px) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProductToDelete(product)}
                    className="h-9 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                    Eliminar
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {product.isBelowTarget && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApply30Percent(product)}
                        className="h-9 px-2.5 text-xs font-bold text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Fijar 30% ({formatCurrency(product.suggestedPrice30)})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProduct(product)}
                      className="h-9 px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 border-slate-200 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Vista Desktop: Tabla Completa de 8 Columnas (>= md) */}
      <Card className="hidden md:block shadow-xs overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Costo Base</TableHead>
                <TableHead className="text-right">Merma (%)</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-center">Margen Real</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-center w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No se encontraron productos con los criterios de búsqueda.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.currentStock <= 0;
                  const isLow =
                    product.currentStock > 0 && product.currentStock <= product.minStock;
                  return (
                    <TableRow
                      key={product.id}
                      className={
                        isOutOfStock
                          ? "bg-rose-50/30 hover:bg-rose-50/50"
                          : isLow
                          ? "bg-amber-50/30 hover:bg-amber-50/50"
                          : ""
                      }
                    >
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {isOutOfStock && (
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="Agotado" />
                          )}
                          {isLow && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Bajo Stock" />
                          )}
                          <span>{product.name}</span>
                        </div>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {product.code || "SIN-COD"} • {product.unit}
                        </span>
                      </TableCell>

                      <TableCell className="text-slate-600 text-xs">
                        {product.category.name}
                      </TableCell>

                      <TableCell className="text-right text-slate-600">
                        {formatCurrency(product.costPrice)}
                      </TableCell>

                      <TableCell className="text-right text-slate-400 text-xs">
                        {product.estimatedWastePercent}%
                      </TableCell>

                      <TableCell className="text-right font-bold text-slate-900">
                        {formatCurrency(product.sellPrice)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={product.realMargin >= 30 ? "success" : "destructive"}
                          className="text-[10px] font-bold"
                        >
                          {product.realMargin}%
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={
                            isOutOfStock
                              ? "font-black text-rose-700 font-mono"
                              : isLow
                              ? "font-bold text-amber-800 font-mono"
                              : "font-medium text-slate-800"
                          }
                        >
                          {product.unit === "kg"
                            ? formatWeight(product.currentStock)
                            : `${product.currentStock} ${product.unit}`}
                        </span>
                        {isOutOfStock ? (
                          <span className="block text-[10px] text-rose-600 font-bold uppercase">
                            Agotado (0)
                          </span>
                        ) : isLow ? (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            Bajo (Mín: {product.minStock})
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {product.isBelowTarget && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApply30Percent(product)}
                              title={`Ajustar precio a ${formatCurrency(product.suggestedPrice30)} para asegurar 30% real`}
                              className="h-6 px-1.5 text-[10px] font-bold text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100"
                            >
                              <Sparkles className="w-3 h-3 mr-0.5 text-amber-600" />
                              Fijar 30%
                            </Button>
                          )}
                          <button
                            onClick={() => setEditingProduct(product)}
                            title="Editar producto"
                            className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer rounded hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(product)}
                            title="Eliminar producto"
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diálogo Nuevo Producto (shadcn Dialog) */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ingresar Nuevo Producto</DialogTitle>
            <DialogDescription>
              Agrega un producto al catálogo con su costo base y merma estimada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nombre del Producto *
              </label>
              <Input
                type="text"
                required
                placeholder="Ej: Costilla de Res Especial"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Categoría *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Unidad
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="unidad">Unidad / Pieza</option>
                  <option value="lb">Libra (lb)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Costo Base ($)
                </label>
                <CurrencyInput
                  prefix="$"
                  placeholder="0"
                  value={formData.costPrice}
                  onChange={(val) => setFormData({ ...formData, costPrice: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Merma Estimada (%)
                </label>
                <CleanNumberInput
                  suffix="%"
                  placeholder="0"
                  value={formData.estimatedWastePercent}
                  onChange={(val) =>
                    setFormData({ ...formData, estimatedWastePercent: val })
                  }
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-600">
                  Precio de Venta ($) (0 = calcula 30% real)
                </label>
                {formData.costPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const sug = calculatePriceForTargetMargin(
                        formData.costPrice,
                        30,
                        formData.estimatedWastePercent
                      );
                      setFormData((prev) => ({ ...prev, sellPrice: sug }));
                    }}
                    className="text-[10px] text-emerald-700 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                    title="Fijar automáticamente precio de venta para 30% de margen real"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Sugerido 30%:{" "}
                    {formatCurrency(
                      calculatePriceForTargetMargin(
                        formData.costPrice,
                        30,
                        formData.estimatedWastePercent
                      )
                    )}
                  </button>
                )}
              </div>
              <CurrencyInput
                prefix="$"
                placeholder="0"
                value={formData.sellPrice}
                onChange={(val) => setFormData({ ...formData, sellPrice: val })}
                className="font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Stock Inicial
                </label>
                <CleanNumberInput
                  placeholder="0"
                  value={formData.currentStock}
                  onChange={(val) => setFormData({ ...formData, currentStock: val })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Stock Mínimo (Alerta)
                </label>
                <CleanNumberInput
                  placeholder="0"
                  value={formData.minStock}
                  onChange={(val) => setFormData({ ...formData, minStock: val })}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createLoading}>
                {createLoading ? "Guardando..." : "Guardar Producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo Editar Producto (shadcn Dialog) */}
      <Dialog open={Boolean(editingProduct)} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Actualiza el costo, precio de venta o existencias de {editingProduct?.name}.
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <form onSubmit={handleUpdateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                <Input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Costo Base ($)</label>
                  <CurrencyInput
                    prefix="$"
                    placeholder="0"
                    value={editingProduct.costPrice}
                    onChange={(val) =>
                      setEditingProduct({ ...editingProduct, costPrice: val })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Precio Venta ($)</label>
                  <CurrencyInput
                    prefix="$"
                    placeholder="0"
                    value={editingProduct.sellPrice}
                    onChange={(val) =>
                      setEditingProduct({ ...editingProduct, sellPrice: val })
                    }
                    className="font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Stock Actual ({editingProduct.unit})
                  </label>
                  <CleanNumberInput
                    placeholder="0"
                    value={editingProduct.currentStock}
                    onChange={(val) =>
                      setEditingProduct({ ...editingProduct, currentStock: val })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Stock Mínimo</label>
                  <CleanNumberInput
                    placeholder="0"
                    value={editingProduct.minStock}
                    onChange={(val) =>
                      setEditingProduct({ ...editingProduct, minStock: val })
                    }
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProductToDelete(editingProduct);
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  Eliminar Producto
                </Button>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingProduct(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm">
                    Guardar Cambios
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación para Eliminar Producto */}
      <Dialog open={Boolean(productToDelete)} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Eliminar Producto
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente{" "}
              <span className="font-bold text-slate-900">"{productToDelete?.name}"</span>?
              <br />
              Esta acción quitará el producto del catálogo, del inventario físico y del punto de venta (POS).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setProductToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteProduct}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {deleting ? "Eliminando..." : "Sí, Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
