"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency, calculateRealMargin } from "@/lib/finance";
import {
  ShoppingCart,
  Trash2,
  Check,
  Search,
  Receipt,
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
  Scale,
  Coins,
  Edit2,
  Fish,
  ChevronLeft,
  ChevronRight,
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
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDialog, SaleInvoiceData } from "@/components/InvoiceDialog";
import { dispatchStockToast } from "@/components/StockNotificationCenter";
import {
  QuickSelectorItem,
  calculateWeightFromMoney,
  getColdStartSelectors,
} from "@/lib/quickSelectors";
import {
  isOnline,
  enqueueAction,
  saveProductsCache,
  getCachedProducts,
} from "@/lib/offline-sync";
import { getSession } from "@/lib/auth";

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

  // 1. Pollos y Aves
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

  // 2. Cortes de Cerdo
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

  // 3. Legumbres y Verduras (DEBE evaluarse ANTES de Carnes de Res para evitar que 'legumb-RES' coincida)
  if (
    norm.includes("legumbre") ||
    norm.includes("verdura") ||
    norm.includes("fruta") ||
    norm.includes("hortaliza")
  ) {
    return {
      label: "Verduras y Legumbres",
      shortLabel: "Verduras",
      icon: LeafyGreen,
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      textColor: "text-emerald-600",
      accentBg: "bg-emerald-100",
    };
  }

  // 4. Pescados y Mariscos
  if (
    norm.includes("pescado") ||
    norm.includes("marisco") ||
    norm.includes("pez") ||
    norm.includes("mar")
  ) {
    return {
      label: "Pescados y Mariscos",
      shortLabel: "Pescados",
      icon: Fish,
      badgeBg: "bg-cyan-50 text-cyan-800 border-cyan-200",
      textColor: "text-cyan-600",
      accentBg: "bg-cyan-100",
    };
  }

  // 5. Carnes de Res (Regla precisa: res como palabra completa, 'carne de res', o 'bovino')
  if (
    norm.includes("carne de res") ||
    norm.includes("bovino") ||
    norm.includes("vacuno") ||
    /\bres\b/i.test(norm) ||
    (norm.includes("carne") && !norm.includes("cerdo") && !norm.includes("pollo") && !norm.includes("legumbre"))
  ) {
    return {
      label: "Carnes de Res",
      shortLabel: "Carnes",
      icon: Beef,
      badgeBg: "bg-red-50 text-red-800 border-red-200",
      textColor: "text-red-600",
      accentBg: "bg-red-100",
    };
  }

  // 6. Abarrotes y Despensa
  if (
    norm.includes("abarrote") ||
    norm.includes("despensa") ||
    norm.includes("grano") ||
    norm.includes("viveres") ||
    norm.includes("víveres")
  ) {
    return {
      label: "Abarrotes y Despensa",
      shortLabel: "Abarrotes",
      icon: Package,
      badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
      textColor: "text-blue-600",
      accentBg: "bg-blue-100",
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

  // 3. Tomate / Cebolla / Aguacate / Verduras / Aliños -> LeafyGreen
  if (
    norm.includes("tomate") ||
    norm.includes("cebolla") ||
    norm.includes("cebollin") ||
    norm.includes("cebollín") ||
    norm.includes("cilantro") ||
    norm.includes("pepino") ||
    norm.includes("zanahoria") ||
    norm.includes("lechuga") ||
    norm.includes("aguacate") ||
    norm.includes("ñame") ||
    norm.includes("name") ||
    norm.includes("ajo") ||
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

  // 6. Pescados y Mariscos -> Fish
  if (
    norm.includes("pescado") ||
    norm.includes("cachama") ||
    norm.includes("mojarra") ||
    norm.includes("bagre") ||
    norm.includes("bocachico") ||
    norm.includes("marisco") ||
    catNorm.includes("pescado") ||
    catNorm.includes("marisco")
  ) {
    return {
      label: "Pescados y Mariscos",
      shortLabel: "Pescado",
      icon: Fish,
      badgeBg: "bg-cyan-50 text-cyan-900 border-cyan-300",
      textColor: "text-cyan-700",
      accentBg: "bg-cyan-100",
    };
  }

  // 7. Carnes de Res -> Beef
  if (
    /\bres\b/i.test(norm) ||
    norm.includes("carne") ||
    norm.includes("lomo") ||
    norm.includes("churrasco") ||
    norm.includes("punta de anca") ||
    norm.includes("sobrebarriga") ||
    norm.includes("costilla de res") ||
    norm.includes("osobuco") ||
    norm.includes("hueso") ||
    norm.includes("mondongo") ||
    norm.includes("lengua") ||
    norm.includes("pellejo") ||
    norm.includes("bovino") ||
    (/\bres\b/i.test(catNorm) && !catNorm.includes("legumbre"))
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

  // 8. General / Abarrotes -> Package / Boxes
  return {
    label: categoryName || "Abarrotes",
    shortLabel: "Abarrotes",
    icon: Package,
    badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
    textColor: "text-slate-600",
    accentBg: "bg-slate-200",
  };
};

export function PosView({
  onSaleCompleted,
  showHeader = true,
}: {
  onSaleCompleted?: () => void;
  showHeader?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [customerName, setCustomerName] = useState("Cliente Mostrador");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creditNotes, setCreditNotes] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estado para la Factura Imprimible
  const [invoiceSale, setInvoiceSale] = useState<SaleInvoiceData | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [mobilePosTab, setMobilePosTab] = useState<"catalog" | "cart">("catalog");

  // Estado para Selectores Rápidos Inteligentes
  const [quickSelectorsMap, setQuickSelectorsMap] = useState<Record<string, QuickSelectorItem[]>>({});

  // Referencia y estado de scroll para carrusel de categorías en PC y móvil
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkCategoryScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  const handleScrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkCategoryScroll, 300);
    }
  };

  // Estado para el Modal de Venta Rápida por Monto en Dinero ($)
  const [moneyModalOpen, setMoneyModalOpen] = useState(false);
  const [moneyProduct, setMoneyProduct] = useState<Product | null>(null);
  const [moneyAmount, setMoneyAmount] = useState<number>(0);
  const [moneyCartIndex, setMoneyCartIndex] = useState<number | undefined>(undefined);

  const handleOpenMoneyModal = (product: Product, initialAmount = 0, cartIndex?: number) => {
    setMoneyProduct(product);
    setMoneyAmount(initialAmount > 0 ? initialAmount : 0);
    setMoneyCartIndex(cartIndex);
    setMoneyModalOpen(true);
  };

  const handleConfirmMoneySale = (product: Product, amount: number, cartIndex?: number) => {
    if (amount <= 0 || product.sellPrice <= 0) return;
    const calculatedQty = Number((amount / product.sellPrice).toFixed(3));
    if (calculatedQty <= 0) return;

    if (cartIndex !== undefined && cart[cartIndex]) {
      // Modificar ítem existente en el ticket
      const updated = [...cart];
      const item = updated[cartIndex];
      const costSubtotal = Number((calculatedQty * item.product.costPrice).toFixed(2));
      const profit = amount - costSubtotal;
      const realMarginPercent = calculateRealMargin(item.product.costPrice, item.unitPrice);

      updated[cartIndex] = {
        ...item,
        quantity: calculatedQty,
        subtotal: amount,
        costSubtotal,
        profit,
        realMarginPercent,
      };
      setCart(updated);
    } else {
      // Agregar al ticket
      if (product.currentStock <= 0) {
        dispatchStockToast({
          title: `Aviso: ${product.name} en 0`,
          message: `Estás registrando un producto con 0 existencias físicas en el sistema.`,
          type: "destructive",
          isCritical: true,
        });
      }

      const existingIndex = cart.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...cart];
        const item = updated[existingIndex];
        const newQty = Number((item.quantity + calculatedQty).toFixed(3));
        const newSubtotal = item.subtotal + amount;
        const costSubtotal = Number((newQty * item.product.costPrice).toFixed(2));
        const profit = newSubtotal - costSubtotal;
        const realMarginPercent = calculateRealMargin(item.product.costPrice, item.unitPrice);

        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          subtotal: newSubtotal,
          costSubtotal,
          profit,
          realMarginPercent,
        };
        setCart(updated);
      } else {
        const costSubtotal = Number((calculatedQty * product.costPrice).toFixed(2));
        const profit = amount - costSubtotal;
        const realMarginPercent = calculateRealMargin(product.costPrice, product.sellPrice);

        setCart([
          ...cart,
          {
            product,
            quantity: calculatedQty,
            unitPrice: product.sellPrice,
            subtotal: amount,
            costSubtotal,
            profit,
            realMarginPercent,
          },
        ]);
      }
    }

    setMoneyModalOpen(false);
    setMoneyProduct(null);
    setMoneyAmount(0);
    setMoneyCartIndex(undefined);

    dispatchStockToast({
      title: "✓ Agregado por Dinero ($)",
      message: `${formatCurrency(amount)} de ${product.name} = ${calculatedQty} ${product.unit} (descontará ${calculatedQty} ${product.unit} del inventario).`,
      type: "info",
    });
  };

  // Estado para Edición Rápida de Precio y Stock desde Mostrador
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [quickEditPrice, setQuickEditPrice] = useState<number>(0);
  const [quickEditStock, setQuickEditStock] = useState<number>(0);
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [quickEditSuccessMsg, setQuickEditSuccessMsg] = useState("");

  const handleOpenQuickEdit = (product: Product) => {
    setQuickEditProduct(product);
    setQuickEditPrice(product.sellPrice);
    setQuickEditStock(product.currentStock);
    setQuickEditSuccessMsg("");
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditProduct) return;
    setQuickEditSaving(true);
    try {
      const session = getSession();
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": session?.role || "cashier",
        },
        body: JSON.stringify({
          id: quickEditProduct.id,
          sellPrice: Number(quickEditPrice || 0),
          currentStock: Number(quickEditStock || 0),
          updatedByUser: session?.username || "mostrador",
          updatedByRole: session?.role || "cashier",
          source: "mostrador",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newSellPrice = Number(quickEditPrice || 0);
        const newStock = Number(quickEditStock || 0);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === quickEditProduct.id
              ? {
                  ...p,
                  sellPrice: newSellPrice,
                  currentStock: newStock,
                  isOutOfStock: newStock <= 0,
                  isLowStock: newStock > 0 && newStock <= (p.minStock || 5),
                }
              : p
          )
        );

        try {
          const cached = getCachedProducts();
          if (cached && Array.isArray(cached)) {
            const updatedCached = cached.map((p: any) =>
              p.id === quickEditProduct.id
                ? { ...p, sellPrice: newSellPrice, currentStock: newStock }
                : p
            );
            saveProductsCache(updatedCached);
          }
        } catch {}

        setQuickEditSuccessMsg("✓ Precio y stock actualizados correctamente");
        setTimeout(() => {
          setQuickEditProduct(null);
          setQuickEditSuccessMsg("");
        }, 1000);
      } else {
        alert(data.error || "No se pudo actualizar el producto");
      }
    } catch (err: any) {
      console.error("Error al actualizar producto:", err);
      alert("Error de conexión al actualizar el producto");
    } finally {
      setQuickEditSaving(false);
    }
  };

  const loadQuickSelectors = () => {
    try {
      const cached = localStorage.getItem("carne_legumbre_quick_selectors");
      if (cached) {
        setQuickSelectorsMap(JSON.parse(cached));
      }
    } catch (e) {
      console.error(e);
    }

    fetch("/api/pos/quick-selectors")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setQuickSelectorsMap(data.data);
          try {
            localStorage.setItem("carne_legumbre_quick_selectors", JSON.stringify(data.data));
          } catch (e) {
            console.error(e);
          }
        }
      })
      .catch((err) => console.warn("Error loading quick selectors:", err));
  };

  const loadProducts = () => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
          saveProductsCache(data.data);
        } else {
          const cached = getCachedProducts();
          if (cached) setProducts(cached);
        }
      })
      .catch(() => {
        const cached = getCachedProducts();
        if (cached) setProducts(cached);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
    loadQuickSelectors();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkCategoryScroll();
    }, 200);
    const handleResize = () => checkCategoryScroll();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [products]);

  const handleQuickAdd = (product: Product, selector: QuickSelectorItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    let addedQty = 0;
    if (selector.type === "money") {
      addedQty = calculateWeightFromMoney(selector.value, product.sellPrice);
    } else {
      addedQty = selector.value;
    }

    if (addedQty <= 0) return;

    if (product.currentStock <= 0) {
      dispatchStockToast({
        title: `Aviso: ${product.name} en 0`,
        message: `Estás registrando un producto con 0 existencias físicas en el sistema.`,
        type: "destructive",
        isCritical: true,
      });
    }

    const existingIndex = cart.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const item = updatedCart[existingIndex];
      const newQty = Number((item.quantity + addedQty).toFixed(3));
      const subtotal = newQty * item.unitPrice;
      const costSubtotal = newQty * item.product.costPrice;
      const profit = subtotal - costSubtotal;
      const realMarginPercent = calculateRealMargin(item.product.costPrice, item.unitPrice);

      updatedCart[existingIndex] = {
        ...item,
        quantity: newQty,
        subtotal,
        costSubtotal,
        profit,
        realMarginPercent,
      };
      setCart(updatedCart);
    } else {
      const subtotal = selector.type === "money" ? selector.value : addedQty * product.sellPrice;
      const costSubtotal = addedQty * product.costPrice;
      const profit = subtotal - costSubtotal;
      const realMarginPercent = calculateRealMargin(product.costPrice, product.sellPrice);

      setCart([
        ...cart,
        {
          product,
          quantity: addedQty,
          unitPrice: product.sellPrice,
          subtotal,
          costSubtotal,
          profit,
          realMarginPercent,
        },
      ]);
    }
  };

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

    if (paymentMethod === "CREDITO") {
      const cleanName = customerName.trim();
      if (!cleanName || cleanName.toLowerCase() === "cliente mostrador") {
        setCustomerError("Ingresa el nombre o identificación del cliente para registrar el fiado.");
        dispatchStockToast({
          title: "⚠️ Nombre requerido",
          message: "Para ventas a crédito o fiado es obligatorio registrar el nombre del cliente.",
          type: "warning",
        });
        return;
      }
    }
    setCustomerError("");
    setIsProcessing(true);

    const payload = {
      customerName: customerName.trim() || "Cliente Mostrador",
      customerPhone: customerPhone.trim() || undefined,
      notes: creditNotes.trim() || undefined,
      paymentMethod,
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
    };

    const processOfflineSale = () => {
      enqueueAction("SALE", payload);

      const count = Math.floor(1000 + Math.random() * 9000);
      const offlineSaleInvoice: SaleInvoiceData = {
        id: "offline_" + Date.now(),
        saleCode: `TKT-OFFLINE-${count}`,
        date: new Date().toISOString(),
        totalAmount,
        totalCost,
        totalProfit,
        realMarginPercent: overallMargin,
        paymentMethod,
        customerName: customerName.trim() || "Cliente Mostrador",
        items: cart.map((i, idx) => ({
          id: `item_off_${idx}`,
          quantity: i.quantity,
          unitCost: i.product.costPrice,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
          profit: i.profit,
          realMarginPercent: i.realMarginPercent,
          product: {
            id: i.product.id,
            name: i.product.name,
            unit: i.product.unit,
            category: { name: i.product.category?.name || "General" },
          },
        })),
      };

      setInvoiceSale(offlineSaleInvoice);
      setShowInvoiceModal(true);

      dispatchStockToast({
        title: "📦 Venta guardada sin conexión",
        message: `Ticket generado: ${offlineSaleInvoice.saleCode}. Se subirá automáticamente a Supabase cuando vuelva internet.`,
        type: "warning",
      });

      setCart([]);
      setCustomerName("Cliente Mostrador");
      setCustomerPhone("");
      setCreditNotes("");
      setPaymentMethod("EFECTIVO");
      setMobilePosTab("catalog");
      const cached = getCachedProducts();
      if (cached) setProducts(cached);
      if (onSaleCompleted) onSaleCompleted();
    };

    if (!isOnline()) {
      processOfflineSale();
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Fallo de conexión al servidor");

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
      setCustomerName("Cliente Mostrador");
      setCustomerPhone("");
      setCreditNotes("");
      setPaymentMethod("EFECTIVO");
      loadProducts();
      loadQuickSelectors();
      setMobilePosTab("catalog");
      if (onSaleCompleted) onSaleCompleted();
    } catch (err: any) {
      console.warn("Fallo online, guardando venta localmente:", err);
      processOfflineSale();
    } finally {
      setIsProcessing(false);
    }
  };

  // Orden prioritario comercial para la carnicería y despensa
  const categoryOrder = [
    "Carnes de Res",
    "Cortes de Cerdo",
    "Pollos y Aves",
    "Pescados y Mariscos",
    "Legumbres y Verduras",
    "Abarrotes y Despensa",
  ];

  // Filtrado de productos por búsqueda y categoría
  const filteredProducts = products.filter((p) => {
    const prodCategory = p.category?.name || "";
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prodCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || prodCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Categorías únicas disponibles en el catálogo, ordenadas por flujo comercial
  const availableCategories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean) as string[])
  ).sort((a, b) => {
    const idxA = categoryOrder.indexOf(a);
    const idxB = categoryOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Agrupación en secciones con orden coherente
  const categorySections = Array.from(
    new Set(filteredProducts.map((p) => p.category?.name).filter(Boolean) as string[])
  )
    .sort((a, b) => {
      const idxA = categoryOrder.indexOf(a);
      const idxB = categoryOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    })
    .map((categoryName) => ({
      categoryName,
      config: getCategoryConfig(categoryName),
      products: filteredProducts.filter((p) => (p.category?.name || "") === categoryName),
    }));

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Cabecera (Opcional) */}
      {showHeader && (
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
      )}

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
          {/* Pestañas / Filtros Rápidos de Categoría con Carrusel y Desplazamiento PC */}
          <div className="relative flex items-center group/cats">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScrollCategories("left")}
                className="absolute -left-2 z-10 w-7 h-7 rounded-full bg-white/95 border border-slate-300 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-all shrink-0"
                title="Deslizar categorías a la izquierda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              ref={categoryScrollRef}
              onScroll={checkCategoryScroll}
              onWheel={(e) => {
                if (e.deltaY !== 0 && categoryScrollRef.current) {
                  categoryScrollRef.current.scrollLeft += e.deltaY;
                  checkCategoryScroll();
                }
              }}
              className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 select-none scroll-smooth w-full px-0.5"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
                const count = products.filter((p) => (p.category?.name || "") === catName).length;

                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setSelectedCategory(catName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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

            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScrollCategories("right")}
                className="absolute -right-2 z-10 w-7 h-7 rounded-full bg-white/95 border border-slate-300 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-all shrink-0"
                title="Deslizar categorías a la derecha"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
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
                        
                        const selectors = quickSelectorsMap[p.id] || getColdStartSelectors({
                          id: p.id,
                          name: p.name,
                          unit: p.unit,
                          sellPrice: p.sellPrice,
                          categoryName: p.category?.name,
                        });

                        return (
                          <div
                            key={p.id}
                            onClick={() => handleAddToCart(p)}
                            className={`p-3 rounded-lg text-left transition-all flex flex-col justify-between shadow-xs cursor-pointer group relative border select-none ${
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
                                <div className="flex items-center gap-1">
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
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenQuickEdit(p);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Ajustar precio o stock de este producto"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs font-bold text-slate-900 line-clamp-2 mt-1 group-hover:text-slate-950">
                                {p.name}
                              </div>
                            </div>

                            {/* Selectores Rápidos Inteligentes por Comportamiento de Compra */}
                            {selectors && selectors.length > 0 && (
                              <div className="mt-2 pt-1.5 border-t border-slate-100/80 flex flex-wrap gap-1">
                                {selectors.map((sel) => (
                                  <button
                                    key={sel.id}
                                    type="button"
                                    onClick={(e) => handleQuickAdd(p, sel, e)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-all cursor-pointer shadow-2xs active:scale-95 border ${
                                      sel.type === "money"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-600 hover:text-white"
                                        : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-900 hover:text-white"
                                    }`}
                                    title={
                                      sel.type === "money"
                                        ? `Comprar ${sel.label} (equivale a ${calculateWeightFromMoney(sel.value, p.sellPrice)} ${p.unit})`
                                        : `Comprar ${sel.label}`
                                    }
                                  >
                                    {sel.label}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-black text-slate-900 block font-mono">
                                  {formatCurrency(p.sellPrice)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">/{p.unit}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenMoneyModal(p);
                                  }}
                                  className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 text-[11px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-0.5 active:scale-95"
                                  title={`Vender por monto en $ (ej: $6.000, $10.000 de ${p.name})`}
                                >
                                  <span className="font-mono font-black text-xs">$</span>
                                  <span>Monto</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(p);
                                  }}
                                  className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
                                  title="Agregar 1 unidad o 1 kg"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
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
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      {paymentMethod === "CREDITO" ? (
                        <span className="text-amber-700 font-bold">Cliente * (Obligatorio)</span>
                      ) : (
                        "Cliente"
                      )}
                    </label>
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (customerError) setCustomerError("");
                      }}
                      className={`h-8 text-xs ${
                        customerError
                          ? "border-red-500 ring-1 ring-red-500 bg-red-50/40"
                          : paymentMethod === "CREDITO"
                          ? "border-amber-300 bg-amber-50/30"
                          : ""
                      }`}
                      placeholder={paymentMethod === "CREDITO" ? "Nombre de la persona" : "Cliente Mostrador"}
                    />
                    {customerError && (
                      <p className="text-[10px] text-red-600 font-medium mt-0.5">{customerError}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Medio de Pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaymentMethod(val);
                        if (val === "CREDITO" && customerName === "Cliente Mostrador") {
                          setCustomerName("");
                        }
                      }}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-xs focus:outline-none"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia / Nequi</option>
                      <option value="TARJETA">Tarjeta Débito/Crédito</option>
                      <option value="CREDITO">Fiado / Crédito (1% diario)</option>
                    </select>
                  </div>
                </div>

                {/* Campos extra y aviso de interés al fiar */}
                {paymentMethod === "CREDITO" && (
                  <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                          Teléfono / Celular (Opcional)
                        </label>
                        <Input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Ej: 310 123 4567"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                          Nota / Plazo acordado
                        </label>
                        <Input
                          type="text"
                          value={creditNotes}
                          onChange={(e) => setCreditNotes(e.target.value)}
                          className="h-8 text-xs"
                          placeholder="Ej: Paga el sábado"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <span className="text-amber-600 font-bold text-sm shrink-0">ℹ️</span>
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-[11px] text-amber-950">
                          Venta a Crédito / Fiado (Interés simple 1% diario)
                        </p>
                        <p className="text-[10px] text-amber-800 leading-tight">
                          Se cobrará el 1% diario sobre el capital sin interés compuesto ({formatCurrency(Math.round(totalAmount * 0.01))}/día por los {formatCurrency(totalAmount)} de este ticket).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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

                        {/* Control Rápido de Cantidad (+ / -) con botones táctiles cómodos */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStepQuantity(idx, -1)}
                            className="w-8 h-8 sm:w-6 sm:h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
                            title="Disminuir"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5" />
                          </button>

                          <div className="w-16">
                            <CleanNumberInput
                              value={item.quantity}
                              onChange={(val) => handleUpdateQuantity(idx, val)}
                              className="h-8 sm:h-6 px-1.5 py-0.5 text-right font-bold text-xs"
                              placeholder="0"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStepQuantity(idx, 1)}
                            className="w-8 h-8 sm:w-6 sm:h-6 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
                            title="Aumentar"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5" />
                          </button>

                          <span className="text-[10px] text-slate-400 font-mono w-4">
                            {item.product.unit}
                          </span>
                        </div>

                        <div className="text-right min-w-[75px] shrink-0 flex flex-col items-end">
                          <button
                            type="button"
                            onClick={() => handleOpenMoneyModal(item.product, item.subtotal, idx)}
                            className="font-bold text-slate-900 font-mono hover:text-emerald-700 hover:bg-emerald-50 px-1 py-0.5 rounded cursor-pointer transition-colors text-right flex items-center gap-1 group/amt active:scale-95"
                            title="Clic para modificar por precio en dinero ($)"
                          >
                            <span>{formatCurrency(item.subtotal)}</span>
                            <span className="text-[9px] font-sans font-semibold text-emerald-700 opacity-70 group-hover/amt:opacity-100 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200">
                              $
                            </span>
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.quantity} {item.product.unit}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-slate-400 hover:text-red-600 p-1.5 sm:p-0.5 cursor-pointer shrink-0 rounded-lg hover:bg-rose-50 active:scale-95 transition-colors"
                          title="Eliminar"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-500" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </div>

          <CardFooter className="p-4 sm:p-5 pt-0 flex flex-col space-y-3 border-t border-slate-100">
            {/* Total a Cobrar (Siempre Visible y Destacado) */}
            <div className="w-full flex justify-between items-baseline pt-3">
              <span className="text-xs uppercase font-bold text-slate-500">Total a Cobrar:</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              size="default"
              className={`w-full font-bold text-sm h-11 shadow-sm cursor-pointer ${
                paymentMethod === "CREDITO"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : ""
              }`}
            >
              <Receipt className="w-4 h-4 mr-1.5" />
              {isProcessing
                ? "Registrando..."
                : paymentMethod === "CREDITO"
                ? "Registrar Venta a Crédito / Fiado"
                : "Cobrar Ticket y Generar Factura"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Barra Flotante Inferior Móvil para Ir al Cobro (Ubicada por encima de la barra de navegación) */}
      {cart.length > 0 && mobilePosTab === "catalog" && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 duration-150">
          <button
            type="button"
            onClick={() => setMobilePosTab("cart")}
            className="w-full bg-slate-900 hover:bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                {cart.length}
              </span>
              <span className="text-xs font-bold">Ver Ticket</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-emerald-400">
                {formatCurrency(totalAmount)}
              </span>
              <span className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-xs">
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

      {/* Modal de Venta Rápida por Monto en Dinero ($) */}
      <Dialog
        open={moneyModalOpen}
        onOpenChange={(open) => {
          setMoneyModalOpen(open);
          if (!open) {
            setMoneyProduct(null);
            setMoneyAmount(0);
            setMoneyCartIndex(undefined);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-5 sm:p-6 bg-white max-h-[90vh] overflow-y-auto">
          {moneyProduct && (
            <div className="space-y-4">
              <DialogHeader className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                    <Scale className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-black text-slate-900">
                      {moneyCartIndex !== undefined ? "Modificar por Monto ($)" : "Venta por Monto en Dinero ($)"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Ingresa el valor pedido por el cliente para calcular el peso exacto.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Información del Producto */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <div className="font-black text-sm text-slate-900">{moneyProduct.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Precio: <span className="font-bold text-slate-800">{formatCurrency(moneyProduct.sellPrice)}</span> / {moneyProduct.unit}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 block">Stock Actual</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      moneyProduct.currentStock <= 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {moneyProduct.currentStock.toFixed(2)} {moneyProduct.unit}
                  </span>
                </div>
              </div>

              {/* Campo para ingresar el dinero */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>¿Cuánto dinero pidió el cliente?</span>
                  <span className="text-[11px] text-emerald-700 font-semibold font-mono">En pesos (COP)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-lg pointer-events-none">
                    $
                  </span>
                  <CurrencyInput
                    value={moneyAmount}
                    onChange={(val) => setMoneyAmount(val)}
                    placeholder="Ej: 6000 o 10000"
                    autoFocus
                    className="pl-8 h-12 text-xl font-mono font-black text-slate-900 border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && moneyAmount > 0 && moneyProduct.sellPrice > 0) {
                        e.preventDefault();
                        handleConfirmMoneySale(moneyProduct, moneyAmount, moneyCartIndex);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Presets de montos habituales */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Montos habituales:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {[2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000, 30000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMoneyAmount(preset)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer active:scale-95 text-center ${
                        moneyAmount === preset
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      ${preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel de Cálculo de Peso y Descuento de Stock en Tiempo Real */}
              {moneyAmount > 0 && moneyProduct.sellPrice > 0 && (() => {
                const calcQty = Number((moneyAmount / moneyProduct.sellPrice).toFixed(3));
                const grams = Math.round(calcQty * 1000);
                const resultingStock = Number((moneyProduct.currentStock - calcQty).toFixed(3));

                return (
                  <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-emerald-700" />
                        Peso / Cantidad Calculada:
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                        {calcQty.toFixed(3)} {moneyProduct.unit}
                      </span>
                    </div>

                    {moneyProduct.unit === "kg" && (
                      <div className="text-[11px] text-emerald-900 font-medium flex justify-between">
                        <span>Equivalente en balanza:</span>
                        <span className="font-bold font-mono">{grams.toLocaleString()} gramos</span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-emerald-200/70 flex items-center justify-between text-[11px] text-emerald-900">
                      <span className="text-slate-600">
                        {formatCurrency(moneyAmount)} ÷ {formatCurrency(moneyProduct.sellPrice)}/{moneyProduct.unit}
                      </span>
                      <span className="font-medium text-emerald-800">
                        Descontará <strong className="font-mono font-black">{calcQty.toFixed(3)} {moneyProduct.unit}</strong> del stock
                      </span>
                    </div>

                    {resultingStock < 0 && (
                      <div className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                        ⚠️ Aviso: El stock resultante será negativo ({resultingStock} {moneyProduct.unit}).
                      </div>
                    )}
                  </div>
                );
              })()}

              <DialogFooter className="pt-2 flex flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMoneyModalOpen(false)}
                  className="flex-1 text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={moneyAmount <= 0 || moneyProduct.sellPrice <= 0}
                  onClick={() => handleConfirmMoneySale(moneyProduct, moneyAmount, moneyCartIndex)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {moneyCartIndex !== undefined ? "Actualizar Ítem" : "Agregar al Ticket"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Rápido de Ajuste de Precio y Stock para Mostrador */}
      <Dialog
        open={Boolean(quickEditProduct)}
        onOpenChange={(open) => !open && setQuickEditProduct(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Package className="w-5 h-5 text-emerald-600" />
              <span>Ajustar Precio & Stock en Mostrador</span>
            </DialogTitle>
            <DialogDescription>
              {quickEditProduct?.name} ({quickEditProduct?.category?.name || "General"})
            </DialogDescription>
          </DialogHeader>

          {quickEditProduct && (
            <form onSubmit={handleSaveQuickEdit} className="space-y-4 py-1">
              {quickEditSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{quickEditSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Precio de Venta ($ por {quickEditProduct.unit})
                </label>
                <CurrencyInput
                  prefix="$"
                  placeholder="0"
                  value={quickEditPrice}
                  onChange={(val) => setQuickEditPrice(val)}
                  className="font-mono font-bold text-base text-slate-950"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Precio actual registrado: {formatCurrency(quickEditProduct.sellPrice)}/{quickEditProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Existencias Físicas / Stock ({quickEditProduct.unit})
                </label>
                <CleanNumberInput
                  placeholder="0"
                  value={quickEditStock}
                  onChange={(val) => setQuickEditStock(val)}
                  className="font-mono font-bold text-base text-slate-950"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Stock actual en sistema: {quickEditProduct.currentStock} {quickEditProduct.unit}
                </span>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickEditProduct(null)}
                  disabled={quickEditSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={quickEditSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {quickEditSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
