/**
 * Motor Financiero y de Rentabilidad para Carnicería y Legumbrería
 * Enfoque: Margen Real de Utilidad sobre la Venta (Gross Profit Margin) vs Markup
 */

export interface PricingComparison {
  cost: number;
  targetPercent: number;
  wastePercent: number;
  effectiveCost: number;
  // Cálculo erróneo común (Markup)
  markupPrice: number;
  markupProfit: number;
  markupRealMargin: number; // Siempre inferior al target
  // Cálculo correcto (Margen Real)
  realMarginPrice: number;
  realMarginProfit: number;
  realMarginAchieved: number; // Exactamente el target
  // Pérdida por usar markup
  moneyLostPerUnit: number;
}

export interface CutAllocation {
  id: string;
  name: string;
  weightKg: number;
  sellPrice: number;
  wasteKg?: number;
}

export interface BatchCalculationResult {
  totalCost: number;
  totalWeightKg: number;
  totalSellableWeightKg: number;
  totalWasteKg: number;
  projectedRevenue: number;
  projectedProfit: number;
  realMarginPercent: number;
  markupPercent: number;
  isMarginSatisfied: boolean; // >= targetMargin
  targetMarginPercent: number;
  revenueNeededForTargetMargin: number;
  revenueDeficit: number; // Si es > 0, falta recaudar esto para llegar al 30%
}

/**
 * Calcula el Margen Real de Utilidad sobre el Precio de Venta
 * Fórmula: ((Precio - Costo) / Precio) * 100
 */
export function calculateRealMargin(cost: number, sellPrice: number): number {
  if (sellPrice <= 0) return 0;
  const margin = ((sellPrice - cost) / sellPrice) * 100;
  return Number(margin.toFixed(2));
}

/**
 * Calcula el Markup (Margen sobre el Costo)
 * Fórmula: ((Precio - Costo) / Costo) * 100
 */
export function calculateMarkup(cost: number, sellPrice: number): number {
  if (cost <= 0) return 0;
  const markup = ((sellPrice - cost) / cost) * 100;
  return Number(markup.toFixed(2));
}

/**
 * Calcula el Precio de Venta necesario para asegurar un Margen Real objetivo,
 * considerando la merma por desposte o deshidratación.
 * 
 * Fórmula:
 * Costo Real Vendible = Costo Base / (1 - (% Merma / 100))
 * Precio Venta = Costo Real Vendible / (1 - (% Margen Objetivo / 100))
 */
export function calculatePriceForTargetMargin(
  cost: number,
  targetMarginPercent = 30,
  wastePercent = 0
): number {
  if (targetMarginPercent >= 100) return 0;
  if (wastePercent >= 100) return 0;

  // Ajuste de costo por merma (el peso vendible es menor)
  const yieldRatio = 1 - wastePercent / 100;
  const effectiveCost = yieldRatio > 0 ? cost / yieldRatio : cost;

  // Cálculo de precio para margen real sobre venta
  const marginRatio = 1 - targetMarginPercent / 100;
  if (marginRatio <= 0) return 0;

  const price = effectiveCost / marginRatio;
  return Math.round(price); // Redondeado a entero monetario
}

/**
 * Compara detalladamente el resultado de aplicar Markup vs Margen Real
 */
export function compareMarkupVsRealMargin(
  cost: number,
  targetPercent = 30,
  wastePercent = 0
): PricingComparison {
  const yieldRatio = 1 - (wastePercent / 100);
  const effectiveCost = yieldRatio > 0 ? cost / yieldRatio : cost;

  // Escenario Markup (Costo * (1 + %))
  const markupPrice = Math.round(effectiveCost * (1 + targetPercent / 100));
  const markupProfit = markupPrice - effectiveCost;
  const markupRealMargin = markupPrice > 0 ? (markupProfit / markupPrice) * 100 : 0;

  // Escenario Margen Real (Costo / (1 - %))
  const realMarginPrice = calculatePriceForTargetMargin(cost, targetPercent, wastePercent);
  const realMarginProfit = realMarginPrice - effectiveCost;
  const realMarginAchieved = realMarginPrice > 0 ? (realMarginProfit / realMarginPrice) * 100 : 0;

  const moneyLostPerUnit = realMarginPrice - markupPrice;

  return {
    cost,
    targetPercent,
    wastePercent,
    effectiveCost: Number(effectiveCost.toFixed(2)),
    markupPrice,
    markupProfit: Number(markupProfit.toFixed(2)),
    markupRealMargin: Number(markupRealMargin.toFixed(2)),
    realMarginPrice,
    realMarginProfit: Number(realMarginProfit.toFixed(2)),
    realMarginAchieved: Number(realMarginAchieved.toFixed(2)),
    moneyLostPerUnit: Number(moneyLostPerUnit.toFixed(2)),
  };
}

/**
 * Calcula las métricas globales para un pedido / lote de carnes con distintos cortes
 * (Desposte o pedido mayorista).
 */
export function calculateBatchMetrics(
  totalCost: number,
  cuts: CutAllocation[],
  targetMarginPercent = 30
): BatchCalculationResult {
  let totalSellableWeightKg = 0;
  let totalWasteKg = 0;
  let projectedRevenue = 0;

  for (const cut of cuts) {
    const cutWaste = cut.wasteKg || 0;
    totalSellableWeightKg += cut.weightKg;
    totalWasteKg += cutWaste;
    projectedRevenue += cut.weightKg * cut.sellPrice;
  }

  const totalWeightKg = totalSellableWeightKg + totalWasteKg;
  const projectedProfit = projectedRevenue - totalCost;
  const realMarginPercent = projectedRevenue > 0
    ? Number(((projectedProfit / projectedRevenue) * 100).toFixed(2))
    : 0;

  const markupPercent = totalCost > 0
    ? Number(((projectedProfit / totalCost) * 100).toFixed(2))
    : 0;

  // Para lograr el margen objetivo: VentaRequerida = Costo / (1 - targetMargin / 100)
  const revenueNeededForTargetMargin = Math.round(totalCost / (1 - targetMarginPercent / 100));
  const revenueDeficit = Math.max(0, revenueNeededForTargetMargin - projectedRevenue);

  return {
    totalCost,
    totalWeightKg: Number(totalWeightKg.toFixed(2)),
    totalSellableWeightKg: Number(totalSellableWeightKg.toFixed(2)),
    totalWasteKg: Number(totalWasteKg.toFixed(2)),
    projectedRevenue: Math.round(projectedRevenue),
    projectedProfit: Math.round(projectedProfit),
    realMarginPercent,
    markupPercent,
    isMarginSatisfied: realMarginPercent >= targetMarginPercent,
    targetMarginPercent,
    revenueNeededForTargetMargin,
    revenueDeficit: Math.round(revenueDeficit),
  };
}

/**
 * Formatea montos en moneda local (COP / formato estándar con separador de miles)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea pesos en kg con 2 decimales
 */
export function formatWeight(kg: number): string {
  return `${new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(kg)} kg`;
}

/**
 * Calcula el Precio de Venta para Despensa y Productos Generales:
 * Divide el costo entre (1 - margenObjetivo) [ej: 0.7 para 30%]
 * y redondea hacia arriba al múltiplo de $100 más cercano.
 * 
 * Ejemplo usuario: Costo = $2.500 -> 2500 / 0.7 = 3571.42 -> $3.600
 */
export function calculateDespensaPrice(cost: number, marginTarget = 0.3): number {
  if (cost <= 0) return 0;
  const divisor = 1 - marginTarget;
  if (divisor <= 0) return 0;
  const rawPrice = cost / divisor;
  return Math.ceil(rawPrice / 100) * 100;
}

export interface CattleCutInput {
  id: string;
  name: string;
  weightKg: number;
  sellPrice: number;
  wasteKg?: number;
}

export interface CattleCutAttribution {
  id: string;
  name: string;
  weightKg: number;
  sellPrice: number;
  potentialRevenue: number;
  valueSharePercent: number;
  totalAttributedCost: number;
  attributedCostPerKg: number;
  profit: number;
  realMarginPercent: number;
}

export interface CattleYieldResult {
  liveWeightKg: number;
  pricePerKgLive: number;
  totalAnimalCost: number;
  totalAprovechableKg: number;
  wasteKg: number;
  wastePercent: number;
  yieldPercent: number;
  averageCostPerAprovechableKg: number;
  totalPotentialRevenue: number;
  totalPotentialProfit: number;
  totalPotentialMarginPercent: number;
  cutAttributions: CattleCutAttribution[];
  isCoherent: boolean;
  validationMessage?: string;
}

/**
 * Calculador de rendimiento y costo real de una res (Cattle Yield & Cost Calculator)
 * Distribuye el costo del animal entre los cortes por valor relativo de venta (Relative Sales Value Method).
 */
export function calculateCattleYield(
  liveWeightKg: number,
  pricePerKgLive: number,
  cuts: CattleCutInput[]
): CattleYieldResult {
  const totalAnimalCost = Math.round(liveWeightKg * pricePerKgLive);
  const totalAprovechableKg = Number(
    cuts.reduce((sum, c) => sum + (c.weightKg || 0), 0).toFixed(2)
  );

  const wasteKg = Number(Math.max(0, liveWeightKg - totalAprovechableKg).toFixed(2));
  const wastePercent =
    liveWeightKg > 0 ? Number(((wasteKg / liveWeightKg) * 100).toFixed(1)) : 0;
  const yieldPercent =
    liveWeightKg > 0 ? Number(((totalAprovechableKg / liveWeightKg) * 100).toFixed(1)) : 0;

  const averageCostPerAprovechableKg =
    totalAprovechableKg > 0 ? Math.round(totalAnimalCost / totalAprovechableKg) : 0;

  // 1. Calcular el valor potencial de venta de cada producto y total
  let totalPotentialRevenue = 0;
  const cutRevenues = cuts.map((c) => {
    const rev = (c.weightKg || 0) * (c.sellPrice || 0);
    totalPotentialRevenue += rev;
    return { ...c, potentialRevenue: rev };
  });

  // 2. Costeo por valor relativo de venta
  const cutAttributions: CattleCutAttribution[] = cutRevenues.map((c) => {
    const valueShare =
      totalPotentialRevenue > 0
        ? c.potentialRevenue / totalPotentialRevenue
        : totalAprovechableKg > 0
        ? (c.weightKg || 0) / totalAprovechableKg
        : 0;

    const totalAttributedCost = Math.round(totalAnimalCost * valueShare);
    const attributedCostPerKg =
      (c.weightKg || 0) > 0 ? Math.round(totalAttributedCost / c.weightKg) : 0;

    const profit = Math.round(c.potentialRevenue - totalAttributedCost);
    const realMarginPercent = calculateRealMargin(attributedCostPerKg, c.sellPrice);

    return {
      id: c.id,
      name: c.name,
      weightKg: c.weightKg,
      sellPrice: c.sellPrice,
      potentialRevenue: Math.round(c.potentialRevenue),
      valueSharePercent: Number((valueShare * 100).toFixed(1)),
      totalAttributedCost,
      attributedCostPerKg,
      profit,
      realMarginPercent,
    };
  });

  const totalPotentialProfit = Math.round(totalPotentialRevenue - totalAnimalCost);
  const totalPotentialMarginPercent =
    totalPotentialRevenue > 0 ? calculateRealMargin(totalAnimalCost, totalPotentialRevenue) : 0;

  let isCoherent = true;
  let validationMessage: string | undefined = undefined;

  if (liveWeightKg > 0 && totalAprovechableKg > liveWeightKg) {
    isCoherent = false;
    validationMessage = `El peso aprovechable (${totalAprovechableKg} kg) no puede superar el peso vivo del animal (${liveWeightKg} kg).`;
  } else if (liveWeightKg > 0 && totalAprovechableKg === 0 && cuts.length > 0) {
    isCoherent = false;
    validationMessage = "Ingresa los kilos obtenidos en los cortes de desposte.";
  }

  return {
    liveWeightKg,
    pricePerKgLive,
    totalAnimalCost,
    totalAprovechableKg,
    wasteKg,
    wastePercent,
    yieldPercent,
    averageCostPerAprovechableKg,
    totalPotentialRevenue: Math.round(totalPotentialRevenue),
    totalPotentialProfit,
    totalPotentialMarginPercent,
    cutAttributions,
    isCoherent,
    validationMessage,
  };
}

// Re-exportar motor completo de ganado y desposte
export * from "./cattleEngine";

