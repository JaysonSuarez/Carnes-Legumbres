/**
 * Motor de Selectores Rápidos Inteligentes por Comportamiento de Compra
 * Analiza el historial de ventas reales con decaimiento por recencia
 * y genera botones de acceso rápido para compras por valor monetario y por cantidad.
 */

export interface QuickSelectorItem {
  id: string;
  type: "money" | "quantity";
  value: number; // Monto en pesos (ej. 1000) o cantidad en unidad/kg (ej. 0.5)
  label: string; // Etiqueta para el botón (ej. "$1.000", "½ kg", "1 kg")
  score: number; // Puntuación de frecuencia ponderada
}

export interface ProductQuickSelectors {
  productId: string;
  dominantType: "money" | "quantity";
  selectors: QuickSelectorItem[];
  isLearned: boolean; // true si proviene de ventas reales, false si es fallback de inicio en frío
}

export interface RawSaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  date?: string;
  createdAt?: string;
}

export interface ProductContext {
  id: string;
  name: string;
  unit: string;
  sellPrice: number;
  categoryName?: string;
  categorySlug?: string;
}

// Valores monetarios redondos comunes en Colombia
const COMMON_MONEY_VALUES = [500, 1000, 2000, 3000, 4000, 5000, 10000, 15000, 20000];

// Cantidades redondas comunes
const COMMON_QUANTITY_VALUES_KG = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0, 10.0];
const COMMON_QUANTITY_VALUES_UNIT = [1, 2, 3, 4, 6, 10, 12, 24, 30];

/**
 * Formatea una cantidad a su representación natural en el mostrador
 */
export function formatQuantityLabel(qty: number, unit: string): string {
  if (unit === "kg") {
    if (Math.abs(qty - 0.25) < 0.01) return "¼ kg";
    if (Math.abs(qty - 0.5) < 0.01) return "½ kg";
    if (Math.abs(qty - 0.75) < 0.01) return "¾ kg";
    if (Math.abs(qty - 1.0) < 0.01) return "1 kg";
    if (Math.abs(qty - 1.5) < 0.01) return "1½ kg";
    if (Math.abs(qty - 2.0) < 0.01) return "2 kg";
    if (Math.abs(qty - 2.5) < 0.01) return "2½ kg";
    if (Math.abs(qty - 3.0) < 0.01) return "3 kg";
    if (Math.abs(qty - 5.0) < 0.01) return "5 kg";
    if (Math.abs(qty - 10.0) < 0.01) return "10 kg";
    return `${qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)} kg`;
  }

  // Por unidad
  if (qty === 6) return "6 un";
  if (qty === 12) return "12 un";
  return `${qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(1)} un`;
}

/**
 * Formatea un valor monetario a etiqueta rápida
 */
export function formatMoneyLabel(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convierte un monto de dinero a kilogramos usando el precio actual del producto
 */
export function calculateWeightFromMoney(amount: number, sellPricePerKg: number): number {
  if (sellPricePerKg <= 0) return 0;
  const rawWeight = amount / sellPricePerKg;
  return Number(rawWeight.toFixed(3));
}

/**
 * Devuelve selectores de inicio en frío (Cold Start) cuando aún no hay historial suficiente
 */
export function getColdStartSelectors(product: ProductContext): QuickSelectorItem[] {
  const normName = product.name.toLowerCase();
  const normCat = (product.categoryName || product.categorySlug || "").toLowerCase();

  // Productos habitualmente pedidos por monto monetario (ají, cilantro, hierbas, especias, menudeo)
  const isMoneyProne =
    normName.includes("ají") ||
    normName.includes("aji") ||
    normName.includes("cilantro") ||
    normName.includes("perejil") ||
    normName.includes("cebolla larga") ||
    normName.includes("hierba") ||
    normName.includes("color") ||
    normName.includes("comino") ||
    normName.includes("ajo") ||
    normCat.includes("hierba") ||
    normCat.includes("especia");

  if (isMoneyProne && product.unit === "kg") {
    return [
      { id: "cs-m-500", type: "money", value: 500, label: "$500", score: 10 },
      { id: "cs-m-1000", type: "money", value: 1000, label: "$1.000", score: 20 },
      { id: "cs-m-2000", type: "money", value: 2000, label: "$2.000", score: 15 },
      { id: "cs-m-5000", type: "money", value: 5000, label: "$5.000", score: 8 },
    ];
  }

  // Carnes y cortes por kilo
  if (product.unit === "kg") {
    return [
      { id: "cs-q-0.5", type: "quantity", value: 0.5, label: "½ kg", score: 25 },
      { id: "cs-q-1", type: "quantity", value: 1.0, label: "1 kg", score: 20 },
      { id: "cs-q-2", type: "quantity", value: 2.0, label: "2 kg", score: 12 },
    ];
  }

  // Productos por unidad
  return [
    { id: "cs-q-1un", type: "quantity", value: 1, label: "1 un", score: 20 },
    { id: "cs-q-2un", type: "quantity", value: 2, label: "2 un", score: 15 },
    { id: "cs-q-6un", type: "quantity", value: 6, label: "6 un", score: 10 },
  ];
}

/**
 * Analiza el historial de ventas aplicando decaimiento por recencia
 * y genera los selectores rápidos adaptados a cada producto.
 */
export function analyzeProductSalesBehavior(
  product: ProductContext,
  saleItems: RawSaleItem[],
  now = new Date()
): ProductQuickSelectors {
  const itemsForProduct = saleItems.filter((i) => i.productId === product.id);

  // Si no hay suficientes ventas registradas para este producto, usamos el arranque en frío
  if (itemsForProduct.length < 3) {
    const fallback = getColdStartSelectors(product);
    return {
      productId: product.id,
      dominantType: fallback[0]?.type || "quantity",
      selectors: fallback,
      isLearned: false,
    };
  }

  // Acumuladores de frecuencia ponderada
  const moneyScores = new Map<number, number>();
  const quantityScores = new Map<number, number>();

  let totalMoneyScore = 0;
  let totalQuantityScore = 0;

  for (const item of itemsForProduct) {
    // 1. Cálculo de factor de recencia (decay)
    const itemDate = new Date(item.date || item.createdAt || now);
    const diffMs = Math.max(0, now.getTime() - itemDate.getTime());
    const daysAgo = diffMs / (1000 * 60 * 60 * 24);
    // Factor de peso: 1.0 para hoy, ~0.58 a 14 días, ~0.25 a 60 días
    const recencyWeight = 1 / (1 + daysAgo * 0.05);

    const subtotal = Math.round(item.subtotal);
    const qty = Number(item.quantity.toFixed(3));

    // 2. Verificar si coincide con compra por valor monetario redondo
    for (const moneyVal of COMMON_MONEY_VALUES) {
      if (Math.abs(subtotal - moneyVal) <= 50) {
        const prev = moneyScores.get(moneyVal) || 0;
        moneyScores.set(moneyVal, prev + recencyWeight);
        totalMoneyScore += recencyWeight;
        break;
      }
    }

    // 3. Verificar si coincide con compra por cantidad redonda
    const targetQuantities =
      product.unit === "kg" ? COMMON_QUANTITY_VALUES_KG : COMMON_QUANTITY_VALUES_UNIT;

    for (const qVal of targetQuantities) {
      if (Math.abs(qty - qVal) <= (product.unit === "kg" ? 0.04 : 0.01)) {
        const prev = quantityScores.get(qVal) || 0;
        quantityScores.set(qVal, prev + recencyWeight);
        totalQuantityScore += recencyWeight;
        break;
      }
    }
  }

  // 4. Determinar tipo dominante
  const dominantType: "money" | "quantity" =
    totalMoneyScore > totalQuantityScore * 1.2 ? "money" : "quantity";

  const selectors: QuickSelectorItem[] = [];

  if (dominantType === "money") {
    const sortedMoney = Array.from(moneyScores.entries())
      .filter(([_, score]) => score >= 1.0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([val, score]) => ({
        id: `sel-m-${val}`,
        type: "money" as const,
        value: val,
        label: formatMoneyLabel(val),
        score: Number(score.toFixed(2)),
      }))
      .sort((a, b) => a.value - b.value);

    selectors.push(...sortedMoney);
  } else {
    const sortedQty = Array.from(quantityScores.entries())
      .filter(([_, score]) => score >= 1.0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([val, score]) => ({
        id: `sel-q-${val}`,
        type: "quantity" as const,
        value: val,
        label: formatQuantityLabel(val, product.unit),
        score: Number(score.toFixed(2)),
      }))
      .sort((a, b) => a.value - b.value);

    selectors.push(...sortedQty);
  }

  if (selectors.length < 2) {
    const fallback = getColdStartSelectors(product);
    return {
      productId: product.id,
      dominantType: fallback[0]?.type || "quantity",
      selectors: fallback,
      isLearned: false,
    };
  }

  return {
    productId: product.id,
    dominantType,
    selectors,
    isLearned: true,
  };
}

/**
 * Analiza todo el catálogo y devuelve un mapa indexado por productId
 */
export function buildQuickSelectorsMap(
  products: ProductContext[],
  saleItems: RawSaleItem[]
): Record<string, QuickSelectorItem[]> {
  const map: Record<string, QuickSelectorItem[]> = {};

  for (const prod of products) {
    const analysis = analyzeProductSalesBehavior(prod, saleItems);
    map[prod.id] = analysis.selectors;
  }

  return map;
}
