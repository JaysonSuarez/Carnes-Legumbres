import { supabase, genId } from "../src/lib/supabase";

interface InvoiceProduct {
  name: string;
  code: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  currentStock: number;
  minStock: number;
  categoryId: string;
  estimatedWastePercent: number;
  targetMarginPercent: number;
  invoiceSource: string;
}

const invoiceProducts: InvoiceProduct[] = [
  // Factura 1: Distrilácteos Pipe (Remisión No. 36895645)
  {
    name: "Kipe Colanta 50g",
    code: "7702129040266",
    unit: "unidad",
    costPrice: 1225,
    sellPrice: 1750,
    currentStock: 12,
    minStock: 5,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Distrilácteos Pipe (36895645)",
  },
  {
    name: "Gelatina Surtida x 4 uds",
    code: "7702129061179",
    unit: "paquete",
    costPrice: 5074,
    sellPrice: 7250,
    currentStock: 2,
    minStock: 2,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Distrilácteos Pipe (36895645)",
  },
  {
    name: "Néctar Manzana 300ml",
    code: "770212908608N0",
    unit: "unidad",
    costPrice: 2599,
    sellPrice: 3750,
    currentStock: 10,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Distrilácteos Pipe (36895645)",
  },

  // Factura 2: Plásticos y Desechables AAA (Factura FE 172034)
  {
    name: "Bolsas 50K Paca (Bolsa Blanca)",
    code: "8955",
    unit: "paca",
    costPrice: 85000,
    sellPrice: 121500,
    currentStock: 1,
    minStock: 1,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Plásticos AAA (FE 172034)",
  },

  // Factura 3: Frito Lay (Factura UBER69721)
  {
    name: "Margarita Pollo 36g",
    code: "56564",
    unit: "unidad",
    costPrice: 1983,
    sellPrice: 2850,
    currentStock: 4,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
  {
    name: "Margarita Limón 36g",
    code: "56642",
    unit: "unidad",
    costPrice: 1983,
    sellPrice: 2850,
    currentStock: 6,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
  {
    name: "Cheetos Boli Queso 34g",
    code: "57168",
    unit: "unidad",
    costPrice: 1552,
    sellPrice: 2250,
    currentStock: 6,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
  {
    name: "DeTodito Mix 50g",
    code: "57318",
    unit: "unidad",
    costPrice: 2413,
    sellPrice: 3450,
    currentStock: 5,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
  {
    name: "DeTodito Natural 50g",
    code: "57322",
    unit: "unidad",
    costPrice: 2413,
    sellPrice: 3450,
    currentStock: 5,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
  {
    name: "DeTodito Limón 50g",
    code: "57323",
    unit: "unidad",
    costPrice: 2413,
    sellPrice: 3450,
    currentStock: 5,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
  {
    name: "Maní Moto Limón 42g",
    code: "61014",
    unit: "unidad",
    costPrice: 1393,
    sellPrice: 2000,
    currentStock: 6,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
  {
    name: "Cheese Tris 48g",
    code: "66181",
    unit: "unidad",
    costPrice: 1552,
    sellPrice: 2250,
    currentStock: 6,
    minStock: 4,
    categoryId: "cmtq8g9ig0003vao8qlo1jgxj",
    estimatedWastePercent: 0,
    targetMarginPercent: 30,
    invoiceSource: "Frito Lay (UBER69721)",
  },
];

async function run() {
  const tenantId = "andres";

  // 1. Limpiar producto de prueba si existe
  const { error: delErr } = await supabase
    .from("cl_products")
    .delete()
    .ilike("id", "test_kipe_%");
  if (delErr) {
    console.warn("Advertencia limpiando producto test:", delErr);
  }

  const results: any[] = [];

  for (const item of invoiceProducts) {
    // Buscar si ya existe por código de barras o por nombre exacto en el tenant
    let existing: any = null;

    if (item.code) {
      const { data: byCode } = await supabase
        .from("cl_products")
        .select("id, name, code, currentStock")
        .eq("tenantId", tenantId)
        .eq("code", item.code)
        .limit(1);

      if (byCode && byCode.length > 0) {
        existing = byCode[0];
      }
    }

    if (!existing) {
      const { data: byName } = await supabase
        .from("cl_products")
        .select("id, name, code, currentStock")
        .eq("tenantId", tenantId)
        .ilike("name", item.name.trim())
        .limit(1);

      if (byName && byName.length > 0) {
        existing = byName[0];
      }
    }

    if (existing) {
      // Actualizar producto
      const { error: updErr } = await supabase
        .from("cl_products")
        .update({
          name: item.name,
          code: item.code,
          unit: item.unit,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          currentStock: item.currentStock,
          minStock: item.minStock,
          categoryId: item.categoryId,
          estimatedWastePercent: item.estimatedWastePercent,
          targetMarginPercent: item.targetMarginPercent,
          isMeatCut: false,
          isActive: true,
          classification: "COMERCIALIZABLE",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updErr) {
        console.error(`Error actualizando ${item.name}:`, updErr);
      } else {
        results.push({
          ID: existing.id,
          Nombre: item.name,
          Código: item.code,
          Unidad: item.unit,
          Costo: `$${item.costPrice.toLocaleString()}`,
          Venta: `$${item.sellPrice.toLocaleString()}`,
          Stock: item.currentStock,
          Acción: "ACTUALIZADO",
          Factura: item.invoiceSource,
        });
      }
    } else {
      // Crear producto
      const id = genId("prod");
      const { error: insErr } = await supabase
        .from("cl_products")
        .insert({
          id,
          name: item.name,
          code: item.code,
          unit: item.unit,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          currentStock: item.currentStock,
          minStock: item.minStock,
          categoryId: item.categoryId,
          estimatedWastePercent: item.estimatedWastePercent,
          targetMarginPercent: item.targetMarginPercent,
          isMeatCut: false,
          isActive: true,
          classification: "COMERCIALIZABLE",
          tenantId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (insErr) {
        console.error(`Error creando ${item.name}:`, insErr);
      } else {
        results.push({
          ID: id,
          Nombre: item.name,
          Código: item.code,
          Unidad: item.unit,
          Costo: `$${item.costPrice.toLocaleString()}`,
          Venta: `$${item.sellPrice.toLocaleString()}`,
          Stock: item.currentStock,
          Acción: "CREADO",
          Factura: item.invoiceSource,
        });
      }
    }
  }

  console.log("\n==========================================================================");
  console.log(` RESULTADOS: ${results.length} de ${invoiceProducts.length} productos procesados correctamente.`);
  console.log("==========================================================================\n");
  console.table(results);
}

run().catch(console.error);
