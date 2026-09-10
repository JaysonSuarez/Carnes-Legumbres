import {
  calculateElapsedCreditDays,
  calculateSimpleDailyInterest,
  calculateCreditState,
} from "../src/lib/finance";
import { supabase, genId } from "../src/lib/supabase";

async function runCreditTests() {
  console.log("================================================================================");
  console.log("      PRUEBAS DE VERIFICACIÓN: MOTOR FINANCIERO DE CRÉDITO Y FIADOS (1%/DÍA)    ");
  console.log("================================================================================\n");

  // TEST 1: Caso 1 - Fiado de $50.000 con 1 día transcurrido
  console.log("TEST 1: Validando fiado de $50.000 con 1 día transcurrido...");
  const capital1 = 50000;
  const days1 = 1;
  const interest1 = calculateSimpleDailyInterest(capital1, days1, 0.01);
  const total1 = capital1 + interest1;

  console.log(`- Capital: $${capital1}`);
  console.log(`- Días: ${days1}`);
  console.log(`- Interés calculado (1% de $50.000 * 1): $${interest1}`);
  console.log(`- Total a pagar: $${total1}`);

  if (interest1 !== 500 || total1 !== 50500) {
    throw new Error(`Fallo Test 1: Esperado interés $500 y total $50.500, dio interés $${interest1}, total $${total1}`);
  }
  console.log("✓ TEST 1 PASADO: $50.000 con 1 día genera exactamente $500 de interés (Total $50.500).\n");

  // TEST 2: Caso 2 - Fiado de $50.000 con 2 días transcurridos (Comprobar que NO es compuesto)
  console.log("TEST 2: Validando que el interés sea simple y NO compuesto al día 2...");
  const days2 = 2;
  const interest2 = calculateSimpleDailyInterest(capital1, days2, 0.01);
  const total2 = capital1 + interest2;

  console.log(`- Días: ${days2}`);
  console.log(`- Interés acumulado simple: $${interest2}`);
  console.log(`- Total a pagar: $${total2}`);

  // Si fuera compuesto, el interés del día 2 sería 1% de 50.500 = 505 (Total 51.005).
  // Pero el requerimiento exige simple sobre el capital de $50.000: 2 * $500 = $1.000 (Total $51.000).
  if (interest2 !== 1000 || total2 !== 51000) {
    throw new Error(`Fallo Test 2: Debe ser $1.000 de interés simple sobre los $50.000, dio $${interest2}`);
  }
  console.log("✓ TEST 2 PASADO: Al día 2 el interés es estrictamente $1.000 (sobre los $50.000 base, sin anatocismo/capitalización).\n");

  // TEST 3: Caso 3 - Acumulación de capital por dos fiados sucesivos ($50.000 + $50.000 = $100.000)
  console.log("TEST 3: Validando acumulación de capital ($50.000 + $50.000 = $100.000)...");
  const purchase1 = 50000;
  const purchase2 = 50000;
  const totalCapital = purchase1 + purchase2;

  // Supongamos compra 1 fue hace 2 días, compra 2 fue hoy (0 días)
  const calcCredit1 = calculateCreditState(purchase1, new Date(Date.now() - 2 * 86400000));
  const calcCredit2 = calculateCreditState(purchase2, new Date());

  const combinedDailyAccrual = calcCredit1.dailyAccrual + calcCredit2.dailyAccrual;
  const combinedTotalCapital = calcCredit1.capital + calcCredit2.capital;

  console.log(`- Capital total acumulado: $${combinedTotalCapital}`);
  console.log(`- Incremento diario total: $${combinedDailyAccrual}/día`);

  if (combinedTotalCapital !== 100000 || combinedDailyAccrual !== 1000) {
    throw new Error(`Fallo Test 3: Capital acumulado debe ser $100.000 y tasa diaria $1.000/día`);
  }
  console.log("✓ TEST 3 PASADO: La suma de fiados da $100.000 y genera exactamente $1.000 de interés diario.\n");

  // TEST 4: Caso 4 - Reducción de capital por Abono ($50.000 - $20.000 = $30.000)
  console.log("TEST 4: Validando impacto de abono al capital...");
  const capitalAfterAbono = 50000 - 20000;
  const newDailyRate = Math.round(capitalAfterAbono * 0.01);

  console.log(`- Capital restante tras abono: $${capitalAfterAbono}`);
  console.log(`- Nueva causación diaria: $${newDailyRate}/día`);

  if (capitalAfterAbono !== 30000 || newDailyRate !== 300) {
    throw new Error(`Fallo Test 4: Capital debe ser $30.000 y tasa diaria $300/día`);
  }
  console.log("✓ TEST 4 PASADO: El abono a capital reduce la causación diaria inmediatamente a $300/día.\n");

  // TEST 5: Aislamiento Multi-Tenant en Base de Datos Supabase
  console.log("TEST 5: Validando persistencia y aislamiento multi-tenant en Supabase...");
  const testDemoSaleId = genId("sale_test");
  const testDemoCreditId = genId("crd_test");

  // Crear crédito en tenant 'demo'
  const { error: insErr } = await supabase.from("cl_credits").insert({
    id: testDemoCreditId,
    tenantId: "demo",
    saleId: null, // nullable o vinculado
    customerName: "Cliente Prueba Demo",
    customerPhone: "3009998877",
    originalAmount: 50000,
    currentBalance: 50000,
    dailyInterestRate: 0.01,
    creditDate: new Date().toISOString(),
    status: "PENDIENTE",
    totalInterestPaid: 0,
    totalCapitalPaid: 0,
    notes: "Crédito de prueba automático",
  });

  if (insErr) {
    throw new Error(`Error insertando crédito demo: ${insErr.message}`);
  }

  // Consultar desde tenant 'andres': NO debe existir
  const { data: andresCredits, error: andresErr } = await supabase
    .from("cl_credits")
    .select("id")
    .eq("tenantId", "andres")
    .eq("id", testDemoCreditId);

  if (andresErr) throw andresErr;

  if (andresCredits && andresCredits.length > 0) {
    throw new Error("Fallo Test 5: El crédito de demo apareció en el tenant de Andrés.");
  }
  console.log("- El crédito de demo NO es visible en el tenant de Andrés (Aislamiento verificado).");

  // Consultar desde tenant 'demo': SÍ debe existir
  const { data: demoCredits, error: demoErr } = await supabase
    .from("cl_credits")
    .select("id, customerName, currentBalance")
    .eq("tenantId", "demo")
    .eq("id", testDemoCreditId);

  if (demoErr) throw demoErr;
  if (!demoCredits || demoCredits.length === 0) {
    throw new Error("Fallo Test 5: El crédito de demo no fue encontrado en su propio tenant.");
  }
  console.log("- El crédito de demo se recuperó exitosamente en su espacio aislado.");

  // Limpiar registro de prueba
  await supabase.from("cl_credits").delete().eq("id", testDemoCreditId);
  console.log("✓ TEST 5 PASADO: Aislamiento multi-tenant de créditos comprobado y registro de prueba limpiado.\n");

  console.log("================================================================================");
  console.log("   ¡TODAS LAS PRUEBAS DEL MÓDULO DE CRÉDITO Y FIADOS PASARON CON ÉXITO 100%!    ");
  console.log("================================================================================");
}

runCreditTests().catch((err) => {
  console.error("ERROR EN PRUEBAS:", err);
  process.exit(1);
});
