import {
  calculateRealMargin,
  calculateMarkup,
  calculatePriceForTargetMargin,
  compareMarkupVsRealMargin,
  calculateBatchMetrics,
  calculateDespensaPrice,
} from "../src/lib/finance";

function runTests() {
  console.log("=== INICIANDO PRUEBAS DE VALIDACIÓN MATEMÁTICA Y DE NEGOCIO ===\n");

  // TEST 1: Fórmula de Margen Real vs Markup Tradicional
  console.log("TEST 1: Validación de Margen Real vs Markup");
  const cost = 10000;
  const targetMargin = 30; // 30%
  const comparison = compareMarkupVsRealMargin(cost, targetMargin, 0);

  console.log(`- Costo Base: $${cost}`);
  console.log(`- Precio con Markup 30%: $${comparison.markupPrice}`);
  console.log(`  -> Margen Real Obtenido con Markup: ${comparison.markupRealMargin}% (Debería ser 23.08%)`);
  if (Math.abs(comparison.markupRealMargin - 23.08) > 0.05) {
    throw new Error(`Fallo en Test 1: Markup no generó 23.08%, dio ${comparison.markupRealMargin}%`);
  }

  console.log(`- Precio con Margen Real 30%: $${comparison.realMarginPrice}`);
  console.log(`  -> Margen Real Obtenido con fórmula correcta: ${comparison.realMarginAchieved}%`);
  if (Math.abs(comparison.realMarginAchieved - 30.0) > 0.05) {
    throw new Error(`Fallo en Test 1: Margen real no alcanzó 30%, dio ${comparison.realMarginAchieved}%`);
  }
  console.log(`- Dinero protegido por cada unidad vendida: $${comparison.moneyLostPerUnit}`);
  console.log("✓ TEST 1 PASADO: El sistema distingue correctamente Markup de Margen Real.\n");

  // TEST 2: Corrección por Merma (Legumbres y Desposte)
  console.log("TEST 2: Compensación por Merma en Legumbres (Ej. 10% merma)");
  const produceCost = 2000; // $2.000 / kg
  const wastePercent = 10; // 10% se pierde en deshidratación y limpieza
  const priceWithWaste = calculatePriceForTargetMargin(produceCost, 30, wastePercent);
  
  // Si compras 100 kg a $2.000 = $200.000 costo total.
  // Te quedan 90 kg vendibles.
  // Venta total esperada = 90 kg * priceWithWaste
  const totalBoughtKg = 100;
  const totalSellableKg = totalBoughtKg * (1 - wastePercent / 100);
  const totalCostBatch = totalBoughtKg * produceCost;
  const totalRevenueBatch = totalSellableKg * priceWithWaste;
  const realBatchMargin = calculateRealMargin(totalCostBatch, totalRevenueBatch);

  console.log(`- Costo por kg comprado: $${produceCost}`);
  console.log(`- Precio de venta ajustado por merma (10%) para ganar 30%: $${priceWithWaste}`);
  console.log(`- Margen Real resultante sobre el lote completo: ${realBatchMargin}%`);
  if (realBatchMargin < 29.8) {
    throw new Error(`Fallo en Test 2: El margen con merma cayó a ${realBatchMargin}%`);
  }
  console.log("✓ TEST 2 PASADO: El precio compensa exactamente la merma física.\n");

  // TEST 3: Simulador de Desposte y Pedido de Carnes Mixto
  console.log("TEST 3: Pedido de Carnes con Distintos Cortes (Lote Mayorista)");
  const wholesaleCost = 2400000; // $2.400.000 gastados en el pedido
  const cuts = [
    { id: "1", name: "Lomo Fino", weightKg: 12.0, sellPrice: 42000, wasteKg: 0.5 },
    { id: "2", name: "Punta de Anca", weightKg: 16.0, sellPrice: 36000, wasteKg: 0.8 },
    { id: "3", name: "Churrasco", weightKg: 20.0, sellPrice: 33000, wasteKg: 1.0 },
    { id: "4", name: "Costilla", weightKg: 30.0, sellPrice: 21500, wasteKg: 2.5 },
    { id: "5", name: "Sobrebarriga", weightKg: 18.0, sellPrice: 25000, wasteKg: 1.2 },
    { id: "6", name: "Molida Especial", weightKg: 25.0, sellPrice: 22500, wasteKg: 0.5 },
    { id: "7", name: "Osobuco", weightKg: 14.0, sellPrice: 17000, wasteKg: 1.5 },
    { id: "8", name: "Hueso Carnudo", weightKg: 20.0, sellPrice: 6500, wasteKg: 0.0 },
  ];

  const batchResult = calculateBatchMetrics(wholesaleCost, cuts, 30);
  console.log(`- Gasto total del pedido: $${batchResult.totalCost.toLocaleString()}`);
  console.log(`- Kilos vendibles: ${batchResult.totalSellableWeightKg} kg (Merma total: ${batchResult.totalWasteKg} kg)`);
  console.log(`- Facturación proyectada del pedido: $${batchResult.projectedRevenue.toLocaleString()}`);
  console.log(`- Utilidad real proyectada: $${batchResult.projectedProfit.toLocaleString()}`);
  console.log(`- Margen Real Global del Pedido: ${batchResult.realMarginPercent}%`);
  console.log(`- ¿Cumple meta de >= 30%?: ${batchResult.isMarginSatisfied ? "SÍ (Aprobado)" : "NO"}`);

  if (!batchResult.isMarginSatisfied || batchResult.realMarginPercent < 30.0) {
    throw new Error(`Fallo en Test 3: El lote no alcanzó el margen objetivo del 30%`);
  }
  console.log("✓ TEST 3 PASADO: La ponderación de cortes garantiza la rentabilidad global del pedido.\n");

  // TEST 4: Módulo Despensa - Fórmula de Venta (Costo / 0.7 cerrado a centenas)
  console.log("TEST 4: Módulo Despensa (Costo / 0.7 redondeado al $100 superior)");
  const sampleCost = 2500; // Caso exacto del usuario: $2.500 el kg de papa
  const despensaPrice = calculateDespensaPrice(sampleCost, 0.3);
  console.log(`- Costo de Compra: $${sampleCost}`);
  console.log(`- Precio de Venta Calculado (2500 / 0.7 = 3571.42 -> $100): $${despensaPrice}`);
  if (despensaPrice !== 3600) {
    throw new Error(`Fallo en Test 4: Se esperaba $3.600 pero dio $${despensaPrice}`);
  }
  const despensaMargin = calculateRealMargin(sampleCost, despensaPrice);
  console.log(`- Margen Real Resultante: ${despensaMargin}% (Debe ser >= 30%)`);
  if (despensaMargin < 30.0) {
    throw new Error(`Fallo en Test 4: Margen inferior al 30%: ${despensaMargin}%`);
  }

  // Verificaciones adicionales
  if (calculateDespensaPrice(1000) !== 1500) throw new Error("1000 / 0.7 debe dar 1500");
  if (calculateDespensaPrice(7000) !== 10000) throw new Error("7000 / 0.7 debe dar 10000");
  if (calculateDespensaPrice(12500) !== 17900) throw new Error("12500 / 0.7 debe dar 17900");
  console.log("✓ TEST 4 PASADO: La fórmula de Despensa cierra exactamente al valor más cercano garantizando >= 30%.\n");

  console.log("===============================================================");
  console.log("¡TODAS LAS PRUEBAS MATEMÁTICAS Y DE REGLAS DE NEGOCIO PASARON!");
  console.log("===============================================================");
}

runTests();
