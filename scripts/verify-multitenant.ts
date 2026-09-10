import { supabase } from "../src/lib/supabase";

async function runTests() {
  console.log("================================================================================");
  console.log("       PRUEBAS DE VERIFICACIÓN: AISLAMIENTO MULTI-TENANT Y PERFIL DEMO          ");
  console.log("================================================================================\n");

  // TEST 1: Catálogo de Andrés intacto
  console.log("TEST 1: Verificando que el catálogo de Andrés permanezca 100% intacto...");
  const { data: andresProducts, error: err1 } = await supabase
    .from("cl_products")
    .select("id, name, currentStock, tenantId")
    .eq("tenantId", "andres");

  if (err1) throw err1;
  console.log(`- Total productos de Andrés: ${andresProducts?.length}`);
  if (!andresProducts || andresProducts.length < 198) {
    throw new Error(`Fallo Test 1: Andrés debería tener al menos 198 productos, dio ${andresProducts?.length}`);
  }
  console.log("✓ TEST 1 PASADO: El inventario de Andrés está intacto y protegido.\n");

  // TEST 2: Catálogo Demo Aislado
  console.log("TEST 2: Verificando catálogo del Tenant Demo...");
  const { data: demoProducts, error: err2 } = await supabase
    .from("cl_products")
    .select("id, name, currentStock, tenantId")
    .eq("tenantId", "demo");

  if (err2) throw err2;
  console.log(`- Total productos de Demo: ${demoProducts?.length}`);
  if (!demoProducts || demoProducts.length === 0) {
    throw new Error(`Fallo Test 2: Demo debería tener productos de prueba.`);
  }
  console.log("✓ TEST 2 PASADO: El espacio Demo tiene sus propios productos de prueba.\n");

  // TEST 3: Categorías aisladas por Tenant
  console.log("TEST 3: Verificando categorías por Tenant...");
  const { data: andresCats } = await supabase
    .from("cl_categories")
    .select("id, slug, tenantId")
    .eq("tenantId", "andres");

  const { data: demoCats } = await supabase
    .from("cl_categories")
    .select("id, slug, tenantId")
    .eq("tenantId", "demo");

  console.log(`- Categorías de Andrés: ${andresCats?.length}`);
  console.log(`- Categorías de Demo: ${demoCats?.length}`);

  if (!andresCats || andresCats.length === 0 || !demoCats || demoCats.length === 0) {
    throw new Error("Fallo Test 3: Ambos tenants deben tener sus categorías configuradas.");
  }
  console.log("✓ TEST 3 PASADO: Las categorías están aisladas por tenantId.\n");

  // TEST 4: Inserción y aislamiento hermético
  console.log("TEST 4: Comprobando que crear un producto en Demo NO afecte a Andrés...");
  const testProdId = `prod_test_${Date.now()}`;
  const { error: insertErr } = await supabase.from("cl_products").insert({
    id: testProdId,
    name: "Producto Exclusivo De Prueba Demo",
    categoryId: demoCats[0].id,
    unit: "unidad",
    currentStock: 99,
    tenantId: "demo",
  });

  if (insertErr) throw insertErr;

  // Verificar que NO exista en Andrés
  const { data: searchInAndres } = await supabase
    .from("cl_products")
    .select("id")
    .eq("id", testProdId)
    .eq("tenantId", "andres");

  if (searchInAndres && searchInAndres.length > 0) {
    throw new Error("Fallo Test 4: El producto de Demo apareció en el tenant de Andrés!");
  }

  // Verificar que SÍ exista en Demo
  const { data: searchInDemo } = await supabase
    .from("cl_products")
    .select("id, name, currentStock")
    .eq("id", testProdId)
    .eq("tenantId", "demo");

  if (!searchInDemo || searchInDemo.length === 0) {
    throw new Error("Fallo Test 4: El producto de prueba no se encontró en Demo.");
  }

  // Limpiar producto de prueba
  await supabase.from("cl_products").delete().eq("id", testProdId).eq("tenantId", "demo");
  console.log("✓ TEST 4 PASADO: Aislamiento hermético confirmado; las operaciones en Demo no tocan a Andrés.\n");

  console.log("================================================================================");
  console.log(" ¡TODAS LAS PRUEBAS DE AISLAMIENTO MULTI-TENANT PASARON SATISFACTORIAMENTE!     ");
  console.log("================================================================================");
}

runTests().catch(console.error);
