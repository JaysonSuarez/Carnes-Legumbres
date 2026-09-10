"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/finance";
import {
  WalletCards,
  Search,
  Receipt,
  Calendar,
  Clock,
  User,
  Phone,
  ArrowDownCircle,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Percent,
  TrendingUp,
  FileText,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { InvoiceDialog, SaleInvoiceData } from "@/components/InvoiceDialog";

interface CreditSummary {
  totalActiveCapital: number;
  totalAccruedInterest: number;
  totalReceivableDebt: number;
  totalDebtorsCount: number;
  totalOriginalLoaned: number;
}

interface CreditItem {
  id: string;
  tenantId: string;
  saleId: string;
  customerName: string;
  customerPhone?: string | null;
  originalAmount: number;
  currentBalance: number;
  dailyInterestRate: number;
  creditDate: string;
  status: string;
  totalInterestPaid: number;
  totalCapitalPaid: number;
  notes?: string | null;
  calculation: {
    capital: number;
    daysElapsed: number;
    dailyRate: number;
    dailyAccrual: number;
    accruedInterest: number;
    totalDebt: number;
  };
  sale?: {
    id: string;
    saleCode: string;
    date: string;
    totalAmount: number;
    customerName: string;
    items?: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      product: { id: string; name: string; unit: string };
    }>;
  };
}

interface CustomerGroup {
  customerName: string;
  customerPhone?: string | null;
  activeCapital: number;
  accruedInterest: number;
  totalDebt: number;
  dailyAccrualRate: number;
  creditsCount: number;
  oldestCreditDate: string;
  credits: CreditItem[];
}

export function CreditsView() {
  const [summary, setSummary] = useState<CreditSummary>({
    totalActiveCapital: 0,
    totalAccruedInterest: 0,
    totalReceivableDebt: 0,
    totalDebtorsCount: 0,
    totalOriginalLoaned: 0,
  });
  const [customers, setCustomers] = useState<CustomerGroup[]>([]);
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  // Expansión de tarjetas de cliente
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Modal para ver factura original
  const [invoiceSale, setInvoiceSale] = useState<SaleInvoiceData | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Modal de Abono / Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<CustomerGroup | null>(null);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<CreditItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/credits?status=${activeTab === "pending" ? "PENDIENTE" : "ALL"}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data.summary);
        setCustomers(json.data.customers);
        setCredits(json.data.credits);
      }
    } catch (err) {
      console.error("Error al cargar cartera de créditos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [activeTab]);

  // Filtrado de clientes por búsqueda
  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = c.customerName.toLowerCase().includes(term);
    const phoneMatch = c.customerPhone?.toLowerCase().includes(term);
    const ticketMatch = c.credits.some((cr) =>
      cr.sale?.saleCode?.toLowerCase().includes(term)
    );
    return nameMatch || phoneMatch || ticketMatch;
  });

  const handleOpenPaymentModal = (client: CustomerGroup, credit?: CreditItem) => {
    setSelectedClientForPayment(client);
    setSelectedCreditForPayment(credit || null);
    const totalToPay = credit ? credit.calculation.totalDebt : client.totalDebt;
    setPaymentAmount(totalToPay);
    setPaymentMethod("EFECTIVO");
    setPaymentNotes("");
    setPaymentSuccessData(null);
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (paymentAmount <= 0) return;
    setIsProcessingPayment(true);

    try {
      const payload: any = {
        amountPaid: paymentAmount,
        paymentMethod,
        notes: paymentNotes,
      };

      if (selectedCreditForPayment) {
        payload.creditId = selectedCreditForPayment.id;
      } else if (selectedClientForPayment) {
        payload.customerName = selectedClientForPayment.customerName;
      }

      const res = await fetch("/api/credits/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Error registrando abono");
      }

      setPaymentSuccessData(json.data);
      fetchCredits();
    } catch (err: any) {
      alert(err.message || "Error al procesar el abono");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePrintVoucher = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !paymentSuccessData) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Abono</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 15px; max-width: 300px; margin: 0 auto; }
            h2 { text-align: center; margin: 0 0 5px 0; font-size: 15px; }
            p { margin: 3px 0; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          <h2>CARNE & LEGUMBRE</h2>
          <p class="text-center">Comprobante Oficial de Abono a Fiado</p>
          <div class="divider"></div>
          <div class="row"><span>Fecha:</span><span>${new Date().toLocaleString("es-CO")}</span></div>
          <div class="row"><span>Cliente:</span><span class="bold">${selectedClientForPayment?.customerName}</span></div>
          <div class="row"><span>Medio de Pago:</span><span>${paymentMethod}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>MONTO RECIBIDO:</span><span>${formatCurrency(paymentAmount)}</span></div>
          <div class="divider"></div>
          <p class="text-center" style="font-size: 10px; margin-top: 15px;">
            ¡Gracias por su pago oportuno!<br>Conserve este soporte para su tranquilidad.
          </p>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleViewInvoice = (credit: CreditItem) => {
    if (!credit.sale) return;

    const invoiceData: SaleInvoiceData = {
      id: credit.sale.id,
      saleCode: credit.sale.saleCode,
      date: credit.creditDate,
      customerName: credit.customerName,
      paymentMethod: "CREDITO",
      totalAmount: credit.sale.totalAmount,
      totalCost: 0,
      totalProfit: 0,
      realMarginPercent: 0,
      items: (credit.sale.items || []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        product: {
          name: item.product?.name || "Producto",
          unit: item.product?.unit || "und",
        },
      })),
    };

    setInvoiceSale(invoiceData);
    setShowInvoiceModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* Cabecera Principal */}
      <Card className="shadow-xs border-slate-200">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <WalletCards className="w-5 h-5 text-amber-600" />
              Cartera & Cuentas por Cobrar (Fiados)
            </h1>
            <p className="text-xs text-slate-500">
              Control de clientes a crédito con tasa de interés simple del 1% diario sobre capital insoluto.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCredits}
              disabled={loading}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar Saldos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas KPI de Cartera */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Capital Activo en Calle */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Capital en Calle</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {formatCurrency(summary.totalActiveCapital)}
            </div>
            <p className="text-[10px] text-slate-400">
              Monto original prestado pendiente de cobro
            </p>
          </CardContent>
        </Card>

        {/* 2. Intereses Acumulados (1% Diario) */}
        <Card className="border-amber-200 bg-amber-50/50 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Intereses a Hoy</span>
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
              +{formatCurrency(summary.totalAccruedInterest)}
            </div>
            <p className="text-[10px] text-amber-700">
              Generado al 1% diario simple sobre saldo
            </p>
          </CardContent>
        </Card>

        {/* 3. Total Cartera a Cobrar */}
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total a Cobrar</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
              {formatCurrency(summary.totalReceivableDebt)}
            </div>
            <p className="text-[10px] text-emerald-700">
              Capital insoluto + Intereses calculados
            </p>
          </CardContent>
        </Card>

        {/* 4. Clientes Deudores */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Clientes Deudores</span>
              <User className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {summary.totalDebtorsCount}
            </div>
            <p className="text-[10px] text-slate-400">
              Personas con saldo activo en mostrador
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regla de Interés Informativa */}
      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-[11px] text-amber-950">
            Regla de Interés Diario sobre Capital:
          </p>
          <p className="text-[11px] text-amber-800">
            Cada día transcurrido causa el <strong>1% de interés simple únicamente sobre el saldo de capital</strong> (no se cobran intereses sobre la deuda acumulada). Si un cliente fía \$50.000 y luego otros \$50.000, el interés diario se causará sobre los \$100.000 (\$1.000/día). Al abonar al capital, la causación diaria se reduce de inmediato.
          </p>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por cliente, celular o ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "pending"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Deudores Activos ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todos / Historial
          </button>
        </div>
      </div>

      {/* Listado de Clientes con Deuda */}
      {loading ? (
        <div className="text-center py-16 space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Calculando saldos e intereses diarios...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="text-center py-12 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No hay deudores pendientes</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? "No se encontraron clientes que coincidan con la búsqueda."
                : "Todos los fiados están al día o no se han registrado créditos aún."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((client) => {
            const isExpanded = expandedCustomer === client.customerName;

            return (
              <Card
                key={client.customerName}
                className={`transition-all duration-150 border-slate-200 ${
                  isExpanded ? "ring-1 ring-amber-400/50 shadow-sm" : "hover:border-slate-300"
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Datos del Cliente */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-sm shadow-2xs">
                        {client.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm truncate">
                            {client.customerName}
                          </h3>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {client.creditsCount} {client.creditsCount === 1 ? "ticket" : "tickets"}
                          </Badge>
                        </div>

                        {client.customerPhone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{client.customerPhone}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            Fiado más antiguo: {new Date(client.oldestCreditDate).toLocaleDateString("es-CO")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Resumen Financiero del Cliente */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-right">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Capital</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                          {formatCurrency(client.activeCapital)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-amber-600">+ Interés</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-amber-700">
                          +{formatCurrency(client.accruedInterest)}
                        </span>
                      </div>
                      <div className="border-l border-slate-200 pl-2">
                        <span className="block text-[10px] uppercase font-black text-emerald-800">Total a Pagar</span>
                        <span className="font-mono text-sm sm:text-base font-black text-emerald-950">
                          {formatCurrency(client.totalDebt)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleOpenPaymentModal(client)}
                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5 mr-1" />
                        Abonar / Liquidar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedCustomer(isExpanded ? null : client.customerName)
                        }
                        className="h-8 px-2 text-slate-500 cursor-pointer"
                        title="Ver desglose de tickets"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Detalle Desplegable de Tickets del Cliente */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase px-1">
                        <span>Detalle de Compras a Crédito ({client.credits.length})</span>
                        <span className="text-amber-700 font-mono">
                          Genera +{formatCurrency(client.dailyAccrualRate)}/día
                        </span>
                      </div>

                      <div className="space-y-2">
                        {client.credits.map((cr) => (
                          <div
                            key={cr.id}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800">
                                  {cr.sale?.saleCode || cr.id.slice(-8)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    cr.calculation.daysElapsed > 0
                                      ? "bg-amber-50 text-amber-800 border-amber-200 text-[10px]"
                                      : "bg-slate-100 text-slate-600 text-[10px]"
                                  }
                                >
                                  {cr.calculation.daysElapsed}{" "}
                                  {cr.calculation.daysElapsed === 1 ? "día transcurrido" : "días transcurridos"}
                                </Badge>
                                {cr.notes && (
                                  <span className="text-[10px] text-slate-500 italic">
                                    "{cr.notes}"
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Fecha: {new Date(cr.creditDate).toLocaleDateString("es-CO", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Capital</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {formatCurrency(cr.currentBalance)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-amber-600 block uppercase">+ Interés (1%/d)</span>
                                <span className="font-mono font-bold text-amber-700">
                                  +{formatCurrency(cr.calculation.accruedInterest)}
                                </span>
                              </div>
                              <div className="min-w-[80px]">
                                <span className="text-[10px] text-emerald-800 block uppercase font-bold">Total Ticket</span>
                                <span className="font-mono font-black text-emerald-950">
                                  {formatCurrency(cr.calculation.totalDebt)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 pl-2">
                                {cr.sale && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewInvoice(cr)}
                                    className="h-7 px-2 text-[11px] cursor-pointer"
                                    title="Ver tirilla POS original"
                                  >
                                    <Receipt className="w-3 h-3 text-slate-600" />
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleOpenPaymentModal(client, cr)}
                                  className="h-7 px-2 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 cursor-pointer"
                                >
                                  Pagar Ticket
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diálogo de Factura POS Original */}
      <InvoiceDialog
        sale={invoiceSale}
        open={showInvoiceModal}
        onOpenChange={setShowInvoiceModal}
      />

      {/* Diálogo para Registrar Abono / Pago */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              {selectedCreditForPayment
                ? `Abonar a Ticket ${selectedCreditForPayment.sale?.saleCode || selectedCreditForPayment.id.slice(-6)}`
                : `Registrar Abono - ${selectedClientForPayment?.customerName}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registra el pago recibido para amortizar intereses y capital insoluto.
            </DialogDescription>
          </DialogHeader>

          {paymentSuccessData ? (
            <div className="space-y-4 py-3">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-950">¡Abono registrado con éxito!</h4>
                <p className="text-xs text-emerald-800 font-mono">
                  Monto recibido: {formatCurrency(paymentAmount)}
                </p>
                <p className="text-[11px] text-emerald-700">
                  El saldo de capital ha sido actualizado de inmediato.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePrintVoucher}
                  variant="outline"
                  className="flex-1 h-9 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Comprobante
                </Button>
                <Button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 h-9 text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              {/* Resumen del Saldo Actual */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Capital Insoluto:</span>
                  <span className="font-bold">
                    {formatCurrency(
                      selectedCreditForPayment
                        ? selectedCreditForPayment.currentBalance
                        : selectedClientForPayment?.activeCapital || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Intereses Acumulados (1%/d):</span>
                  <span className="font-bold">
                    +{formatCurrency(
                      selectedCreditForPayment
                        ? selectedCreditForPayment.calculation.accruedInterest
                        : selectedClientForPayment?.accruedInterest || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-slate-200 text-sm">
                  <span>Total Deuda a Hoy:</span>
                  <span className="text-emerald-900">
                    {formatCurrency(
                      selectedCreditForPayment
                        ? selectedCreditForPayment.calculation.totalDebt
                        : selectedClientForPayment?.totalDebt || 0
                    )}
                  </span>
                </div>
              </div>

              {/* Input Monto a Pagar */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase block">
                  Monto que el cliente va a pagar ($):
                </label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="h-10 text-base font-bold font-mono text-slate-900"
                  placeholder="0"
                />

                {/* Botones de Acceso Rápido para Monto */}
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const accrued = selectedCreditForPayment
                        ? selectedCreditForPayment.calculation.accruedInterest
                        : selectedClientForPayment?.accruedInterest || 0;
                      setPaymentAmount(accrued);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700"
                  >
                    Solo Intereses
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const total = selectedCreditForPayment
                        ? selectedCreditForPayment.calculation.totalDebt
                        : selectedClientForPayment?.totalDebt || 0;
                      setPaymentAmount(Math.round(total / 2));
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700"
                  >
                    50% Deuda
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const total = selectedCreditForPayment
                        ? selectedCreditForPayment.calculation.totalDebt
                        : selectedClientForPayment?.totalDebt || 0;
                      setPaymentAmount(total);
                    }}
                    className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-[10px] font-bold text-emerald-900"
                  >
                    Liquidar Totalmente
                  </button>
                </div>
              </div>

              {/* Medio de Pago */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Medio de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-xs focus:outline-none"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia / Nequi</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Nota / Comentario
                  </label>
                  <Input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ej: Dejó pagado en caja"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentModal(false)}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleProcessPayment}
                  disabled={paymentAmount <= 0 || isProcessingPayment}
                  className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {isProcessingPayment ? "Registrando Abono..." : "Confirmar Abono"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
