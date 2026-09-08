import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando base de datos existente...");
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseBatchItem.deleteMany();
  await prisma.purchaseBatch.deleteMany();
  await prisma.wasteLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  console.log("Creando categorías...");
  const catRes = await prisma.category.create({
    data: {
      name: "Carnes de Res",
      slug: "carnes-res",
      type: "CARNICERIA",
      defaultWastePercentage: 6.0,
      defaultMarginTarget: 30.0,
    },
  });

  const catPollo = await prisma.category.create({
    data: {
      name: "Pollos y Aves",
      slug: "pollos-aves",
      type: "CARNICERIA",
      defaultWastePercentage: 3.0,
      defaultMarginTarget: 30.0,
    },
  });

  const catCerdo = await prisma.category.create({
    data: {
      name: "Cortes de Cerdo",
      slug: "cortes-cerdo",
      type: "CARNICERIA",
      defaultWastePercentage: 4.0,
      defaultMarginTarget: 30.0,
    },
  });

  const catLegumbres = await prisma.category.create({
    data: {
      name: "Legumbres y Verduras",
      slug: "legumbres-verduras",
      type: "LEGUMBRERIA",
      defaultWastePercentage: 8.0,
      defaultMarginTarget: 30.0,
    },
  });

  const catAbarrotes = await prisma.category.create({
    data: {
      name: "Abarrotes y Carbón",
      slug: "abarrotes-carbon",
      type: "ABARROTES",
      defaultWastePercentage: 0.0,
      defaultMarginTarget: 30.0,
    },
  });

  console.log("Creando productos base del catálogo...");
  const lomoFino = await prisma.product.create({
    data: {
      code: "RES-01",
      name: "Lomo Fino de Res",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 28000,
      estimatedWastePercent: 4.0,
      targetMarginPercent: 30.0,
      sellPrice: 42000,
      currentStock: 25.0,
      minStock: 5.0,
      isMeatCut: true,
    },
  });

  const puntaAnca = await prisma.product.create({
    data: {
      code: "RES-02",
      name: "Punta de Anca",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 24000,
      estimatedWastePercent: 5.0,
      targetMarginPercent: 30.0,
      sellPrice: 36000,
      currentStock: 30.0,
      minStock: 6.0,
      isMeatCut: true,
    },
  });

  const churrasco = await prisma.product.create({
    data: {
      code: "RES-03",
      name: "Churrasco / Bife de Chorizo",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 22000,
      estimatedWastePercent: 4.0,
      targetMarginPercent: 30.0,
      sellPrice: 33000,
      currentStock: 35.0,
      minStock: 8.0,
      isMeatCut: true,
    },
  });

  const costillaRes = await prisma.product.create({
    data: {
      code: "RES-04",
      name: "Costilla de Res",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 14000,
      estimatedWastePercent: 8.0,
      targetMarginPercent: 30.0,
      sellPrice: 21500,
      currentStock: 45.0,
      minStock: 10.0,
      isMeatCut: true,
    },
  });

  const faldaSobrebarriga = await prisma.product.create({
    data: {
      code: "RES-05",
      name: "Sobrebarriga / Falda",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 16500,
      estimatedWastePercent: 6.0,
      targetMarginPercent: 30.0,
      sellPrice: 25000,
      currentStock: 28.0,
      minStock: 8.0,
      isMeatCut: true,
    },
  });

  const carneMolida = await prisma.product.create({
    data: {
      code: "RES-06",
      name: "Carne Molida Especial",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 15000,
      estimatedWastePercent: 3.0,
      targetMarginPercent: 30.0,
      sellPrice: 22500,
      currentStock: 40.0,
      minStock: 10.0,
      isMeatCut: true,
    },
  });

  const osobuco = await prisma.product.create({
    data: {
      code: "RES-07",
      name: "Osobuco con Hueso",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 11000,
      estimatedWastePercent: 10.0,
      targetMarginPercent: 30.0,
      sellPrice: 17000,
      currentStock: 20.0,
      minStock: 5.0,
      isMeatCut: true,
    },
  });

  const huesoCarnudo = await prisma.product.create({
    data: {
      code: "RES-08",
      name: "Hueso Carnudo para Sancocho",
      categoryId: catRes.id,
      unit: "kg",
      costPrice: 4000,
      estimatedWastePercent: 0.0,
      targetMarginPercent: 30.0,
      sellPrice: 6500,
      currentStock: 30.0,
      minStock: 8.0,
      isMeatCut: true,
    },
  });

  const pechugaPollo = await prisma.product.create({
    data: {
      code: "POL-01",
      name: "Pechuga de Pollo Fresca",
      categoryId: catPollo.id,
      unit: "kg",
      costPrice: 13000,
      estimatedWastePercent: 3.0,
      targetMarginPercent: 30.0,
      sellPrice: 19500,
      currentStock: 50.0,
      minStock: 15.0,
      isMeatCut: false,
    },
  });

  const costillaCerdo = await prisma.product.create({
    data: {
      code: "CER-01",
      name: "Costilla de Cerdo",
      categoryId: catCerdo.id,
      unit: "kg",
      costPrice: 16000,
      estimatedWastePercent: 5.0,
      targetMarginPercent: 30.0,
      sellPrice: 24000,
      currentStock: 35.0,
      minStock: 10.0,
      isMeatCut: false,
    },
  });

  const papaPastusa = await prisma.product.create({
    data: {
      code: "LEG-01",
      name: "Papa Pastusa Seleccionada",
      categoryId: catLegumbres.id,
      unit: "kg",
      costPrice: 2200,
      estimatedWastePercent: 7.0,
      targetMarginPercent: 30.0,
      sellPrice: 3400,
      currentStock: 150.0,
      minStock: 40.0,
      isMeatCut: false,
    },
  });

  const tomateChonto = await prisma.product.create({
    data: {
      code: "LEG-02",
      name: "Tomate Chonto Maduro",
      categoryId: catLegumbres.id,
      unit: "kg",
      costPrice: 3100,
      estimatedWastePercent: 8.0,
      targetMarginPercent: 30.0,
      sellPrice: 4800,
      currentStock: 65.0,
      minStock: 20.0,
      isMeatCut: false,
    },
  });

  const cebollaCabezona = await prisma.product.create({
    data: {
      code: "LEG-03",
      name: "Cebolla Cabezona Blanca",
      categoryId: catLegumbres.id,
      unit: "kg",
      costPrice: 2400,
      estimatedWastePercent: 6.0,
      targetMarginPercent: 30.0,
      sellPrice: 3700,
      currentStock: 80.0,
      minStock: 25.0,
      isMeatCut: false,
    },
  });

  const platanoVerde = await prisma.product.create({
    data: {
      code: "LEG-05",
      name: "Plátano Hartón Verde",
      categoryId: catLegumbres.id,
      unit: "kg",
      costPrice: 2700,
      estimatedWastePercent: 5.0,
      targetMarginPercent: 30.0,
      sellPrice: 4100,
      currentStock: 90.0,
      minStock: 20.0,
      isMeatCut: false,
    },
  });

  console.log("¡Base de datos restablecida en CERO (sin lotes ni ventas precargadas)!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

