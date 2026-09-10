import { supabase, genId } from "../src/lib/supabase";

interface NewProductItem {
  name: string;
  unit: string;
  stock: number;
  categoryId: string;
  minStock: number;
  estimatedWastePercent?: number;
}

const productsToInsert: NewProductItem[] = [
  // Gaseosas grandes
  { name: "Coca-Cola 1.5L", unit: "unidad", stock: 12, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 3 },
  { name: "Cuatro 1.5L", unit: "unidad", stock: 1, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 2 },
  { name: "Kola Román 1.5L", unit: "unidad", stock: 2, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 2 },

  // Gaseosas personales / vidrio / plástico
  { name: "Kola Román Vidrio 237ml", unit: "unidad", stock: 6, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 6 },
  { name: "Soda Bretaña", unit: "unidad", stock: 22, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 5 },
  { name: "Coca-Cola Vidrio 237ml", unit: "unidad", stock: 25, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 6 },
  { name: "Coca-Cola 400ml", unit: "unidad", stock: 16, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 5 },
  { name: "Kola Román 400ml Plástico", unit: "unidad", stock: 9, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Gaseosa Cuatro Unidad", unit: "unidad", stock: 1, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 2 },
  { name: "Jugo Del Valle 400ml", unit: "unidad", stock: 9, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Pony Malta 330ml", unit: "unidad", stock: 34, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 6 },
  { name: "Pony Malta 200ml", unit: "unidad", stock: 2, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Gaseosa Cuatro 250ml", unit: "unidad", stock: 13, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Gaseosa Coca-Cola 250ml", unit: "unidad", stock: 14, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Gaseosa Cuatro 400ml", unit: "unidad", stock: 9, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Sprite 400ml", unit: "unidad", stock: 6, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 3 },
  { name: "Kola Román 250ml", unit: "unidad", stock: 12, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },

  // Tampicos
  { name: "Tampico 330ml", unit: "unidad", stock: 4, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Tampico 240ml", unit: "unidad", stock: 5, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Tampico 150ml", unit: "unidad", stock: 6, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },

  // Lácteos y Avena
  { name: "Leche en Bolsa 400ml", unit: "bolsa", stock: 23, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 5 },
  { name: "Leche en Bolsa 200ml", unit: "bolsa", stock: 28, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 5 },
  { name: "Leche en Bolsa 1L", unit: "bolsa", stock: 10, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 5 },
  { name: "Avena en Bolsa 200ml", unit: "bolsa", stock: 6, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 3 },

  // Hidratantes y Energizantes
  { name: "Speed Max", unit: "unidad", stock: 31, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 6 },
  { name: "Gatorade 500ml", unit: "unidad", stock: 8, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 4 },
  { name: "Suero Oral", unit: "unidad", stock: 3, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 3 },
  { name: "Electrolitos", unit: "unidad", stock: 2, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 2 },
  { name: "Agua 600ml", unit: "unidad", stock: 21, categoryId: "cmtq8g9ig0003vao8qlo1jgxj", minStock: 6 },

  // Frutas (Legumbres y Verduras)
  { name: "Manzanas Rojas", unit: "unidad", stock: 19, categoryId: "cmtq8g9gi0002vao88hfiudnb", minStock: 5, estimatedWastePercent: 5 },
  { name: "Manzanas Verdes", unit: "unidad", stock: 45, categoryId: "cmtq8g9gi0002vao88hfiudnb", minStock: 5, estimatedWastePercent: 5 },
];

async function insertProducts() {
  console.log(`Iniciando inserción de ${productsToInsert.length} productos al inventario...`);

  const results: { name: string; action: string; stock: number; id: string }[] = [];

  for (const item of productsToInsert) {
    // Buscar si ya existe por nombre exacto (case insensitive)
    const { data: existing, error: searchErr } = await supabase
      .from("cl_products")
      .select("id, name, currentStock")
      .ilike("name", item.name.trim())
      .limit(1);

    if (searchErr) {
      console.error(`Error buscando "${item.name}":`, searchErr);
      continue;
    }

    if (existing && existing.length > 0) {
      // Si ya existe, actualizar stock
      const prod = existing[0];
      const newStock = Number(item.stock);
      const { error: updateErr } = await supabase
        .from("cl_products")
        .update({
          currentStock: newStock,
          unit: item.unit,
          categoryId: item.categoryId,
          minStock: item.minStock,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", prod.id);

      if (updateErr) {
        console.error(`Error actualizando "${item.name}":`, updateErr);
      } else {
        results.push({ name: item.name, action: "ACTUALIZADO", stock: newStock, id: prod.id });
      }
    } else {
      // Si no existe, crear producto nuevo
      const id = genId("prod");
      const { error: insertErr } = await supabase
        .from("cl_products")
        .insert({
          id,
          name: item.name.trim(),
          categoryId: item.categoryId,
          unit: item.unit,
          costPrice: 0,
          sellPrice: 0,
          currentStock: Number(item.stock),
          minStock: item.minStock,
          estimatedWastePercent: item.estimatedWastePercent ?? 0,
          targetMarginPercent: 30,
          isMeatCut: false,
          isActive: true,
          classification: "COMERCIALIZABLE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (insertErr) {
        console.error(`Error insertando "${item.name}":`, insertErr);
      } else {
        results.push({ name: item.name, action: "CREADO", stock: Number(item.stock), id });
      }
    }
  }

  console.log("\n========================================================");
  console.log(` RESULTADO: ${results.length} de ${productsToInsert.length} productos procesados con éxito.`);
  console.log("========================================================\n");
  console.table(results);
}

insertProducts().catch(console.error);
