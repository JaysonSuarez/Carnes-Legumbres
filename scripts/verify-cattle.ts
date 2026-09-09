import {
  calculateAnimalDeboning,
  calculateMaxPurchasePrice,
  generatePurchaseScenarios,
  computeHistoricalYieldStats,
  REFERENCE_CATTLE_FIXTURE,
  isMeatProduct,
} from "../src/lib/cattleEngine";

function runCattleTests() {
  console.log("================================================================================");
  console.log("       PRUEBAS DE VERIFICACIÓN: MÓDULO RENDIMIENTO Y COSTEO DE GANADO           ");
  console.log("================================================================================\n");

  // TEST 1: Caso de Referencia Exacto (Novilla 515 kg, Sin Costos Adicionales)
  console.log("TEST 1: Caso Base Novilla 515 kg (Sin Costos Adicionales)");
  const baseResult = calculateAnimalDeboning(
    REFERENCE_CATTLE_FIXTURE.liveWeightKg,
    REFERENCE_CATTLE_FIXTURE.pricePerKgLive,
    {},
    REFERENCE_CATTLE_FIXTURE.cuts.map((c, i) => ({
      id: `cut-${i}`,
      productName: c.name,
      classification: c.classification,
      weightKg: c.weightKg,
      actualSellPrice: c.sellPrice,
    })),
    30
  );

  console.log(`- Peso en pie: ${baseResult.liveWeightKg} kg`);
  console.log(`- Precio compra por kg: $${baseResult.pricePerKgLive}`);
  console.log(`- Costo de adquisición calculado: $${baseResult.acquisitionCost.toLocaleString("es-CO")}`);
  if (baseResult.acquisitionCost !== 3914000) {
    throw new Error(`Fallo Test 1: Costo adquisición debe ser $3.914.000, dio $${baseResult.acquisitionCost}`);
  }

  console.log(`- Peso aprovechable: ${baseResult.totalSellableWeightKg} kg`);
  if (baseResult.totalSellableWeightKg !== 283.25) {
    throw new Error(`Fallo Test 1: Peso aprovechable debe ser 283.25 kg, dio ${baseResult.totalSellableWeightKg}`);
  }

  console.log(`- Rendimiento cárnico: ${baseResult.yieldPercent}%`);
  if (baseResult.yieldPercent !== 55.0) {
    throw new Error(`Fallo Test 1: Rendimiento debe ser exactamente 55.0%, dio ${baseResult.yieldPercent}%`);
  }

  console.log(`- Peso no recuperado: ${baseResult.unrecoveredWeightKg} kg`);
  if (baseResult.unrecoveredWeightKg !== 231.75) {
    throw new Error(`Fallo Test 1: Peso no recuperado debe ser 231.75 kg, dio ${baseResult.unrecoveredWeightKg}`);
  }

  console.log(`- Valor potencial de venta: $${baseResult.totalPotentialRevenue.toLocaleString("es-CO")}`);
  if (baseResult.totalPotentialRevenue !== 5086250) {
    throw new Error(`Fallo Test 1: Venta potencial debe ser $5.086.250, dio $${baseResult.totalPotentialRevenue}`);
  }

  console.log(`- Margen bruto (utilidad potencial): $${baseResult.grossProfit.toLocaleString("es-CO")}`);
  if (baseResult.grossProfit !== 1172250) {
    throw new Error(`Fallo Test 1: Margen bruto debe ser $1.172.250, dio $${baseResult.grossProfit}`);
  }

  console.log(`- Margen sobre ventas: ${baseResult.marginOnSalesPercent}% (Esperado ~23.05%)`);
  if (Math.abs(baseResult.marginOnSalesPercent - 23.05) > 0.05) {
    throw new Error(`Fallo Test 1: Margen sobre ventas debe ser 23.05%, dio ${baseResult.marginOnSalesPercent}%`);
  }

  console.log(`- Margen sobre costo (Markup): ${baseResult.marginOnCostPercent}% (Esperado ~29.95%)`);
  if (Math.abs(baseResult.marginOnCostPercent - 29.95) > 0.05) {
    throw new Error(`Fallo Test 1: Margen sobre costo debe ser 29.95%, dio ${baseResult.marginOnCostPercent}%`);
  }
  console.log("✓ TEST 1 PASADO: Todos los valores del caso de referencia coinciden al centavo y al decimal.\n");

  // TEST 2: Costeo Proporcional por Valor Comercial (Relative Sales Value)
  console.log("TEST 2: Verificación de Distribución Proporcional de Costos");
  const sumAttributedCosts = baseResult.cuts.reduce((s, c) => s + c.costAttributed, 0);
  console.log(`- Suma de costos asignados a los cortes: $${sumAttributedCosts.toLocaleString("es-CO")}`);
  console.log(`- Costo total del animal a absorber: $${baseResult.totalAnimalCost.toLocaleString("es-CO")}`);
  if (Math.abs(sumAttributedCosts - baseResult.totalAnimalCost) > 10) {
    throw new Error(`Fallo Test 2: La suma de costos asignados (${sumAttributedCosts}) no iguala al costo del animal (${baseResult.totalAnimalCost})`);
  }

  const lomoFino = baseResult.cuts.find((c) => c.productName === "Lomo fino");
  if (!lomoFino) throw new Error("Fallo Test 2: No se encontró Lomo fino");
  console.log(`- Lomo fino (13 kg @ $37.000 = $481.000):`);
  console.log(`  * Participación en venta: ${lomoFino.valueSharePercent}%`);
  console.log(`  * Costo atribuido total: $${lomoFino.costAttributed.toLocaleString("es-CO")}`);
  console.log(`  * Costo atribuido por kg: $${lomoFino.costAttributedPerKg.toLocaleString("es-CO")}/kg`);
  console.log(`  * Margen por kg: $${(lomoFino.actualSellPrice - lomoFino.costAttributedPerKg).toLocaleString("es-CO")}/kg`);
  console.log(`  * Precio recomendado (30% margen): $${lomoFino.recommendedPrice.toLocaleString("es-CO")}`);
  console.log(`  * Estado rentabilidad: ${lomoFino.profitabilityStatus}`);
  console.log("✓ TEST 2 PASADO: El costeo proporcional absorbe exactamente el 100% del costo del animal.\n");

  // TEST 3: Incorporación de Costos Adicionales
  console.log("TEST 3: Incorporación de Costos Adicionales (Transporte, Sacrificio, Desposte)");
  const withAdditional = calculateAnimalDeboning(
    REFERENCE_CATTLE_FIXTURE.liveWeightKg,
    REFERENCE_CATTLE_FIXTURE.pricePerKgLive,
    REFERENCE_CATTLE_FIXTURE.additionalCosts,
    REFERENCE_CATTLE_FIXTURE.cuts.map((c, i) => ({
      id: `cut-${i}`,
      productName: c.name,
      classification: c.classification,
      weightKg: c.weightKg,
      actualSellPrice: c.sellPrice,
    })),
    30
  );

  console.log(`- Costo adquisición: $${withAdditional.acquisitionCost.toLocaleString("es-CO")}`);
  console.log(`- Costos adicionales: $${withAdditional.totalAdditionalCosts.toLocaleString("es-CO")}`);
  console.log(`- Costo total del animal/lote: $${withAdditional.totalAnimalCost.toLocaleString("es-CO")}`);
  if (withAdditional.totalAdditionalCosts !== 350000) {
    throw new Error(`Fallo Test 3: Total costos adicionales debe ser $350.000, dio $${withAdditional.totalAdditionalCosts}`);
  }
  if (withAdditional.totalAnimalCost !== 4264000) {
    throw new Error(`Fallo Test 3: Costo total debe ser $4.264.000, dio $${withAdditional.totalAnimalCost}`);
  }

  console.log(`- Margen bruto con adicionales: $${withAdditional.grossProfit.toLocaleString("es-CO")} (Esperado $822.250)`);
  if (withAdditional.grossProfit !== 822250) {
    throw new Error(`Fallo Test 3: Margen bruto debe ser $822.250, dio $${withAdditional.grossProfit}`);
  }
  console.log("✓ TEST 3 PASADO: Costo total recuperable incluye costos adicionales y recalcula márgenes.\n");

  // TEST 4: Cotizador "¿Cuánto puedo pagar por este animal?" (Precio Máximo de Compra)
  console.log("TEST 4: Calculadora de Precio Máximo de Compra en Pie");
  const maxPurchase = calculateMaxPurchasePrice({
    liveWeightKg: 515,
    expectedYieldPercent: 55.0,
    customExpectedRevenue: 5086250, // Facturación esperada del lote
    estimatedAdditionalCosts: 350000,
    targetMarginPercent: 20, // Queremos asegurar mínimo 20% de margen
  });

  console.log(`- Venta esperada: $${maxPurchase.expectedRevenue.toLocaleString("es-CO")}`);
  console.log(`- Costo total permitido (para 20% margen): $${maxPurchase.maxTotalAllowedCost.toLocaleString("es-CO")}`);
  console.log(`- Costos adicionales presupuestados: $${maxPurchase.estimatedAdditionalCosts.toLocaleString("es-CO")}`);
  console.log(`- Costo de compra animal máximo: $${maxPurchase.maxAcquisitionCost.toLocaleString("es-CO")}`);
  console.log(`- Precio máximo por kg en pie exacto: $${maxPurchase.maxPricePerKgLive}/kg`);
  console.log(`- Precio sugerido redondeado: $${maxPurchase.maxPricePerKgLiveRounded}/kg`);
  console.log(`- Mensaje asesor: "${maxPurchase.adviceMessage}"`);

  // Verificación matemática:
  // 5.086.250 * 0.80 = 4.069.000
  // 4.069.000 - 350.000 = 3.719.000
  // 3.719.000 / 515 = 7.221,35 -> redondeado $7.200
  if (maxPurchase.maxTotalAllowedCost !== 4069000) {
    throw new Error(`Fallo Test 4: Costo total permitido debe ser $4.069.000, dio $${maxPurchase.maxTotalAllowedCost}`);
  }
  if (maxPurchase.maxAcquisitionCost !== 3719000) {
    throw new Error(`Fallo Test 4: Costo adquisición máx debe ser $3.719.000, dio $${maxPurchase.maxAcquisitionCost}`);
  }
  if (maxPurchase.maxPricePerKgLiveRounded !== 7200) {
    throw new Error(`Fallo Test 4: Precio redondeado debe ser $7.200, dio $${maxPurchase.maxPricePerKgLiveRounded}`);
  }
  console.log("✓ TEST 4 PASADO: La herramienta de cotización protege el margen objetivo antes de comprar.\n");

  // TEST 5: Simulación de Escenarios
  console.log("TEST 5: Generación de Escenarios (Conservador, Actual, Optimista)");
  const scenarios = generatePurchaseScenarios(515, 55, 18000, 350000, 20);
  console.log(`- Escenarios generados: ${scenarios.length}`);
  for (const s of scenarios) {
    console.log(`  * [${s.scenarioName}]: Rendimiento ${s.yieldPercent}%, Precio Tope: $${s.maxPricePerKgLive}/kg, Venta: $${s.projectedRevenue.toLocaleString("es-CO")}`);
  }
  if (scenarios.length !== 3) throw new Error("Fallo Test 5: Deben generarse 3 escenarios");
  if (scenarios[0].maxPricePerKgLive >= scenarios[2].maxPricePerKgLive) {
    throw new Error("Fallo Test 5: Escenario conservador debe tener menor precio tope que el optimista");
  }
  console.log("✓ TEST 5 PASADO: Escenarios calculados coherentemente.\n");

  // TEST 6: Aprendizaje Estadístico de Rendimiento
  console.log("TEST 6: Motor Estadístico de Rendimiento Histórico");
  const stats = computeHistoricalYieldStats([
    {
      liveWeightKg: 515,
      totalSellableWeightKg: 283.25,
      totalAnimalCost: 3914000,
      totalPotentialRevenue: 5086250,
      grossProfit: 1172250,
      cuts: REFERENCE_CATTLE_FIXTURE.cuts.map((c) => ({
        productName: c.name,
        classification: c.classification,
        weightKg: c.weightKg,
        actualSellPrice: c.sellPrice,
      })),
    },
  ]);

  console.log(`- Animales en historial: ${stats.totalAnimalsRecorded}`);
  console.log(`- Rendimiento promedio histórico: ${stats.averageYieldPercent}%`);
  const lomoBench = stats.cutBenchmarks.find((b) => b.productName === "Lomo fino");
  if (!lomoBench) throw new Error("Fallo Test 6: Benchmark de Lomo fino no encontrado");
  console.log(`- Benchmark Lomo fino: ${lomoBench.averagePercentageOfLiveWeight}% del peso en pie`);

  // Si viene un nuevo animal de 520 kg:
  const newLiveWeight = 520;
  const estimatedLomoWeight = Number((newLiveWeight * (lomoBench.averagePercentageOfLiveWeight / 100)).toFixed(2));
  console.log(`- Estimación para nuevo animal de 520 kg: ${estimatedLomoWeight} kg de Lomo fino`);
  if (estimatedLomoWeight < 12.0 || estimatedLomoWeight > 14.0) {
    throw new Error(`Fallo Test 6: Estimación de Lomo fino fuera de rango esperado: ${estimatedLomoWeight} kg`);
  }
  console.log("✓ TEST 6 PASADO: El sistema proyecta cortes esperados a partir del historial real.\n");

  // TEST 7: Filtrado Exclusivo de Cortes de Carne (Sin Ají, Tomate, Verduras ni Abarrotes)
  console.log("TEST 7: Filtrado Exclusivo de Cortes Cárnicos");
  const testSample = [
    { name: "Lomo Fino de Res", isMeatCut: true, category: { type: "CARNICERIA", slug: "carnes-res" } },
    { name: "Punta de Anca", isMeatCut: true, category: { type: "CARNICERIA", slug: "carnes-res" } },
    { name: "Costilla de Cerdo", isMeatCut: false, category: { type: "CARNICERIA", slug: "cortes-cerdo" } },
    { name: "Pechuga de Pollo", isMeatCut: false, category: { type: "CARNICERIA", slug: "pollos-aves" } },
    { name: "Tomate Chonto Maduro", isMeatCut: false, category: { type: "LEGUMBRERIA", slug: "legumbres-verduras" } },
    { name: "Ají", isMeatCut: false, category: { type: "ABARROTES", slug: "abarrotes-carbon" } },
    { name: "Cebolla Cabezona Blanca", isMeatCut: false, category: { type: "LEGUMBRERIA", slug: "legumbres-verduras" } },
    { name: "Plátano Hartón Verde", isMeatCut: false, category: { type: "LEGUMBRERIA", slug: "legumbres-verduras" } },
    { name: "Aceite Kairos 3000ml", isMeatCut: false, category: { type: "ABARROTES", slug: "abarrotes-carbon" } },
    { name: "Salsa de tomate", isMeatCut: false, category: { type: "ABARROTES", slug: "abarrotes-carbon" } },
  ];

  const allowed = testSample.filter(isMeatProduct);
  const forbidden = testSample.filter((p) => !isMeatProduct(p));

  console.log(`- Total productos muestra: ${testSample.length}`);
  console.log(`- Cortes cárnicos permitidos: ${allowed.map((p) => p.name).join(", ")}`);
  console.log(`- Excluidos con éxito: ${forbidden.map((p) => p.name).join(", ")}`);

  if (allowed.some((p) => p.name.includes("Tomate") || p.name.includes("Ají") || p.name.includes("Aceite"))) {
    throw new Error("Fallo Test 7: Un producto no cárnico pasó el filtro!");
  }
  if (allowed.length !== 4) {
    throw new Error(`Fallo Test 7: Deben ser 4 cortes de carne, dio ${allowed.length}`);
  }
  console.log("✓ TEST 7 PASADO: El selector solo permite cortes de carne, excluyendo 100% de legumbres y abarrotes.\n");

  console.log("================================================================================");
  console.log(" ¡TODAS LAS PRUEBAS MATEMÁTICAS Y DE REGLAS DE NEGOCIO PASARON CON ÉXITO!       ");
  console.log("================================================================================");
}

runCattleTests();
