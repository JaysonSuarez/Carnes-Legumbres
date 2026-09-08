"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency, calculateRealMargin } from "@/lib/finance";
import {
  ShoppingCart,
  Trash2,
  Check,
  Search,
  Receipt,
  Eye,
  EyeOff,
  Beef,
  Drumstick,
  Ham,
  Carrot,
  LeafyGreen,
  Banana,
  Sprout,
  Package,
  Boxes,
  LayoutGrid,
  Plus,
  Minus,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDialog, SaleInvoiceData } from "@/components/InvoiceDialog";
import { dispatchStockToast } from "@/components/StockNotificationCenter";

interface Product {
  id: string;
  name: string;
  category: { name: string };
  unit: string;
  costPrice: number;
  sellPrice: number;
  currentStock: number;
  minStock?: number;
  realMargin: number;
  isOutOfStock?: boolean;
  isLowStock?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  costSubtotal: number;
  profit: number;
  realMarginPercent: number;
}

// Configuración de Iconos, Colores y Etiquetas por Categoría General
export const getCategoryConfig = (categoryName: string) => {
  const norm = categoryName.toLowerCase();
  if (norm.includes("pollo") || norm.includes("ave")) {
    return {
      label: "Pollos y Aves",
      shortLabel: "Pollos",
      icon: Drumstick,
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
      textColor: "text-amber-600",
      accentBg: "bg-amber-100",
    };
  }
  if (norm.includes("cerdo") || norm.includes("porcino")) {
    return {
      label: "Cortes de Cerdo",
      shortLabel: "Cerdo",
      icon: Ham,
      badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
      textColor: "text-rose-600",
      accentBg: "bg-rose-100",
    };
  }
  if (norm.includes("res") || norm.includes("carne") || norm.includes("bovino")) {
    return {
      label: "Carnes de Res",
      shortLabel: "Carnes",
      icon: Beef,
      badgeBg: "bg-red-50 text-red-800 border-red-200",
      textColor: "text-red-600",
      accentBg: "bg-red-100",
    };
  }
  if (norm.includes("legumbre") || norm.includes("verdura") || norm.includes("fruta")) {
    return {
      label: "Verduras y Legumbres",
      shortLabel: "Verduras",
      icon: LeafyGreen,
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      textColor: "text-emerald-600",
      accentBg: "bg-emerald-100",
    };
  }
  return {
    label: categoryName,
    shortLabel: categoryName,
    icon: Boxes,
    badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
    textColor: "text-slate-600",
    accentBg: "bg-slate-200",
  };
};

// Configuración específica de Icono a nivel de Producto (Papa, Plátano, Tomate, etc.)
export const getProductConfig = (productName: string, categoryName = "") => {
  const norm = productName.toLowerCase();
  const catNorm = categoryName.toLowerCase();

  // 1. Plátano / Banano -> Banana
  if (
    norm.includes("platano") ||
    norm.includes("plátano") ||
    norm.includes("banan") ||
    norm.includes("harton") ||
    norm.includes("hartón")
  ) {
    return {
      label: "Plátano",
      shortLabel: "Plátano",
      icon: Banana,
      badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
      textColor: "text-amber-700",
      accentBg: "bg-amber-100",
    };
  }

  // 2. Papa / Tubérculos -> Sprout
  if (
    norm.includes("papa") ||
    norm.includes("patata") ||
    norm.includes("yuca") ||
    norm.includes("pastusa") ||
    norm.includes("criolla")
  ) {
    return {
      label: "Papas y Tubérculos",
      shortLabel: "Papa",
      icon: Sprout,
      badgeBg: "bg-lime-50 text-lime-900 border-lime-300",
      textColor: "text-lime-700",
      accentBg: "bg-lime-100",
    };
  }

  // 3. Tomate / Cebolla / Aguacate / Verduras -> LeafyGreen
  if (
    norm.includes("tomate") ||
    norm.includes("cebolla") ||
    norm.includes("aguacate") ||
    norm.includes("zanahoria") ||
    norm.includes("lechuga") ||
    catNorm.includes("legumbre") ||
    catNorm.includes("verdura")
  ) {
    return {
      label: "Verduras y Legumbres",
      shortLabel: "Verdura",
      icon: LeafyGreen,
      badgeBg: "bg-emerald-50 text-emerald-900 border-emerald-300",
      textColor: "text-emerald-700",
      accentBg: "bg-emerald-100",
    };
  }

  // 4. Pollos y Aves -> Drumstick
  if (
    norm.includes("pollo") ||
    norm.includes("ave") ||
    norm.includes("pechuga") ||
    norm.includes("pernil") ||
    norm.includes("muslo") ||
    catNorm.includes("pollo") ||
    catNorm.includes("ave")
  ) {
    return {
      label: "Pollos y Aves",
      shortLabel: "Pollo",
      icon: Drumstick,
      badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
      textColor: "text-amber-700",
      accentBg: "bg-amber-100",
    };
  }

  // 5. Cortes de Cerdo -> Ham
  if (
    norm.includes("cerdo") ||
    norm.includes("porcino") ||
    norm.includes("tocino") ||
    norm.includes("chuleta") ||
    catNorm.includes("cerdo")
  ) {
    return {
      label: "Cortes de Cerdo",
      shortLabel: "Cerdo",
      icon: Ham,
      badgeBg: "bg-rose-50 text-rose-900 border-rose-300",
      textColor: "text-rose-700",
      accentBg: "bg-rose-100",
    };
  }

  // 6. Carnes de Res -> Beef
  if (
    norm.includes("res") ||
    norm.includes("carne") ||
    norm.includes("lomo") ||
    norm.includes("churrasco") ||
    norm.includes("punta de anca") ||
    norm.includes("sobrebarriga") ||
    norm.includes("costilla de res") ||
    norm.includes("osobuco") ||
    norm.includes("hueso") ||
    catNorm.includes("res")
  ) {
    return {
      label: "Carnes de Res",
      shortLabel: "Carne",
      icon: Beef,
      badgeBg: "bg-red-50 text-red-900 border-red-300",
      textColor: "text-red-700",
      accentBg: "bg-red-100",
    };
  }

  // 7. General / Abarrotes -> Boxes
  return {
    label: categoryName || "Abarrotes",
    shortLabel: "Abarrotes",
    icon: Boxes,
    badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
    textColor: "text-slate-600",
    accentBg: "bg-slate-200",
  };
};

export function PosView({ onSaleCompleted }: { onSaleCompleted?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [customerName, setCustomerName] = useState("Cliente Mostrador");
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInternalAudit, setShowInternalAudit] = useState(false);

  // Estado para la Factura Imprimible
  const [invoiceSale, setInvoiceSale] = useState<SaleInvoiceData | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [mobilePosTab, setMobilePosTab] = useState<"catalog" | "cart">("catalog");

  const loadProducts = () => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProducts(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    // Alerta interactiva preventiva si el producto está agotado o bajo en stock
    if (product.currentStock <= 0) {
      dispatchStockToast({
        title: `Aviso: ${product.name} en 0`,
        message: `Estás registrando un producto con 0 existencias físicas en el sistema.`,
        type: "destructive",
        isCritical: true,
      });
    } else if (product.currentStock <= (product.minStock || 5)) {
      dispatchStockToast({
        title: `Aviso: Stock Crítico`,
        message: `${product.name} tiene sólo ${product.currentStock} ${product.unit} disponibles en inventario.`,
        type: "warning",
      });
    }

    const defaultQty = product.unit === "kg" ? 1.0 : 1;
    const existingIndex = cart.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const item = updatedCart[existingIndex];
      const newQty = item.quantity + defaultQty;
      const subtotal = newQty * item.unitPrice;
      const costSubtotal = newQty * item.product.costPrice;
      const profit = subtotal - costSubtotal;
      const realMarginPercent = calculateRealMargin(item.product.costPrice, item.unitPrice);

      updatedCart[existingIndex] = {
        ...item,
        quantity: Number(newQty.toFixed(3)),
        subtotal,
        costSubtotal,
        profit,
        realMarginPercent,
      };
      setCart(updatedCart);
    } else {
      const subtotal = defaultQty * product.sellPrice;
      const costSubtotal = defaultQty * product.costPrice;
      const profit = subtotal - costSubtotal;
      const realMarginPercent = calculateRealMargin(product.costPrice, product.sellPrice);

      setCart([
        ...cart,
        {
          product,
          quantity: defaultQty,
          unitPrice: product.sellPrice,
          subtotal,
          costSubtotal,
          profit,
          realMarginPercent,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...cart];
    const item = updated[index];
    const subtotal = newQty * item.unitPrice;
    const costSubtotal = newQty * item.product.costPrice;
    const profit = subtotal - costSubtotal;
    const realMarginPercent = calculateRealMargin(item.product.costPrice, item.unitPrice);

    updated[index] = {
      ...item,
      quantity: Number(newQty.toFixed(3)),
      subtotal,
      costSubtotal,
      profit,
      realMarginPercent,
    };
    setCart(updated);
  };

  const handleStepQuantity = (index: number, delta: number) => {
    const item = cart[index];
    const step = item.product.unit === "kg" ? 0.5 : 1;
    const newQty = Math.max(0.1, Number((item.quantity + delta * step).toFixed(3)));
    handleUpdateQuantity(index, newQty);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((acc, i) => acc + i.subtotal, 0);
  const totalCost = cart.reduce((acc, i) => acc + i.costSubtotal, 0);
  const totalProfit = totalAmount - totalCost;
  const overallMargin = totalAmount > 0 ? calculateRealMargin(totalCost, totalAmount) : 0;
  const isOverallMarginGood = overallMargin >= 30;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const payload = {
        customerName: customerName.trim() || "Cliente Mostrador",
        paymentMethod,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error procesando venta");

      // Cargar la factura para impresión inmediata
      setInvoiceSale(data.data);
      setShowInvoiceModal(true);

      // Alerta inmediata si productos entraron en bajo stock o se agotaron tras la venta
      if (Array.isArray(data.stockAlerts) && data.stockAlerts.length > 0) {
        for (const alert of data.stockAlerts) {
          dispatchStockToast({
            title: alert.isOutOfStock
              ? `🚨 ¡${alert.name} AGOTADO!`
              : `⚠️ Stock Crítico: ${alert.name}`,
            message: alert.isOutOfStock
              ? `Se han agotado las existencias de ${alert.name} (quedó en 0 ${alert.unit}).`
              : `Tras la venta, ${alert.name} quedó en ${alert.currentStock} ${alert.unit} (mínimo sugerido: ${alert.minStock} ${alert.unit}).`,
            type: alert.isOutOfStock ? "destructive" : "warning",
            isCritical: alert.isOutOfStock,
          });
        }
      }

      setCart([]);
      loadProducts();
      setMobilePosTab("catalog");
      if (onSaleCompleted) onSaleCompleted();
    } catch (err: any) {
      alert(err.message || "Error al procesar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrado de productos por búsqueda y categoría
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || p.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Categorías únicas disponibles en el catálogo
  const availableCategories = Array.from(
    new Set(products.map((p) => p.category.name))
  );

  // Agrupación en secciones
  const categorySections = Array.from(
    new Set(filteredProducts.map((p) => p.category.name))
  ).map((categoryName) => ({
    categoryName,
    config: getCategoryConfig(categoryName),
    products: filteredProducts.filter((p) => p.category.name === categoryName),
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Cabecera */}
      <Card className="shadow-xs border-slate-200">
        <CardContent className="p-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              Punto de Venta & Facturación
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Despacho en mostrador organizado por secciones con pesaje ágil y tirilla de venta.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Selector de Pantalla Móvil (Catálogo vs Ticket) */}
      <div className="flex lg:hidden rounded-xl bg-slate-200/90 p-1 mb-1">
        <button
          type="button"
          onClick={() => setMobilePosTab("catalog")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === "catalog"
              ? "bg-white text-slate-950 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Catálogo ({products.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobilePosTab("cart")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === "cart"
              ? "bg-white text-slate-950 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Ticket ({cart.length})</span>
          {cart.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-black ml-1">
              {formatCurrency(totalAmount)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-16 lg:pb-0">
        {/* Catálogo para Vender con Secciones e Iconos (7 Columnas) */}
        <div
          className={`lg:col-span-7 space-y-3 ${
            mobilePosTab === "cart" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Pestañas / Filtros Rápidos de Categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Todos ({products.length})</span>
            </button>

            {availableCategories.map((catName) => {
              const config = getCategoryConfig(catName);
              const Icon = config.icon;
              const isSelected = selectedCategory === catName;
              const count = products.filter((p) => p.category.name === catName).length;

              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCategory(catName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : config.textColor}`} />
                  <span>{config.shortLabel} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Buscador Rápido */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por corte de carne, pollo, verdura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Catálogo Dividido en Secciones */}
          <div className="max-h-[560px] overflow-y-auto pr-1 space-y-5">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : categorySections.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white">
                No hay productos coincidentes en esta categoría.
              </div>
            ) : (
              categorySections.map((section) => {
                const SectionIcon = section.config.icon;
                return (
                  <div key={section.categoryName} className="space-y-2">
                    {/* Encabezado de la Sección con Icono */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center ${section.config.badgeBg}`}
                        >
                          <SectionIcon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          {section.config.label}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-medium">
                        {section.products.length} {section.products.length === 1 ? "ítem" : "ítems"}
                      </span>
                    </div>

                    {/* Tarjetas de Productos de la Sección */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {section.products.map((p) => {
                        const itemConfig = getProductConfig(p.name, p.category?.name);
                        const ItemIcon = itemConfig.icon;
                        const isOutOfStock = p.currentStock <= 0;
                        const isLowStock =
                          p.currentStock > 0 && p.currentStock <= (p.minStock || 5);

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAddToCart(p)}
                            className={`p-3 rounded-lg text-left transition-all flex flex-col justify-between shadow-xs cursor-pointer group relative border ${
                              isOutOfStock
                                ? "bg-rose-50/20 border-rose-200 hover:border-rose-400 hover:bg-rose-50/40"
                                : isLowStock
                                ? "bg-amber-50/20 border-amber-200 hover:border-amber-400 hover:bg-amber-50/35"
                                : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${itemConfig.badgeBg}`}
                                >
                                  <ItemIcon className="w-2.5 h-2.5" />
                                  <span className="truncate max-w-[80px]">
                                    {itemConfig.shortLabel}
                                  </span>
                                </span>
                                <div>
                                  {isOutOfStock ? (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-300">
                                      Agotado
                                    </span>
                                  ) : isLowStock ? (
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300">
                                      Bajo: {p.currentStock.toFixed(0)} {p.unit}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      {p.currentStock.toFixed(0)} {p.unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs font-bold text-slate-900 line-clamp-2 mt-1 group-hover:text-slate-950">
                                {p.name}
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-black text-slate-900 block font-mono">
                                  {formatCurrency(p.sellPrice)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">/{p.unit}</span>
                              </div>
                              <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-600 transition-colors">
                                <Plus className="w-3 h-3" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ticket de Venta (5 Columnas) */}
        <Card
          className={`lg:col-span-5 shadow-xs flex flex-col justify-between min-h-[560px] ${
            mobilePosTab === "catalog" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div>
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Ticket de Venta
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {cart.length === 0 ? "Sin productos agregados" : `${cart.length} productos en ticket`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMobilePosTab("catalog")}
                    className="lg:hidden text-xs h-7 px-2 font-semibold text-slate-700 cursor-pointer"
                  >
                    + Catálogo
                  </Button>
                  <Badge variant="outline" className="text-xs font-mono">
                    Mostrador
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-3 space-y-3">
              {/* Cliente y Método de Pago */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                    Cliente
                  </label>
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Cliente Mostrador"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                    Medio de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-xs focus:outline-none"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia / Nequi</option>
                    <option value="TARJETA">Tarjeta Débito/Crédito</option>
                    <option value="CREDITO">Fiado / Crédito</option>
                  </select>
                </div>
              </div>

              {/* Lista de Productos en el Carrito con Iconos */}
              <div className="max-h-[250px] overflow-y-auto space-y-1.5 pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    El ticket está vacío. Selecciona productos de las secciones para agregar.
                  </div>
                ) : (
                  cart.map((item, idx) => {
                    const itemCatConfig = getProductConfig(item.product.name, item.product.category?.name);
                    const ItemCatIcon = itemCatConfig.icon;

                    return (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${itemCatConfig.badgeBg}`}>
                            <ItemCatIcon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatCurrency(item.unitPrice)}/{item.product.unit}
                            </div>
                          </div>
                        </div>

                        {/* Control Rápido de Cantidad (+ / -) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(idx, -1)}
                            className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                            title="Disminuir"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>

                          <div className="w-16">
                            <CleanNumberInput
                              value={item.quantity}
                              onChange={(val) => handleUpdateQuantity(idx, val)}
                              className="h-6 px-1.5 py-0.5 text-right font-bold text-xs"
                              placeholder="0"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStepQuantity(idx, 1)}
                            className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                            title="Aumentar"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>

                          <span className="text-[10px] text-slate-400 font-mono w-4">
                            {item.product.unit}
                          </span>
                        </div>

                        <div className="text-right min-w-[70px] shrink-0">
                          <span className="font-bold text-slate-900 font-mono">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer shrink-0"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </div>

          <CardFooter className="p-5 pt-0 flex flex-col space-y-3 border-t border-slate-100">
            {/* Total a Cobrar (Siempre Visible y Destacado) */}
            <div className="w-full flex justify-between items-baseline pt-3">
              <span className="text-xs uppercase font-bold text-slate-500">Total a Cobrar:</span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            {/* Auditoría Interna (Oculta por defecto para no mostrar a clientes) */}
            <div className="w-full pt-1">
              <button
                type="button"
                onClick={() => setShowInternalAudit(!showInternalAudit)}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showInternalAudit ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showInternalAudit ? "Ocultar rentabilidad interna" : "Rentabilidad interna (Solo Cajero)"}</span>
              </button>

              {showInternalAudit && (
                <div className="w-full bg-slate-50 p-2.5 rounded-lg text-xs space-y-1.5 border border-slate-200 mt-2 font-mono">
                  <div className="flex justify-between text-slate-500">
                    <span>Costo Mercancía:</span>
                    <span>{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Ganancia Estimada:</span>
                    <span>+{formatCurrency(totalProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="font-semibold text-slate-700 font-sans">Margen Real Ticket:</span>
                    <Badge
                      variant={isOverallMarginGood ? "success" : "destructive"}
                      className="text-[10px] font-bold"
                    >
                      {overallMargin}% {isOverallMarginGood ? "✓" : "⚠"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              size="default"
              className="w-full font-bold text-xs"
            >
              <Receipt className="w-4 h-4 mr-1.5" />
              {isProcessing ? "Generando Factura..." : "Cobrar Ticket y Generar Factura"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Barra Flotante Inferior Móvil para Ir al Cobro */}
      {cart.length > 0 && mobilePosTab === "catalog" && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
          <button
            type="button"
            onClick={() => setMobilePosTab("cart")}
            className="w-full bg-slate-900 hover:bg-slate-950 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between border border-slate-700 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                {cart.length}
              </span>
              <span className="text-xs font-bold">Ver Ticket</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-emerald-400">
                {formatCurrency(totalAmount)}
              </span>
              <span className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md font-bold">
                Cobrar →
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Diálogo de Factura POS */}
      <InvoiceDialog
        sale={invoiceSale}
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
      />
    </div>
  );
}
