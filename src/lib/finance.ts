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
