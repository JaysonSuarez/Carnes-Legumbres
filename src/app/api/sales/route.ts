import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRealMargin } from "@/lib/finance";

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      take: 50,
      orderBy: { date: "desc" },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: sales });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener las ventas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName = "Cliente Mostrador",
      paymentMethod = "EFECTIVO",
      items = [], // { productId, quantity, unitPrice }
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "La venta debe incluir al menos un producto" },
        { status: 400 }
      );
    }

    // Obtener productos para conocer su costo actual
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let totalAmount = 0;
    let totalCost = 0;

    const saleItemsData = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.productId}`);
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice || product.sellPrice);
      const unitCost = Number(product.costPrice);

      const subtotal = quantity * unitPrice;
      const costSubtotal = quantity * unitCost;
      const profit = subtotal - costSubtotal;
      const realMarginPercent = calculateRealMargin(unitCost, unitPrice);

      totalAmount += subtotal;
      totalCost += costSubtotal;

      return {
        productId: item.productId,
        quantity,
        unitCost,
        unitPrice,
        subtotal,
        profit,
        realMarginPercent,
      };
    });

    const totalProfit = totalAmount - totalCost;
    const realMarginPercent = calculateRealMargin(totalCost, totalAmount);
    const saleCode = `VTA-${Date.now().toString().slice(-6)}`;

    // Transacción para registrar venta y descontar stock
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          saleCode,
          customerName,
          paymentMethod,
          totalAmount,
          totalCost,
          totalProfit,
          realMarginPercent,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // Descontar inventario y detectar productos en alerta de bajo stock
      const stockAlerts = [];
      for (const item of items) {
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: Number(item.quantity),
            },
          },
          include: { category: true },
        });

        if (updatedProduct.currentStock <= updatedProduct.minStock) {
          stockAlerts.push({
            id: updatedProduct.id,
            name: updatedProduct.name,
            unit: updatedProduct.unit,
            currentStock: updatedProduct.currentStock,
            minStock: updatedProduct.minStock,
            isOutOfStock: updatedProduct.currentStock <= 0,
            isLowStock: updatedProduct.currentStock > 0 && updatedProduct.currentStock <= updatedProduct.minStock,
            categoryName: updatedProduct.category.name,
          });
        }
      }

      return { newSale, stockAlerts };
    });

    return NextResponse.json({
      success: true,
      data: sale.newSale,
      stockAlerts: sale.stockAlerts,
    });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la venta" },
      { status: 500 }
    );
  }
}
