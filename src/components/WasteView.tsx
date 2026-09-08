"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency, formatWeight } from "@/lib/finance";
import { Trash2, Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { Skeleton } from "@/components/ui/skeleton";

interface WasteLog {
  id: string;
  date: string;
  quantity: number;
  reason: string;
  costLoss: number;
  notes: string | null;
  product: {
    name: string;
    unit: string;
  };
}

interface Product {
  id: string;
  name: string;
  costPrice: number;
}

export function WasteView() {
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(1.0);
  const [reason, setReason] = useState("DESPOSTE_HUESO_SEBO");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    fetch("/api/waste")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLogs(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setProducts(data.data);
          setProductId(data.data[0].id);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || quantity <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: Number(quantity),
          reason,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setNotes("");
        setQuantity(1.0);
        fetchLogs();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalLoss = logs.reduce((acc, log) => acc + log.costLoss, 0);
  const totalKg = logs.reduce((acc, log) => acc + log.quantity, 0);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Cabecera */}
      <Card className="shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-slate-700" />
              Control de Mermas y Descartes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro de pérdidas por hueso/grasa en carnicería o sobremaduración en legumbres.
            </p>
          </div>

          <Button onClick={() => setShowModal(true)} size="sm" className="w-full sm:w-auto h-10 sm:h-9 text-xs font-semibold">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Registrar Merma
          </Button>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Pérdida Monetaria
            </CardDescription>
            <CardTitle className="text-xl font-bold text-rose-700">
              -{formatCurrency(totalLoss)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            Costo de compra absorbido
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Peso Descartado
            </CardDescription>
            <CardTitle className="text-xl font-bold text-slate-900">
              {formatWeight(totalKg)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
            Kilos fuera de venta
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Mermas */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-sm font-bold text-slate-900">
            Historial de Descartes
          </CardTitle>
          <CardDescription className="text-xs">
            {logs.length} registros archivados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* VISTA MÓVIL: Tarjetas de Mermas (md:hidden) */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No hay mermas registradas.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{log.product.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.date).toLocaleDateString("es-CO")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-rose-700">
                        -{formatCurrency(log.costLoss)}
                      </div>
                      <div className="text-xs font-semibold text-rose-600">
                        -{log.quantity} {log.product.unit}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-50">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {log.reason.replace(/_/g, " ")}
                    </Badge>
                    {log.notes && (
                      <span className="text-[11px] text-slate-500 italic truncate max-w-[180px]">
                        {log.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* VISTA ESCRITORIO: Tabla Completa (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto touch-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Pérdida ($)</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No hay mermas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-slate-500 font-mono text-xs">
                        {new Date(log.date).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {log.product.name}
                      </TableCell>
                      <TableCell className="text-right text-rose-700 font-medium">
                        -{log.quantity} {log.product.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {log.reason.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-rose-700 font-bold">
                        -{formatCurrency(log.costLoss)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {log.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo Registrar Merma (shadcn Dialog) */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[92vw] sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle>Registrar Merma o Descarte</DialogTitle>
            <DialogDescription>
              El peso indicado se descontará automáticamente del inventario disponible.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Producto Afectado *
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Cantidad a Descartar
                </label>
                <CleanNumberInput
                  value={quantity}
                  onChange={(val) => setQuantity(val)}
                  className="font-bold text-rose-700 h-9"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Motivo
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="DESPOSTE_HUESO_SEBO">Hueso / Grasa</option>
                  <option value="DESPERDICIO_MADURACION">Sobremaduración</option>
                  <option value="DESHIDRATACION">Deshidratación</option>
                  <option value="DETERIORO">Deterioro</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Notas / Observaciones
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="Observaciones de pesaje..."
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "Registrando..." : "Confirmar Descarte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
