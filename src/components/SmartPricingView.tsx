"use client";

import React, { useState } from "react";
import {
  calculatePriceForTargetMargin,
  compareMarkupVsRealMargin,
  formatCurrency,
} from "@/lib/finance";
import { Check, AlertCircle, RotateCcw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SmartPricingView() {
  // Inicia en cero (0) como solicitó el usuario
  const [costInput, setCostInput] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(30);
  const [wastePercent, setWastePercent] = useState<number>(0);

  const comparison = compareMarkupVsRealMargin(costInput, targetMargin, wastePercent);
  const marginTiers = [20, 25, 30, 35, 40, 45];
  const isZero = costInput <= 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabecera */}
      <Card className="shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Calculadora de Precios de Venta
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Calcula el precio de venta sugerido para asegurar la rentabilidad objetivo considerando el costo y la merma.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isZero && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCostInput(0)}
                className="text-xs text-slate-500 hover:text-slate-900 h-8"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Limpiar a 0
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parámetros */}
      <Card className="shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Parámetros del Producto
              </CardTitle>
              <CardDescription className="text-xs">
                Ingresa el costo desde $0 para calcular el precio óptimo.
              </CardDescription>
            </div>

            {/* Accesos rápidos de prueba opcionales */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <span>Ejemplos:</span>
              <button
                type="button"
                onClick={() => setCostInput(10000)}
                className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] cursor-pointer"
              >
                $10.000
              </button>
              <button
                type="button"
                onClick={() => setCostInput(20000)}
                className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] cursor-pointer"
              >
                $20.000
              </button>
              <button
                type="button"
                onClick={() => setCostInput(35000)}
                className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] cursor-pointer"
              >
                $35.000
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Costo de Compra ($)
              </label>
              <CurrencyInput
                prefix="$"
                placeholder="0"
                value={costInput}
                onChange={(val) => setCostInput(val)}
                className="font-bold text-slate-900 text-base"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {isZero ? "Escribe un valor para simular" : "Por kg o unidad comprada"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Merma Estimada (%)
              </label>
              <CleanNumberInput
                suffix="%"
                placeholder="0"
                value={wastePercent}
                onChange={(val) => setWastePercent(Math.min(100, val))}
                className="font-semibold text-slate-900 font-mono h-9"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Hueso/grasa o merma vegetal</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Margen Real Deseado (%)
              </label>
              <CleanNumberInput
                suffix="%"
                placeholder="30"
                value={targetMargin}
                onChange={(val) => setTargetMargin(Math.min(99, val))}
                className="font-semibold text-slate-900 font-mono h-9"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Recomendado mínimo: 30%</span>
            </div>
          </div>

          {!isZero && wastePercent > 0 && (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex justify-between">
              <span>Por la merma del {wastePercent}%, tu costo real por kg vendible es:</span>
              <strong className="text-slate-900">{formatCurrency(comparison.effectiveCost)} / kg</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparación Lado a Lado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Recargo Tradicional */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Fijación Tradicional
              </CardDescription>
              <CardTitle className="text-base font-bold text-slate-900">
                Recargo Simple
              </CardTitle>
            </div>
            <Badge variant="destructive">Margen Insuficiente</Badge>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Precio de venta resultante:</span>
                <strong className="text-slate-900">
                  {isZero ? "$0" : formatCurrency(comparison.markupPrice)}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Ganancia por unidad:</span>
                <span className="text-slate-700 font-medium">
                  {isZero ? "$0" : `+${formatCurrency(comparison.markupProfit)}`}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-slate-700">Margen Real Obtenido:</span>
                <span className="text-lg font-bold text-rose-600">
                  {isZero ? "0%" : `${comparison.markupRealMargin}%`}
                </span>
              </div>
            </div>

            <Alert variant="destructive" className="py-2.5">
              <AlertDescription className="text-xs">
                {isZero ? (
                  "Al ingresar un costo, verás cuánto porcentaje real de ganancia se reduce al usar recargo simple."
                ) : (
                  <>
                    Se proyectaba ganar el {targetMargin}%, pero la ganancia real es de solo <strong>{comparison.markupRealMargin}%</strong>. 
                    Se dejan de percibir <strong>{formatCurrency(comparison.moneyLostPerUnit)}</strong> por cada unidad vendida.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Precio Recomendado */}
        <Card className="shadow-xs border-slate-300">
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Rentabilidad Objetivo
              </CardDescription>
              <CardTitle className="text-base font-bold text-slate-900">
                Precio Sugerido Recomendado
              </CardTitle>
            </div>
            <Badge variant="success">Meta Asegurada</Badge>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Precio de venta sugerido:</span>
                <strong className="text-xl font-bold text-slate-900">
                  {isZero ? "$0" : formatCurrency(comparison.realMarginPrice)}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Ganancia por unidad:</span>
                <span className="text-emerald-700 font-bold">
                  {isZero ? "$0" : `+${formatCurrency(comparison.realMarginProfit)}`}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-semibold text-slate-700">Margen Real Asegurado:</span>
                <span className="text-lg font-bold text-emerald-700">
                  {isZero ? "0%" : `${comparison.realMarginAchieved}%`}
                </span>
              </div>
            </div>

            <Alert variant="success" className="py-2.5">
              <Check className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {isZero ? (
                  `Garantiza un ${targetMargin}% de utilidad real sobre cada venta cobrada.`
                ) : (
                  <>
                    A este precio aseguras exactamente el <strong>{targetMargin}%</strong> de margen neto sobre cada venta cobrada.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Precios por Margen */}
      <Card className="shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold text-slate-900">
            Escala de Precios Sugeridos según Margen Objetivo
          </CardTitle>
          <CardDescription className="text-xs">
            {isZero
              ? "Ingresa un costo de compra arriba para generar la escala de precios."
              : `Precios resultantes para un costo base de ${formatCurrency(costInput)} y merma del ${wastePercent}%.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto touch-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Margen Deseado</TableHead>
                  <TableHead>Precio Sugerido</TableHead>
                  <TableHead>Ganancia en Dinero</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isZero ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      Escribe un costo en el campo de arriba para ver la escala de precios sugeridos.
                    </TableCell>
                  </TableRow>
                ) : (
                  marginTiers.map((tier) => {
                    const price = calculatePriceForTargetMargin(costInput, tier, wastePercent);
                    const profit = price - comparison.effectiveCost;
                    const isSelected = tier === targetMargin;

                    return (
                      <TableRow key={tier} className={isSelected ? "bg-slate-50 font-semibold" : ""}>
                        <TableCell className="font-medium">
                          {tier}% Margen Real
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {formatCurrency(price)}
                        </TableCell>
                        <TableCell className="text-emerald-700 font-medium">
                          +{formatCurrency(profit)}
                        </TableCell>
                        <TableCell>
                          {tier >= 30 ? (
                            <Badge variant="success" className="text-[10px]">
                              Recomendado (≥30%)
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">
                              Margen Bajo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
