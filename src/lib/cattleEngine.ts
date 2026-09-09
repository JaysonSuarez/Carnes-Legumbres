/**
 * Motor Financiero y Estadístico de Rendimiento y Costeo de Ganado (Desposte)
 * Para "Carne y Legumbre"
 * 
 * Implementa:
 * - Costeo proporcional al valor comercial (Relative Sales Value Method)
 * - Trazabilidad de costos de adquisición y costos adicionales
 * - Análisis de rendimiento cárnico y balance de masa (peso en pie vs aprovechable vs no recuperado)
 * - Semáforo de rentabilidad accesible
 * - Precios mínimos y sugeridos según margen objetivo
 * - Precio máximo de compra en pie ("¿Cuánto puedo pagar?") con simulador de escenarios
 * - Motor estadístico de aprendizaje continuo basado en historial de despostes (sin IA externa)
 */

export type AnimalType = "Novilla" | "Novillo" | "Vaca" | "Toro" | "Ternero" | "Otro";

export type CutClassification =
  | "COMERCIALIZABLE"
  | "SUBPRODUCTO"
  | "MERMA"
  | "DESPERDICIO"
  | "PENDIENTE";

export type ProfitabilityStatus =
  | "RENTABLE"      // Margen >= Margen objetivo
  | "BAJO_MARGEN"  // Margen > 0 y < Margen objetivo
  | "SIN_MARGEN"   // Margen entre -0.5% y 0.5% (punto de equilibrio)
  | "PERDIDA";     // Margen < 0 (Precio < Costo asignado)

export interface AdditionalCosts {
  transport: number;
  slaughter: number;
  deboning: number;
  labor: number;
  cooling: number;
  packaging: number;
  other: number;
  notes?: string;
}

export interface DeboningCutInput {
  id: string;
  productId?: string;
  productName: string;
  classification: CutClassification;
  weightKg: number;
  actualSellPrice: number;
  marketPrice?: number;
  expectedWeightKg?: number;
}

export interface DeboningCutOutput {
  id: string;
  productId?: string;
  productName: string;
  classification: CutClassification;
  weightKg: number;
  expectedWeightKg: number;
  weightDiffKg: number;
  weightDiffPercent: number;
  actualSellPrice: number;
  marketPrice: number;
  potentialRevenue: number;
  valueSharePercent: number;
  costAttributed: number;
  costAttributedPerKg: number;
  profit: number;
  realMarginPercent: number;
  minSellPrice: number;
  recommendedPrice: number;
  profitabilityStatus: ProfitabilityStatus;
  isPricePending: boolean;
  isBelowMarket: boolean;
  marketDiffPerKg: number;
}

export interface CattleDeboningResult {
  liveWeightKg: number;
  pricePerKgLive: number;
  acquisitionCost: number;
  additionalCosts: AdditionalCosts;
  totalAdditionalCosts: number;
  totalAnimalCost: number;
  targetMarginPercent: number;

  totalSellableWeightKg: number;
  totalWasteKg: number;
  unrecoveredWeightKg: number;
  yieldPercent: number;
  wastePercent: number;

  totalPotentialRevenue: number;
  grossProfitBeforeAdditional: number;
  grossProfit: number;
  marginOnSalesPercent: number;
  marginOnCostPercent: number;
  averageCostPerSellableKg: number;

  cuts: DeboningCutOutput[];

  // Listados clasificados para análisis directivo
  topCutsByRevenue: DeboningCutOutput[];
  topCutsByMargin: DeboningCutOutput[];
  lowMarginCuts: DeboningCutOutput[];
  lossCuts: DeboningCutOutput[];
  belowMarketCuts: DeboningCutOutput[];

  isCoherent: boolean;
  validationWarnings: string[];
}

export interface MaxPurchasePriceInput {
  liveWeightKg: number;
  expectedYieldPercent: number;
  expectedRevenuePerAprovechableKg?: number;
  customExpectedRevenue?: number;
  estimatedAdditionalCosts: number;
  targetMarginPercent: number;
}

export interface MaxPurchasePriceResult {
  liveWeightKg: number;
  expectedYieldPercent: number;
  expectedAprovechableKg: number;
  expectedRevenue: number;
  maxTotalAllowedCost: number;
  estimatedAdditionalCosts: number;
  maxAcquisitionCost: number;
  maxPricePerKgLive: number;
  maxPricePerKgLiveRounded: number;
  projectedProfit: number;
  achievedMarginPercent: number;
  adviceMessage: string;
}

export interface ScenarioResult {
  scenarioName: "Conservador" | "Actual" | "Optimista" | "Personalizado";
  yieldPercent: number;
  priceAdjustmentPercent: number;
  maxPricePerKgLive: number;
  projectedRevenue: number;
  projectedProfit: number;
  marginPercent: number;
}

export interface HistoricalCutStat {
  productName: string;
  classification: CutClassification;
  sampleCount: number;
  averagePercentageOfLiveWeight: number; // % del peso en pie
  averagePercentageOfSellableWeight: number; // % del peso vendible
  averageWeightKg: number;
  lastUsedSellPrice: number;
}

export interface HistoricalYieldStats {
  totalAnimalsRecorded: number;
  averageLiveWeightKg: number;
  averageYieldPercent: number;
  averageTotalCost: number;
  averageGrossProfit: number;
  averageMarginOnSalesPercent: number;
  cutBenchmarks: HistoricalCutStat[];
}

/**
 * Fixture de referencia del caso de prueba de novilla de 515 kg
 */
export const REFERENCE_CATTLE_FIXTURE = {
  liveWeightKg: 515,
  pricePerKgLive: 7600,
  acquisitionCost: 3914000,
  expectedYieldPercent: 55.0,
  expectedTotalSellableKg: 283.25,
  expectedPotentialRevenue: 5086250,
  expectedGrossProfitBeforeAdditional: 1172250,
  additionalCosts: {
    transport: 100000,
    slaughter: 150000,
    deboning: 100000,
    labor: 0,
    cooling: 0,
    packaging: 0,
    other: 0,
  },
  expectedTotalCostWithAdditional: 4264000,
  cuts: [
    { name: "Lomo fino", weightKg: 13, sellPrice: 37000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Punta de anca", weightKg: 8, sellPrice: 37000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Primera", weightKg: 58, sellPrice: 24000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Segunda", weightKg: 60, sellPrice: 20000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Costilla", weightKg: 30, sellPrice: 15000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Hueso rojo", weightKg: 34, sellPrice: 12000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Hueso blanco", weightKg: 20, sellPrice: 8000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Osobuco", weightKg: 15.25, sellPrice: 13000, classification: "COMERCIALIZABLE" as CutClassification },
    { name: "Pellejo", weightKg: 10, sellPrice: 8000, classification: "SUBPRODUCTO" as CutClassification },
    { name: "Lengua", weightKg: 1, sellPrice: 13000, classification: "SUBPRODUCTO" as CutClassification },
    { name: "Mondongo", weightKg: 34, sellPrice: 12000, classification: "SUBPRODUCTO" as CutClassification },
  ],
};

/**
 * Plantilla estándar de desposte de res colombiana (proporciones de referencia para inicio en frío)
 */
export const DEFAULT_COLOMBIAN_BEEF_BENCHMARKS: HistoricalCutStat[] = [
  { productName: "Lomo fino", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 2.52, averagePercentageOfSellableWeight: 4.59, averageWeightKg: 13.0, lastUsedSellPrice: 37000 },
  { productName: "Punta de anca", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 1.55, averagePercentageOfSellableWeight: 2.82, averageWeightKg: 8.0, lastUsedSellPrice: 37000 },
  { productName: "Primera", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 11.26, averagePercentageOfSellableWeight: 20.48, averageWeightKg: 58.0, lastUsedSellPrice: 24000 },
  { productName: "Segunda", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 11.65, averagePercentageOfSellableWeight: 21.18, averageWeightKg: 60.0, lastUsedSellPrice: 20000 },
  { productName: "Costilla", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 5.83, averagePercentageOfSellableWeight: 10.59, averageWeightKg: 30.0, lastUsedSellPrice: 15000 },
  { productName: "Hueso rojo", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 6.60, averagePercentageOfSellableWeight: 12.00, averageWeightKg: 34.0, lastUsedSellPrice: 12000 },
  { productName: "Hueso blanco", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 3.88, averagePercentageOfSellableWeight: 7.06, averageWeightKg: 20.0, lastUsedSellPrice: 8000 },
  { productName: "Osobuco", classification: "COMERCIALIZABLE", sampleCount: 1, averagePercentageOfLiveWeight: 2.96, averagePercentageOfSellableWeight: 5.38, averageWeightKg: 15.25, lastUsedSellPrice: 13000 },
  { productName: "Pellejo", classification: "SUBPRODUCTO", sampleCount: 1, averagePercentageOfLiveWeight: 1.94, averagePercentageOfSellableWeight: 3.53, averageWeightKg: 10.0, lastUsedSellPrice: 8000 },
  { productName: "Lengua", classification: "SUBPRODUCTO", sampleCount: 1, averagePercentageOfLiveWeight: 0.19, averagePercentageOfSellableWeight: 0.35, averageWeightKg: 1.0, lastUsedSellPrice: 13000 },
  { productName: "Mondongo", classification: "SUBPRODUCTO", sampleCount: 1, averagePercentageOfLiveWeight: 6.60, averagePercentageOfSellableWeight: 12.00, averageWeightKg: 34.0, lastUsedSellPrice: 12000 },
];

/**
 * Calcula el desglose completo del desposte y costeo de un animal
 */
export function calculateAnimalDeboning(
  liveWeightKg: number,
  pricePerKgLive: number,
  additionalCosts: Partial<AdditionalCosts> = {},
  cuts: DeboningCutInput[] = [],
  targetMarginPercent = 30
): CattleDeboningResult {
  const normAdditional: AdditionalCosts = {
    transport: Number(additionalCosts.transport || 0),
    slaughter: Number(additionalCosts.slaughter || 0),
    deboning: Number(additionalCosts.deboning || 0),
    labor: Number(additionalCosts.labor || 0),
    cooling: Number(additionalCosts.cooling || 0),
    packaging: Number(additionalCosts.packaging || 0),
    other: Number(additionalCosts.other || 0),
    notes: additionalCosts.notes || "",
  };

  const totalAdditionalCosts =
    normAdditional.transport +
    normAdditional.slaughter +
    normAdditional.deboning +
    normAdditional.labor +
    normAdditional.cooling +
    normAdditional.packaging +
    normAdditional.other;

  const acquisitionCost = Math.round(Number(liveWeightKg) * Number(pricePerKgLive));
  const totalAnimalCost = acquisitionCost + totalAdditionalCosts;

  // Clasificación de pesos
  let totalSellableWeightKg = 0;
  let totalWasteKg = 0;

  for (const c of cuts) {
    const w = Number(c.weightKg || 0);
    if (c.classification === "MERMA" || c.classification === "DESPERDICIO") {
      totalWasteKg += w;
    } else {
      totalSellableWeightKg += w;
    }
  }

  totalSellableWeightKg = Number(totalSellableWeightKg.toFixed(2));
  totalWasteKg = Number(totalWasteKg.toFixed(2));

  const unrecoveredWeightKg = Number(
    Math.max(0, liveWeightKg - totalSellableWeightKg - totalWasteKg).toFixed(2)
  );

  const yieldPercent =
    liveWeightKg > 0
      ? Number(((totalSellableWeightKg / liveWeightKg) * 100).toFixed(2))
      : 0;

  const wastePercent =
    liveWeightKg > 0
      ? Number((((totalWasteKg + unrecoveredWeightKg) / liveWeightKg) * 100).toFixed(2))
      : 0;

  // 1. Calcular valor potencial de cada producto y valor potencial total
  let totalPotentialRevenue = 0;
  const cutPotentialRevs = cuts.map((c) => {
    const w = Number(c.weightKg || 0);
    const p = Number(c.actualSellPrice || 0);
    const isCommercial = c.classification !== "MERMA" && c.classification !== "DESPERDICIO";
    const rev = isCommercial ? w * p : 0;
    totalPotentialRevenue += rev;
    return { ...c, potentialRevenue: rev };
  });

  totalPotentialRevenue = Math.round(totalPotentialRevenue);

  // 2. Distribuir costo proporcional al valor comercial (Relative Sales Value)
  const cutsOutput: DeboningCutOutput[] = cutPotentialRevs.map((c) => {
    const w = Number(c.weightKg || 0);
    const p = Number(c.actualSellPrice || 0);
    const mkt = Number(c.marketPrice || 0);
    const exp = Number(c.expectedWeightKg || 0);

    const isCommercial = c.classification !== "MERMA" && c.classification !== "DESPERDICIO";
    const isPricePending = isCommercial && p <= 0;

    let valueShare = 0;
    if (totalPotentialRevenue > 0 && isCommercial) {
      valueShare = c.potentialRevenue / totalPotentialRevenue;
    } else if (totalSellableWeightKg > 0 && isCommercial) {
      valueShare = w / totalSellableWeightKg;
    }

    const valueSharePercent = Number((valueShare * 100).toFixed(3));
    const costAttributed = totalAnimalCost * valueShare;
    const costAttributedPerKg = w > 0 ? costAttributed / w : 0;
    const profit = c.potentialRevenue - costAttributed;

    const realMarginPercent =
      p > 0
        ? Number((((p - costAttributedPerKg) / p) * 100).toFixed(2))
        : 0;

    // Precio mínimo (punto de equilibrio)
    const minSellPrice = Math.round(costAttributedPerKg);

    // Precio recomendado para cumplir margen objetivo
    const divisor = 1 - targetMarginPercent / 100;
    const recommendedPrice =
      divisor > 0 && costAttributedPerKg > 0
        ? Math.round(costAttributedPerKg / divisor)
        : minSellPrice;

    // Semáforo de Rentabilidad
    let profitabilityStatus: ProfitabilityStatus = "RENTABLE";
    if (p < costAttributedPerKg) {
      profitabilityStatus = "PERDIDA";
    } else if (Math.abs(p - costAttributedPerKg) < 50 || Math.abs(realMarginPercent) < 0.5) {
      profitabilityStatus = "SIN_MARGEN";
    } else if (realMarginPercent < targetMarginPercent) {
      profitabilityStatus = "BAJO_MARGEN";
    } else {
      profitabilityStatus = "RENTABLE";
    }

    // Variación con estimado histórico
    const weightDiffKg = Number((w - exp).toFixed(2));
    const weightDiffPercent =
      exp > 0 ? Number(((weightDiffKg / exp) * 100).toFixed(2)) : 0;

    // Comparación con mercado
    const isBelowMarket = mkt > 0 && p < mkt;
    const marketDiffPerKg = mkt > 0 ? Math.round(p - mkt) : 0;

    return {
      id: c.id,
      productId: c.productId,
      productName: c.productName,
      classification: c.classification,
      weightKg: w,
      expectedWeightKg: exp,
      weightDiffKg,
      weightDiffPercent,
      actualSellPrice: p,
      marketPrice: mkt,
      potentialRevenue: Math.round(c.potentialRevenue),
      valueSharePercent,
      costAttributed: Math.round(costAttributed),
      costAttributedPerKg: Number(costAttributedPerKg.toFixed(2)),
      profit: Math.round(profit),
      realMarginPercent,
      minSellPrice,
      recommendedPrice,
      profitabilityStatus,
      isPricePending,
      isBelowMarket,
      marketDiffPerKg,
    };
  });

  // Métricas consolidadas del animal
  const grossProfitBeforeAdditional = totalPotentialRevenue - acquisitionCost;
  const grossProfit = totalPotentialRevenue - totalAnimalCost;

  const marginOnSalesPercent =
    totalPotentialRevenue > 0
      ? Number(((grossProfit / totalPotentialRevenue) * 100).toFixed(2))
      : 0;

  const marginOnCostPercent =
    totalAnimalCost > 0
      ? Number(((grossProfit / totalAnimalCost) * 100).toFixed(2))
      : 0;

  const averageCostPerSellableKg =
    totalSellableWeightKg > 0
      ? Math.round(totalAnimalCost / totalSellableWeightKg)
      : 0;

  // Listados clasificados
  const commercialCuts = cutsOutput.filter(
    (c) => c.classification !== "MERMA" && c.classification !== "DESPERDICIO"
  );

  const topCutsByRevenue = [...commercialCuts].sort(
    (a, b) => b.potentialRevenue - a.potentialRevenue
  );

  const topCutsByMargin = [...commercialCuts].sort(
    (a, b) => b.realMarginPercent - a.realMarginPercent
  );

  const lowMarginCuts = commercialCuts.filter(
    (c) => c.profitabilityStatus === "BAJO_MARGEN" || c.profitabilityStatus === "SIN_MARGEN"
  );

  const lossCuts = commercialCuts.filter(
    (c) => c.profitabilityStatus === "PERDIDA"
  );

  const belowMarketCuts = commercialCuts.filter((c) => c.isBelowMarket);

  // Validaciones de consistencia
  const validationWarnings: string[] = [];
  let isCoherent = true;

  if (liveWeightKg <= 0) {
    isCoherent = false;
    validationWarnings.push("El peso en pie debe ser mayor a 0 kg.");
  }
  if (pricePerKgLive <= 0) {
    isCoherent = false;
    validationWarnings.push("El precio de compra por kg debe ser mayor a $0.");
  }
  if (totalSellableWeightKg > liveWeightKg) {
    isCoherent = false;
    validationWarnings.push(
      `Los kilos aprovechables (${totalSellableWeightKg} kg) no pueden superar el peso en pie (${liveWeightKg} kg).`
    );
  }
  if (yieldPercent > 70) {
    validationWarnings.push(
      `El rendimiento obtenido (${yieldPercent}%) es inusualmente alto para ganado vacuno (habitual: 50% - 60%). Verifica los pesos.`
    );
  }
  if (yieldPercent < 45 && cuts.length > 0) {
    validationWarnings.push(
      `El rendimiento obtenido (${yieldPercent}%) es inferior al 45%. Revisa si faltan cortes o subproductos por registrar.`
    );
  }

  const pendingPrices = cutsOutput.filter((c) => c.isPricePending);
  if (pendingPrices.length > 0) {
    validationWarnings.push(
      `Hay ${pendingPrices.length} corte(s) con precio pendiente de configurar.`
    );
  }

  return {
    liveWeightKg,
    pricePerKgLive,
    acquisitionCost,
    additionalCosts: normAdditional,
    totalAdditionalCosts,
    totalAnimalCost,
    targetMarginPercent,
    totalSellableWeightKg,
    totalWasteKg,
    unrecoveredWeightKg,
    yieldPercent,
    wastePercent,
    totalPotentialRevenue,
    grossProfitBeforeAdditional,
    grossProfit,
    marginOnSalesPercent,
    marginOnCostPercent,
    averageCostPerSellableKg,
    cuts: cutsOutput,
    topCutsByRevenue,
    topCutsByMargin,
    lowMarginCuts,
    lossCuts,
    belowMarketCuts,
    isCoherent,
    validationWarnings,
  };
}

/**
 * Calculador de Precio Máximo de Compra en Pie ("¿Cuánto puedo pagar por este animal?")
 * Herramienta de toma de decisiones antes de comprar
 */
export function calculateMaxPurchasePrice(input: MaxPurchasePriceInput): MaxPurchasePriceResult {
  const {
    liveWeightKg,
    expectedYieldPercent,
    expectedRevenuePerAprovechableKg = 18000,
    customExpectedRevenue,
    estimatedAdditionalCosts = 0,
    targetMarginPercent = 20,
  } = input;

  const expectedAprovechableKg = Number(
    (liveWeightKg * (expectedYieldPercent / 100)).toFixed(2)
  );

  const expectedRevenue =
    customExpectedRevenue && customExpectedRevenue > 0
      ? customExpectedRevenue
      : Math.round(expectedAprovechableKg * expectedRevenuePerAprovechableKg);

  // Costo total máximo permitido para lograr el margen objetivo sobre la venta
  const marginRatio = 1 - targetMarginPercent / 100;
  const maxTotalAllowedCost = Math.round(expectedRevenue * Math.max(0, marginRatio));

  // Costo máximo de compra del animal (descontando los gastos adicionales de flete, matadero, etc.)
  const maxAcquisitionCost = Math.max(0, maxTotalAllowedCost - estimatedAdditionalCosts);

  // Precio máximo por kg en pie
  const maxPricePerKgLive =
    liveWeightKg > 0 ? Number((maxAcquisitionCost / liveWeightKg).toFixed(2)) : 0;

  // Redondeado hacia abajo a múltiplo de $50 para ofertas comerciales seguras
  const maxPricePerKgLiveRounded = Math.floor(maxPricePerKgLive / 50) * 50;

  const projectedProfit = expectedRevenue - (maxAcquisitionCost + estimatedAdditionalCosts);
  const achievedMarginPercent =
    expectedRevenue > 0 ? Number(((projectedProfit / expectedRevenue) * 100).toFixed(2)) : 0;

  const adviceMessage =
    `Con rendimiento esperado del ${expectedYieldPercent}% y margen objetivo del ${targetMarginPercent}%, ` +
    `el precio tope de compra es de ${formatMoney(maxPricePerKgLiveRounded)}/kg en pie ` +
    `(adquisición máx: ${formatMoney(maxAcquisitionCost)} + gastos: ${formatMoney(estimatedAdditionalCosts)}).`;

  return {
    liveWeightKg,
    expectedYieldPercent,
    expectedAprovechableKg,
    expectedRevenue,
    maxTotalAllowedCost,
    estimatedAdditionalCosts,
    maxAcquisitionCost,
    maxPricePerKgLive,
    maxPricePerKgLiveRounded,
    projectedProfit,
    achievedMarginPercent,
    adviceMessage,
  };
}

/**
 * Genera escenarios para la compra (Actual, Optimista, Conservador)
 */
export function generatePurchaseScenarios(
  liveWeightKg: number,
  baselineYieldPercent = 55,
  baselineRevenuePerKg = 18000,
  additionalCosts = 0,
  targetMarginPercent = 20
): ScenarioResult[] {
  // 1. Conservador: -3% rendimiento, -5% precios
  const consYield = Math.max(40, baselineYieldPercent - 3);
  const consRevPerKg = baselineRevenuePerKg * 0.95;
  const consMax = calculateMaxPurchasePrice({
    liveWeightKg,
    expectedYieldPercent: consYield,
    expectedRevenuePerAprovechableKg: consRevPerKg,
    estimatedAdditionalCosts: additionalCosts,
    targetMarginPercent,
  });

  // 2. Actual / Base
  const baseMax = calculateMaxPurchasePrice({
    liveWeightKg,
    expectedYieldPercent: baselineYieldPercent,
    expectedRevenuePerAprovechableKg: baselineRevenuePerKg,
    estimatedAdditionalCosts: additionalCosts,
    targetMarginPercent,
  });

  // 3. Optimista: +3% rendimiento, +5% precios
  const optYield = Math.min(65, baselineYieldPercent + 3);
  const optRevPerKg = baselineRevenuePerKg * 1.05;
  const optMax = calculateMaxPurchasePrice({
    liveWeightKg,
    expectedYieldPercent: optYield,
    expectedRevenuePerAprovechableKg: optRevPerKg,
    estimatedAdditionalCosts: additionalCosts,
    targetMarginPercent,
  });

  return [
    {
      scenarioName: "Conservador",
      yieldPercent: consYield,
      priceAdjustmentPercent: -5,
      maxPricePerKgLive: consMax.maxPricePerKgLiveRounded,
      projectedRevenue: consMax.expectedRevenue,
      projectedProfit: consMax.projectedProfit,
      marginPercent: targetMarginPercent,
    },
    {
      scenarioName: "Actual",
      yieldPercent: baselineYieldPercent,
      priceAdjustmentPercent: 0,
      maxPricePerKgLive: baseMax.maxPricePerKgLiveRounded,
      projectedRevenue: baseMax.expectedRevenue,
      projectedProfit: baseMax.projectedProfit,
      marginPercent: targetMarginPercent,
    },
    {
      scenarioName: "Optimista",
      yieldPercent: optYield,
      priceAdjustmentPercent: +5,
      maxPricePerKgLive: optMax.maxPricePerKgLiveRounded,
      projectedRevenue: optMax.expectedRevenue,
      projectedProfit: optMax.projectedProfit,
      marginPercent: targetMarginPercent,
    },
  ];
}

/**
 * Motor estadístico de aprendizaje histórico
 * Agrega los despostes completados y genera promedios empíricos
 */
export function computeHistoricalYieldStats(
  completedPurchases: Array<{
    liveWeightKg: number;
    totalSellableWeightKg: number;
    totalAnimalCost: number;
    totalPotentialRevenue: number;
    grossProfit: number;
    cuts?: Array<{
      productName: string;
      classification: CutClassification;
      weightKg: number;
      actualSellPrice: number;
    }>;
  }>
): HistoricalYieldStats {
  if (completedPurchases.length === 0) {
    return {
      totalAnimalsRecorded: 0,
      averageLiveWeightKg: 515,
      averageYieldPercent: 55.0,
      averageTotalCost: 3914000,
      averageGrossProfit: 1172250,
      averageMarginOnSalesPercent: 23.05,
      cutBenchmarks: DEFAULT_COLOMBIAN_BEEF_BENCHMARKS,
    };
  }

  let sumLiveWeight = 0;
  let sumSellableWeight = 0;
  let sumTotalCost = 0;
  let sumRevenue = 0;
  let sumProfit = 0;

  const cutMap = new Map<
    string,
    {
      count: number;
      totalWeight: number;
      totalLiveWeight: number;
      totalSellableWeight: number;
      lastSellPrice: number;
      classification: CutClassification;
    }
  >();

  for (const p of completedPurchases) {
    const live = Number(p.liveWeightKg || 0);
    const sellable = Number(p.totalSellableWeightKg || 0);
    sumLiveWeight += live;
    sumSellableWeight += sellable;
    sumTotalCost += Number(p.totalAnimalCost || 0);
    sumRevenue += Number(p.totalPotentialRevenue || 0);
    sumProfit += Number(p.grossProfit || 0);

    for (const c of p.cuts || []) {
      const normName = c.productName.trim();
      const existing = cutMap.get(normName) || {
        count: 0,
        totalWeight: 0,
        totalLiveWeight: 0,
        totalSellableWeight: 0,
        lastSellPrice: c.actualSellPrice || 0,
        classification: c.classification,
      };

      existing.count += 1;
      existing.totalWeight += Number(c.weightKg || 0);
      existing.totalLiveWeight += live;
      existing.totalSellableWeight += sellable;
      if (c.actualSellPrice > 0) existing.lastSellPrice = c.actualSellPrice;
      cutMap.set(normName, existing);
    }
  }

  const n = completedPurchases.length;
  const averageLiveWeightKg = Number((sumLiveWeight / n).toFixed(1));
  const averageYieldPercent =
    sumLiveWeight > 0 ? Number(((sumSellableWeight / sumLiveWeight) * 100).toFixed(2)) : 55.0;
  const averageTotalCost = Math.round(sumTotalCost / n);
  const averageGrossProfit = Math.round(sumProfit / n);
  const averageMarginOnSalesPercent =
    sumRevenue > 0 ? Number(((sumProfit / sumRevenue) * 100).toFixed(2)) : 0;

  const cutBenchmarks: HistoricalCutStat[] = [];
  for (const [name, data] of cutMap.entries()) {
    const avgLivePct =
      data.totalLiveWeight > 0
        ? Number(((data.totalWeight / data.totalLiveWeight) * 100).toFixed(2))
        : 0;
    const avgSellablePct =
      data.totalSellableWeight > 0
        ? Number(((data.totalWeight / data.totalSellableWeight) * 100).toFixed(2))
        : 0;

    cutBenchmarks.push({
      productName: name,
      classification: data.classification,
      sampleCount: data.count,
      averagePercentageOfLiveWeight: avgLivePct,
      averagePercentageOfSellableWeight: avgSellablePct,
      averageWeightKg: Number((data.totalWeight / data.count).toFixed(2)),
      lastUsedSellPrice: data.lastSellPrice,
    });
  }

  cutBenchmarks.sort((a, b) => b.averagePercentageOfLiveWeight - a.averagePercentageOfLiveWeight);

  return {
    totalAnimalsRecorded: n,
    averageLiveWeightKg,
    averageYieldPercent,
    averageTotalCost,
    averageGrossProfit,
    averageMarginOnSalesPercent,
    cutBenchmarks: cutBenchmarks.length > 0 ? cutBenchmarks : DEFAULT_COLOMBIAN_BEEF_BENCHMARKS,
  };
}

/**
 * Formateo estándar de moneda colombiana (COP)
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Formateo estándar de peso en kilogramos
 */
export function formatWeightNumber(kg: number): string {
  return `${new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(kg || 0)} kg`;
}
