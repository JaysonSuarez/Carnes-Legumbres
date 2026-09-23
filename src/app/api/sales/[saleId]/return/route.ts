import { NextResponse } from "next/server";
import { supabase, genId } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/sales/[saleId]/return">
) {
  try {
    const tenantId = getTenantId(request);
    const { saleId } = await context.params;
    const { data, error } = await supabase.rpc("return_cl_sale", {
      p_sale_id: saleId,
      p_tenant_id: tenantId,
      p_return_id: genId("sreturn"),
    });

    if (error) {
      const message = error.message.toUpperCase();
      if (message.includes("SALE_NOT_FOUND")) {
        return NextResponse.json({ success: false, error: "No se encontró el ticket." }, { status: 404 });
      }
      if (message.includes("RETURN_WINDOW_EXPIRED")) {
        return NextResponse.json({ success: false, error: "Ya pasaron los cinco minutos para devolver este ticket." }, { status: 409 });
      }
      if (message.includes("SALE_ALREADY_RETURNED")) {
        return NextResponse.json({ success: false, error: "Este ticket ya fue devuelto." }, { status: 409 });
      }
      if (message.includes("CREDIT_HAS_PAYMENTS")) {
        return NextResponse.json({ success: false, error: "No se puede devolver un fiado que ya tiene abonos." }, { status: 409 });
      }
      if (message.includes("CREDIT_NOT_FOUND")) {
        return NextResponse.json({ success: false, error: "No se encontró el fiado asociado al ticket." }, { status: 409 });
      }
      console.error("Error returning sale:", error);
      return NextResponse.json({ success: false, error: "No se pudo registrar la devolución." }, { status: 500 });
    }

    const returnedSale = data as {
      saleCode: string;
      refundAmount: number;
      paymentMethod: string;
    };
    try {
      await supabase.from("cl_notifications").insert({
        id: genId("notif"),
        tenantId,
        type: "SALE_RETURN",
        title: "↩️ Devolución de ticket en mostrador",
        message: returnedSale.paymentMethod === "CREDITO"
          ? `Ticket ${returnedSale.saleCode} • saldo del fiado cancelado`
          : `Ticket ${returnedSale.saleCode} • reintegro ${new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            }).format(returnedSale.refundAmount)} • ${returnedSale.paymentMethod}`,
        metadata: {
          saleCode: returnedSale.saleCode,
          refundAmount: returnedSale.refundAmount,
          paymentMethod: returnedSale.paymentMethod,
          source: "mostrador",
        },
        readByAdmin: false,
        createdAt: new Date().toISOString(),
      });
    } catch (notificationError) {
      console.error("Error creating sale return notification:", notificationError);
    }

    return NextResponse.json({ success: true, data: returnedSale });
  } catch (error) {
    console.error("Error processing sale return:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo procesar la devolución." },
      { status: 500 }
    );
  }
}
