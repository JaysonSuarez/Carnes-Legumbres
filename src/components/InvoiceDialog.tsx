"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/finance";
import { Printer, Store, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SaleInvoiceData {
  id?: string;
  saleCode: string;
  date: string | Date;
  customerName: string;
  paymentMethod: string;
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  realMarginPercent: number;
  items: Array<{
    id?: string;
    product: {
      name: string;
      unit: string;
    };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    unitCost?: number;
    profit?: number;
    realMarginPercent?: number;
  }>;
}

interface InvoiceDialogProps {
  sale: SaleInvoiceData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ sale, open, onOpenChange }: InvoiceDialogProps) {
  const [showProfitDetails, setShowProfitDetails] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    const invoiceEl = document.getElementById("printable-invoice");
    if (!invoiceEl) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute(
      "style",
      "position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: none; z-index: -1000;"
    );
    document.body.appendChild(iframe);

    const pri = iframe.contentWindow;
    if (!pri) {
      window.print();
      return;
    }

    // Clonar el ticket y remover cualquier elemento con clase .no-print
    const clone = invoiceEl.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".no-print").forEach((node) => node.remove());

    pri.document.open();
    pri.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Factura_${sale.saleCode}</title>
          <style>
            @page {
              size: auto;
              margin: 4mm 0;
            }
            *, ::before, ::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              border: 0 solid transparent;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .ticket-container {
              width: 380px;
              max-width: 100%;
              margin: 0 auto;
              padding: 12px 16px;
              background-color: #ffffff;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            ${clone.innerHTML}
          </div>
        </body>
      </html>
    `);
    pri.document.close();

    pri.focus();
    setTimeout(() => {
      pri.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden bg-white max-h-[92vh] flex flex-col">
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 touch-scroll" id="printable-invoice">
          {/* Encabezado del Ticket Comercial */}
          <div className="text-center pb-3 space-y-1" style={{ textAlign: "center", paddingBottom: "12px" }}>
            <div
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-800"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "9999px",
                backgroundColor: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px auto",
                color: "#1e293b",
              }}
            >
              <Store className="w-5 h-5" style={{ width: "20px", height: "20px" }} />
            </div>
            <h2
              className="text-base font-black tracking-tight text-slate-900 uppercase"
              style={{
                fontSize: "16px",
                fontWeight: 900,
                letterSpacing: "-0.025em",
                textTransform: "uppercase",
                color: "#0f172a",
                margin: 0,
              }}
            >
              CARNE & LEGUMBRE
            </h2>
            <p
              className="text-[11px] text-slate-500 font-mono"
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontFamily: "monospace, Courier, monospace",
                margin: "2px 0",
              }}
            >
              NIT: 901.458.721-3 • Régimen Simplificado
            </p>
            <p className="text-[11px] text-slate-500" style={{ fontSize: "11px", color: "#64748b", margin: "2px 0" }}>
              Cortes Finos, Cerdo, Pollo y Legumbres Frescas
            </p>
            <div className="pt-2" style={{ paddingTop: "8px" }}>
              <span
                className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono font-bold"
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  backgroundColor: "#f1f5f9",
                  color: "#1e293b",
                  fontSize: "11.5px",
                  fontFamily: "monospace, Courier, monospace",
                  fontWeight: 700,
                  letterSpacing: "0.2px",
                }}
              >
                FACTURA / TICKET POS #{sale.saleCode}
              </span>
            </div>
          </div>

          {/* Línea Divisoria Sutil */}
          <div
            style={{
              borderBottom: "1px dashed #cbd5e1",
              height: "1px",
              width: "100%",
              margin: "6px 0 10px 0",
            }}
          />

          {/* Metadatos de la Venta */}
          <div
            className="text-xs space-y-1.5 font-mono text-slate-600"
            style={{
              fontSize: "11.5px",
              fontFamily: "monospace, Courier, monospace",
              color: "#475569",
              padding: "2px 0",
            }}
          >
            <div
              className="flex justify-between"
              style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}
            >
              <span>Fecha:</span>
              <span className="text-slate-900 font-medium" style={{ color: "#0f172a", fontWeight: 600 }}>
                {new Date(sale.date).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div
              className="flex justify-between"
              style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}
            >
              <span>Cliente:</span>
              <span className="text-slate-900 font-medium" style={{ color: "#0f172a", fontWeight: 600 }}>
                {sale.customerName || "Cliente Mostrador"}
              </span>
            </div>
            <div
              className="flex justify-between"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>Medio de Pago:</span>
              <span className="text-slate-900 font-semibold" style={{ color: "#0f172a", fontWeight: 700 }}>
                {sale.paymentMethod}
              </span>
            </div>
          </div>

          {/* Línea Divisoria Sutil */}
          <div
            style={{
              borderBottom: "1px dashed #cbd5e1",
              height: "1px",
              width: "100%",
              margin: "10px 0 8px 0",
            }}
          />

          {/* Detalle de Productos */}
          <div style={{ padding: "2px 0" }}>
            <table
              className="w-full text-xs"
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}
            >
              <thead>
                <tr
                  className="text-slate-500 font-semibold text-[11px]"
                  style={{
                    color: "#64748b",
                    fontWeight: 600,
                    fontSize: "11px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <th
                    className="text-left pb-1.5"
                    style={{ textAlign: "left", paddingBottom: "6px", whiteSpace: "nowrap", width: "20%" }}
                  >
                    Cant.
                  </th>
                  <th
                    className="text-left pb-1.5"
                    style={{ textAlign: "left", paddingBottom: "6px", width: "46%" }}
                  >
                    Producto
                  </th>
                  <th
                    className="text-right pb-1.5"
                    style={{ textAlign: "right", paddingBottom: "6px", whiteSpace: "nowrap", width: "17%" }}
                  >
                    Precio
                  </th>
                  <th
                    className="text-right pb-1.5"
                    style={{ textAlign: "right", paddingBottom: "6px", whiteSpace: "nowrap", width: "17%" }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {sale.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className="text-slate-800"
                    style={{
                      borderTop: idx > 0 ? "1px solid #f8fafc" : "none",
                    }}
                  >
                    <td
                      className="py-1.5 align-top whitespace-nowrap text-slate-600 font-mono"
                      style={{
                        padding: "5px 4px 5px 0",
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                        color: "#475569",
                        fontFamily: "monospace, Courier, monospace",
                      }}
                    >
                      {item.product.unit === "kg"
                        ? `${item.quantity.toFixed(3)}kg`
                        : `${item.quantity} ${item.product.unit}`}
                    </td>
                    <td
                      className="py-1.5 pr-2 font-sans font-medium text-slate-900"
                      style={{
                        padding: "5px 6px 5px 0",
                        verticalAlign: "top",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        fontWeight: 500,
                        color: "#0f172a",
                      }}
                    >
                      {item.product.name}
                    </td>
                    <td
                      className="py-1.5 text-right text-slate-500 whitespace-nowrap font-mono"
                      style={{
                        padding: "5px 4px 5px 0",
                        textAlign: "right",
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                        color: "#64748b",
                        fontFamily: "monospace, Courier, monospace",
                      }}
                    >
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td
                      className="py-1.5 text-right font-bold text-slate-900 whitespace-nowrap font-mono"
                      style={{
                        padding: "5px 0",
                        textAlign: "right",
                        verticalAlign: "top",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        color: "#0f172a",
                        fontFamily: "monospace, Courier, monospace",
                      }}
                    >
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Línea Divisoria Sutil */}
          <div
            style={{
              borderBottom: "1px dashed #cbd5e1",
              height: "1px",
              width: "100%",
              margin: "8px 0",
            }}
          />

          {/* Totales */}
          <div
            className="py-1.5"
            style={{ padding: "6px 0" }}
          >
            <div
              className="flex justify-between items-baseline"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
            >
              <span
                className="font-bold text-slate-700 uppercase tracking-wider text-xs"
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                TOTAL A PAGAR:
              </span>
              <span
                className="text-xl font-black text-slate-900 font-mono"
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#0f172a",
                  fontFamily: "monospace, Courier, monospace",
                }}
              >
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>
          </div>

          {/* Línea Divisoria Sutil */}
          <div
            style={{
              borderBottom: "1px dashed #cbd5e1",
              height: "1px",
              width: "100%",
              margin: "6px 0 10px 0",
            }}
          />

          {/* Sección de Auditoría Interna (Rentabilidad Real - Solo Dueño, NUNCA se imprime) */}
          <div className="pt-1 no-print" style={{ paddingTop: "4px" }}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowProfitDetails(!showProfitDetails)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                {showProfitDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showProfitDetails ? "Ocultar rentabilidad interna" : "Ver rentabilidad interna (Solo Dueño)"}</span>
              </button>
            </div>

            {showProfitDetails && (
              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Costo Mercancía:</span>
                  <span>{formatCurrency(sale.totalCost)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Utilidad Neta:</span>
                  <span>+{formatCurrency(sale.totalProfit)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Margen Real Obtenido:</span>
                  <Badge variant={sale.realMarginPercent >= 30 ? "success" : "destructive"} className="text-[10px] font-bold">
                    {sale.realMarginPercent}% {sale.realMarginPercent >= 30 ? "✓" : "⚠"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Pie del Recibo */}
          <div
            className="text-center pt-2 space-y-0.5"
            style={{ textAlign: "center", paddingTop: "8px", color: "#64748b" }}
          >
            <p className="font-medium text-slate-600 text-xs" style={{ fontSize: "11px", fontWeight: 600, color: "#475569", margin: 0 }}>
              ¡Gracias por su compra!
            </p>
            <p className="text-[10px] text-slate-400" style={{ fontSize: "10px", color: "#94a3b8", margin: "2px 0 0 0" }}>
              Conserve su ticket para cambios o reclamos.
            </p>
          </div>
        </div>

        {/* Acciones del Diálogo (no se imprimen) */}
        <DialogFooter className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-2 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-9 text-xs cursor-pointer"
          >
            Cerrar
          </Button>

          <Button
            onClick={handlePrint}
            size="sm"
            className="w-full sm:w-auto h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Factura / Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
