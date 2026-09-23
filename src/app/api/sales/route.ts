import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { calculateRealMargin } from "@/lib/finance";
import { getTenantId } from "@/lib/tenant";
import { colombiaDateStringToIso } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = getTenantId(request);
    const search = new URL(request.url).searchParams.get("search")?.trim().slice(0, 80);

    let salesQuery = supabase
      .from("cl_sales")
      .select(`
        *,
        items:cl_sale_items(
          *,
          product:cl_products(*)
        ),
        returns:cl_sale_returns(id, returnedAt, refundAmount)
      `)
      .eq("tenantId", tenantId)
      .order("date", { ascending: false })
      .limit(50);

    if (search) {
      const safeSearch = search.replace(/[,%()_*]/g, " ").replace(/\s+/g, " ").trim();
      if (safeSearch) {
        salesQuery = salesQuery.or(`saleCode.ilike.%${safeSearch}%,customerName.ilike.%${safeSearch}%`);
      }
    }

    const { data: sales, error } = await salesQuery;

    if (error) {
      throw error;
    }

    const normalizedSales = (sales || []).map((sale) => {
      if (!sale.createdAt) return sale;
      const createdAtString = String(sale.createdAt);
      const withTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(createdAtString)
        ? createdAtString
        : `${createdAtString}Z`;
      return { ...sale, createdAt: new Date(withTimezone).toISOString() };
    });

    return NextResponse.json({ success: true, data: normalizedSales });
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
    const tenantId = getTenantId(request);
    const body = await request.json();
    const {
      customerName = "Cliente Mostrador",
      paymentMethod = "EFECTIVO",
      saleDate,
      items = [], // { productId, quantity, unitPrice }
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "La venta debe incluir al menos un producto" },
        { status: 400 }
      );
    }

    if (paymentMethod === "CREDITO") {
      const cleanName = customerName ? customerName.trim() : "";
      if (!cleanName || cleanName.toLowerCase() === "cliente mostrador") {
        return NextResponse.json(
          {
            success: false,
            error: "Para registrar una venta a crédito (fiado) es obligatorio ingresar el nombre o identificación del cliente.",
          },
          { status: 400 }
        );
      }
    }

    // Obtener productos para conocer su costo actual dentro del mismo tenant
    const productIds = items.map((i: any) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("cl_products")
      .select("*, category:cl_categories(*)")
      .in("id", productIds)
      .eq("tenantId", tenantId);

    if (prodErr || !dbProducts) {
      throw prodErr || new Error("Error consultando productos de la venta");
    }

    const productMap = new Map(dbProducts.map((p: any) => [p.id, p]));

    let totalAmount = 0;
    let totalCost = 0;
    const saleId = genId("sale");

    const saleItemsData = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.productId}`);
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice || product.sellPrice);
      const unitCost = Number(product.costPrice);

      const subtotal =
        item.subtotal !== undefined && item.subtotal !== null && Number(item.subtotal) > 0
          ? Math.round(Number(item.subtotal))
          : Math.round(quantity * unitPrice);
      const costSubtotal = Number((quantity * unitCost).toFixed(2));
      const profit = subtotal - costSubtotal;
      const realMarginPercent = calculateRealMargin(unitCost, unitPrice);

      totalAmount += subtotal;
      totalCost += costSubtotal;

      return {
        id: genId("sitem"),
        saleId,
        productId: item.productId,
        quantity,
        unitCost,
        unitPrice,
        subtotal,
        profit,
        realMarginPercent,
        tenantId,
      };
    });

    const totalProfit = totalAmount - totalCost;
    const realMarginPercent = calculateRealMargin(totalCost, totalAmount);
    const saleCode = `VTA-${Date.now().toString().slice(-6)}`;

    const selectedSaleDate = saleDate ? String(saleDate).slice(0, 10) : undefined;
    if (selectedSaleDate && !/^\d{4}-\d{2}-\d{2}$/.test(selectedSaleDate)) {
      return NextResponse.json(
        { success: false, error: "La fecha de venta no es válida" },
        { status: 400 }
      );
    }

    // 1. Insertar venta con tenantId
    const { data: newSale, error: saleErr } = await supabase
      .from("cl_sales")
      .insert({
        id: saleId,
        saleCode,
        customerName: customerName.trim(),
        paymentMethod,
        totalAmount,
        totalCost,
        totalProfit,
        realMarginPercent,
        tenantId,
        createdAt: new Date().toISOString(),
        ...(selectedSaleDate ? { date: colombiaDateStringToIso(selectedSaleDate) } : {}),
      })
      .select()
      .single();

    if (saleErr) {
      throw saleErr;
    }

    // 2. Si el método de pago es CRÉDITO / FIADO, registrar en cl_credits
    if (paymentMethod === "CREDITO") {
      const creditId = genId("crd");
      const { error: creditErr } = await supabase
        .from("cl_credits")
        .insert({
          id: creditId,
          tenantId,
          saleId,
          customerName: customerName.trim(),
          customerPhone: body.customerPhone ? String(body.customerPhone).trim() : null,
          originalAmount: totalAmount,
          currentBalance: totalAmount,
          dailyInterestRate: 0.01,
          creditDate: new Date().toISOString(),
          dueDate: body.dueDate ? colombiaDateStringToIso(body.dueDate) : null,
          status: "PENDIENTE",
          totalInterestPaid: 0,
          totalCapitalPaid: 0,
          notes: body.notes ? String(body.notes).trim() : null,
        });

      if (creditErr) {
        console.error("Error al registrar crédito:", creditErr);
        throw new Error(`Error registrando el crédito: ${creditErr.message}`);
      }
    }

    // 3. Insertar items con tenantId
    const { error: itemsErr } = await supabase
      .from("cl_sale_items")
      .insert(saleItemsData);

    if (itemsErr) {
      throw itemsErr;
    }

    // 3. Descontar stock y evaluar alertas en productos del tenant
    const stockAlerts = [];
    for (const item of items) {
      const currentProd = productMap.get(item.productId);
      if (currentProd) {
        const newStock = Math.max(0, (currentProd.currentStock || 0) - Number(item.quantity));
        await supabase
          .from("cl_products")
          .update({
            currentStock: newStock,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", item.productId)
          .eq("tenantId", tenantId);

        if (newStock <= currentProd.minStock) {
          stockAlerts.push({
            id: currentProd.id,
            name: currentProd.name,
            unit: currentProd.unit,
            currentStock: newStock,
            minStock: currentProd.minStock,
            isOutOfStock: newStock <= 0,
            isLowStock: newStock > 0 && newStock <= currentProd.minStock,
            categoryName: currentProd.category?.name || "General",
          });
        }
      }
    }

    // Cargar venta completa con items
    const { data: completeSale } = await supabase
      .from("cl_sales")
      .select(`
        *,
        items:cl_sale_items(
          *,
          product:cl_products(*)
        )
      `)
      .eq("id", saleId)
      .eq("tenantId", tenantId)
      .single();

    const savedSale = completeSale || newSale;
    const formatCop = (val: number) =>
      new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(val);
    if (body.source === "mostrador") {
      try {
        await supabase.from("cl_notifications").insert({
          id: genId("notif"),
          tenantId,
          type: "SALE",
          title: "🧾 Nueva venta en mostrador",
          message: `Ticket ${savedSale.saleCode} • ${savedSale.customerName || "Cliente Mostrador"} • ${formatCop(savedSale.totalAmount)} • ${savedSale.paymentMethod}`,
          metadata: {
            saleId,
            saleCode: savedSale.saleCode,
            totalAmount: savedSale.totalAmount,
            paymentMethod: savedSale.paymentMethod,
            customerName: savedSale.customerName,
            changedBy: "mostrador",
            source: "mostrador",
          },
          readByAdmin: false,
          createdAt: new Date().toISOString(),
        });
      } catch (notificationError) {
        console.error("Error creating sale notification:", notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      data: savedSale,
      stockAlerts,
    });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar la venta" },
      { status: 500 }
    );
  }
}
