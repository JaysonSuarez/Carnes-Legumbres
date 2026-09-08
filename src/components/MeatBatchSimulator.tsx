"use client";

import React, { useState, useEffect } from "react";
import {
  calculateBatchMetrics,
  calculateCattleYield,
  calculatePriceForTargetMargin,
  calculateRealMargin,
  formatCurrency,
  formatWeight,
} from "@/lib/finance";
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Save,
  Beef,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  FolderOpen,
  Scale,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { CurrencyInput } from "@/components/ui/currency-input";
import { CleanNumberInput } from "@/components/ui/clean-number-input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellPrice: number;
}

interface CutRow {
  id: string;
  productId: string;
  name: string;
  weightKg: number;
  wasteKg: number;
  costAttributed: number;
  actualSellPrice: number;
}

interface BatchTemplate {
  id: string;
  name: string;
  supplier: string;
  defaultCost?: number;
  cuts: Array<{
    name: string;
    weightKg: number;
    wasteKg: number;
    costAttributed: number;
    actualSellPrice: number;
  }>;
}

const TEMPLATES_STORAGE_KEY = "carne_legumbre_batch_templates";

// Plantilla 1: Desposte de Res Completa
const CATTLE_RES_COMPLETA_TEMPLATE: BatchTemplate = {
  id: "preset-res-completa",
  name: "Desposte de Res Completa (9 categorías)",
  supplier: "Ganado en Pie",
  defaultCost: 3914000,
  cuts: [
    { name: "Lomo Fino de Res", weightKg: 8.5, wasteKg: 0.5, costAttributed: 24500, actualSellPrice: 37000 },
    { name: "Punta de Anca", weightKg: 14.0, wasteKg: 0.8, costAttributed: 22000, actualSellPrice: 35000 },
    { name: "Carne de Primera (Cadera/Bota)", weightKg: 85.0, wasteKg: 2.0, costAttributed: 16000, actualSellPrice: 24000 },
    { name: "Carne de Segunda (Paleta/Morrillo)", weightKg: 42.0, wasteKg: 1.5, costAttributed: 13500, actualSellPrice: 20000 },
    { name: "Sobrebarriga / Falda", weightKg: 18.0, wasteKg: 1.0, costAttributed: 15500, actualSellPrice: 23000 },
    { name: "Carne Molida Especial", weightKg: 25.0, wasteKg: 0.5, costAttributed: 12000, actualSellPrice: 18000 },
    { name: "Costilla de Res", weightKg: 35.0, wasteKg: 2.0, costAttributed: 11000, actualSellPrice: 16500 },
    { name: "Hueso Carnudo", weightKg: 30.0, wasteKg: 0.0, costAttributed: 3500, actualSellPrice: 6500 },
    { name: "Grasa / Sebo Industrial", weightKg: 25.75, wasteKg: 0.0, costAttributed: 1500, actualSellPrice: 3000 },
  ],
};

// Plantilla 2: Media Res Tradicional
const DEFAULT_PRESET_TEMPLATE: BatchTemplate = {
  id: "preset-media-res",
  name: "Media Res Tradicional (8 cortes)",
  supplier: "Frigorífico Ganadero",
  defaultCost: 2400000,
  cuts: [
    { name: "Lomo Fino de Res", weightKg: 12.0, wasteKg: 0.5, costAttributed: 26000, actualSellPrice: 42000 },
    { name: "Punta de Anca", weightKg: 16.0, wasteKg: 0.8, costAttributed: 22000, actualSellPrice: 36000 },
    { name: "Churrasco / Bife", weightKg: 20.0, wasteKg: 1.0, costAttributed: 20000, actualSellPrice: 33000 },
    { name: "Costilla de Res", weightKg: 30.0, wasteKg: 2.5, costAttributed: 13000, actualSellPrice: 21500 },
    { name: "Sobrebarriga / Falda", weightKg: 18.0, wasteKg: 1.2, costAttributed: 15000, actualSellPrice: 25000 },
    { name: "Carne Molida Especial", weightKg: 25.0, wasteKg: 0.5, costAttributed: 13500, actualSellPrice: 22500 },
    { name: "Osobuco con Hueso", weightKg: 14.0, wasteKg: 1.5, costAttributed: 9500, actualSellPrice: 17000 },
    { name: "Hueso Carnudo", weightKg: 20.0, wasteKg: 0.0, costAttributed: 3000, actualSellPrice: 6500 },
  ],
};

export function MeatBatchSimulator({ onBatchSaved }: { onBatchSaved?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  
  // Modalidad de Compra: Res en Pie o Lote Fijo
  const [purchaseMode, setPurchaseMode] = useState<"CATTLE_LIVE" | "DIRECT_BATCH">("CATTLE_LIVE");
  const [liveWeightKg, setLiveWeightKg] = useState<number>(515);
  const [pricePerKgLive, setPricePerKgLive] = useState<number>(7600);

  // Datos del lote
  const [batchNumber, setBatchNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [totalCost, setTotalCost] = useState<number>(3914000);
  const [targetMargin, setTargetMargin] = useState<number>(30);
  const [cuts, setCuts] = useState<CutRow[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Manejo de Plantillas Favoritas
  const [templates, setTemplates] = useState<BatchTemplate[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [templateActionMessage, setTemplateActionMessage] = useState("");

  useEffect(() => {
    // Cargar productos
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProducts(data.data);
        }
      });

    // Cargar plantillas desde localStorage
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored));
      } else {
        // Inicializar con las plantillas predefinidas disponibles para usar
        const initial = [CATTLE_RES_COMPLETA_TEMPLATE, DEFAULT_PRESET_TEMPLATE];
        setTemplates(initial);
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (e) {
      console.error(e);
      setTemplates([CATTLE_RES_COMPLETA_TEMPLATE, DEFAULT_PRESET_TEMPLATE]);
    }
  }, []);

  // Calculador de rendimiento cárnico y costo real de la res
  const cattleYield = calculateCattleYield(
    liveWeightKg,
    pricePerKgLive,
    cuts.map((c) => ({
      id: c.id,
      name: c.name,
      weightKg: c.weightKg,
      sellPrice: c.actualSellPrice,
      wasteKg: c.wasteKg,
    }))
  );

  // Mantener totalCost sincronizado si está en modo Res en Pie
  useEffect(() => {
    if (purchaseMode === "CATTLE_LIVE") {
      setTotalCost(Math.round(liveWeightKg * pricePerKgLive));
    }
  }, [purchaseMode, liveWeightKg, pricePerKgLive]);

  const handleApplyRelativeCostDistribution = () => {
    if (cattleYield.cutAttributions.length === 0) return;
    setCuts((prev) =>
      prev.map((cut) => {
        const attr = cattleYield.cutAttributions.find((a) => a.id === cut.id);
        if (attr && attr.attributedCostPerKg > 0) {
          return {
            ...cut,
            costAttributed: attr.attributedCostPerKg,
          };
        }
        return cut;
      })
    );
    setTemplateActionMessage("¡Costos asignados proporcionalmente según el valor de venta de cada corte!");
    setTimeout(() => setTemplateActionMessage(""), 4000);
  };

  const metrics = calculateBatchMetrics(
    totalCost,
    cuts.map((c) => ({
      id: c.id,
      name: c.name,
      weightKg: c.weightKg,
      sellPrice: c.actualSellPrice,
      wasteKg: c.wasteKg,
    })),
    targetMargin
  );

  const isCleanState = totalCost === 0 && cuts.length === 0;

  const handleCutChange = (id: string, field: keyof CutRow, value: any) => {
    setCuts((prev) =>
      prev.map((cut) => {
        if (cut.id !== id) return cut;
        const updated = { ...cut, [field]: value };
        if (field === "productId") {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            updated.name = prod.name;
            updated.costAttributed = prod.costPrice;
            updated.actualSellPrice = prod.sellPrice;
          }
        }
        return updated;
      })
    );
  };

  const handleAddCut = () => {
    const newId = Date.now().toString();
    setCuts((prev) => [
      ...prev,
      {
        id: newId,
        productId: "",
        name: `Corte #${prev.length + 1}`,
        weightKg: 10.0,
        wasteKg: 0.0,
        costAttributed: 15000,
        actualSellPrice: 22000,
      },
    ]);
  };

  const handleRemoveCut = (id: string) => {
    setCuts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleResetToZero = () => {
    setTotalCost(0);
    setSupplier("");
    setBatchNumber("");
    setCuts([]);
    setErrorMessage("");
    setSaveSuccess(false);
  };

  // Guardar configuración actual como Favorito
  const handleSaveAsFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || cuts.length === 0) return;

    const newTemplate: BatchTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName.trim(),
      supplier: supplier || "Proveedor Habitual",
      defaultCost: totalCost > 0 ? totalCost : undefined,
      cuts: cuts.map((c) => ({
        name: c.name,
        weightKg: c.weightKg,
        wasteKg: c.wasteKg,
        costAttributed: c.costAttributed,
        actualSellPrice: c.actualSellPrice,
      })),
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setNewTemplateName("");
    setShowSaveTemplateModal(false);
    setTemplateActionMessage(`¡Plantilla "${newTemplate.name}" guardada como favorita!`);
    setTimeout(() => setTemplateActionMessage(""), 4000);
  };

  // Cargar una plantilla favorita al simulador
  const handleLoadTemplate = (template: BatchTemplate) => {
    setSupplier(template.supplier || "");
    if (template.defaultCost) setTotalCost(template.defaultCost);
    if (!batchNumber) setBatchNumber(`LOTE-${Date.now().toString().slice(-4)}`);

    const loadedCuts: CutRow[] = template.cuts.map((tCut, index) => {
      const matched = products.find(
        (p) => p.name.toLowerCase().includes(tCut.name.toLowerCase()) ||
               tCut.name.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        id: `cut-${Date.now()}-${index}`,
        productId: matched ? matched.id : "",
        name: matched ? matched.name : tCut.name,
        weightKg: tCut.weightKg,
        wasteKg: tCut.wasteKg,
        costAttributed: tCut.costAttributed || (matched ? matched.costPrice : 0),
        actualSellPrice: tCut.actualSellPrice || (matched ? matched.sellPrice : 0),
      };
    });

    setCuts(loadedCuts);
    setShowLoadTemplateModal(false);
    setTemplateActionMessage(`Plantilla "${template.name}" cargada correctamente.`);
    setTimeout(() => setTemplateActionMessage(""), 4000);
  };

  // Eliminar plantilla favorita
  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Guardar Lote definitivo en la Base de Datos
  const handleSaveBatch = async () => {
    setErrorMessage("");
    setSaveSuccess(false);

    if (cuts.length === 0) {
      setErrorMessage("Agrega al menos un corte para registrar el lote.");
      return;
    }

    if (totalCost <= 0) {
      setErrorMessage("Ingresa el gasto total pagado por el pedido.");
      return;
    }

    const unlinked = cuts.find((c) => !c.productId);
    if (unlinked) {
      setErrorMessage(`El corte "${unlinked.name}" debe asignarse a un producto del catálogo.`);
      return;
    }

    setIsSaving(true);
    try {
      const generatedCode = batchNumber.trim() || `LOTE-${Date.now().toString().slice(-4)}`;

      const payload = {
        batchNumber: generatedCode,
        supplier: supplier.trim() || (purchaseMode === "CATTLE_LIVE" ? "Ganado en Pie" : "Proveedor Mayorista"),
        batchType: "MEAT_WHOLESALE",
        totalCost,
        totalWeightKg: purchaseMode === "CATTLE_LIVE" ? liveWeightKg : metrics.totalWeightKg,
        notes:
          purchaseMode === "CATTLE_LIVE"
            ? `Res en Pie: ${liveWeightKg} kg @ ${formatCurrency(pricePerKgLive)}/kg | Rendimiento: ${cattleYield.yieldPercent}% (${cattleYield.totalAprovechableKg} kg) | Merma: ${cattleYield.wastePercent}% (${cattleYield.wasteKg} kg) | Costo Prom: ${formatCurrency(cattleYield.averageCostPerAprovechableKg)}/kg`
            : "Compra mayorista estándar de carne",
        items: cuts.map((c) => ({
          productId: c.productId,
          quantityKg: c.weightKg,
          wasteKg: c.wasteKg,
          costAttributed: c.costAttributed,
          suggestedSellPrice: calculatePriceForTargetMargin(c.costAttributed, targetMargin, 0),
          actualSellPrice: c.actualSellPrice,
        })),
      };

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error al guardar");

      setSaveSuccess(true);
      if (onBatchSaved) onBatchSaved();
      handleResetToZero();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al registrar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabecera con Acciones Rápidas */}
      <Card className="shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Beef className="w-5 h-5 text-slate-700" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Simulador de Pedido y Desposte de Carnes
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Inicia desde cero o carga una plantilla favorita para proyectar y blindar tu margen real del 30%.
            </p>
          </div>

          {/* Botones de Plantillas y Limpieza */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLoadTemplateModal(true)}
              className="text-xs"
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1 text-slate-600" />
              Cargar Favorito ({templates.length})
            </Button>

            {cuts.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveTemplateModal(true)}
                  className="text-xs"
                >
                  <Bookmark className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  Guardar como Favorito
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToZero}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Limpiar a 0
                </Button>
              </>
            )}

            {/* Badge de Margen */}
            {isCleanState ? (
              <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                Lote en Blanco • Inicia en 0
              </Badge>
            ) : (
              <Badge
                variant={metrics.isMarginSatisfied ? "success" : "destructive"}
                className="px-3 py-1.5 text-xs font-semibold"
              >
                {metrics.isMarginSatisfied ? (
                  <Check className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                )}
                Margen Global: {metrics.realMarginPercent}%{" "}
                {metrics.isMarginSatisfied ? "(≥ 30% OK)" : "(Bajo 30%)"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {templateActionMessage && (
        <Alert variant="success" className="py-2.5">
          <BookmarkCheck className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">
            {templateActionMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Datos del Pedido */}
      <Card className="shadow-xs">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Datos de la Compra Mayorista
              </CardTitle>
              <CardDescription className="text-xs">
                {purchaseMode === "CATTLE_LIVE"
                  ? "Calcula el costo del animal por peso vivo, rendimiento y merma de desposte."
                  : "Especifica el costo total del pedido y el proveedor."}
              </CardDescription>
            </div>

            {/* Selector de Modalidad */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setPurchaseMode("CATTLE_LIVE");
                  setTotalCost(Math.round(liveWeightKg * pricePerKgLive));
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  purchaseMode === "CATTLE_LIVE"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Beef className="w-3.5 h-3.5 text-red-600" />
                <span>Res / Ganado en Pie</span>
              </button>
              <button
                type="button"
                onClick={() => setPurchaseMode("DIRECT_BATCH")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  purchaseMode === "DIRECT_BATCH"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Lote Fijo</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
          {purchaseMode === "CATTLE_LIVE" ? (
            <>
              {/* Campos de Entrada para Res en Pie */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peso Vivo (kg) *
                  </label>
                  <CleanNumberInput
                    placeholder="515"
                    value={liveWeightKg}
                    onChange={(val) => setLiveWeightKg(val)}
                    className="font-bold text-slate-900 text-sm h-9 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Peso del animal en báscula</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Precio por Kg Vivo ($) *
                  </label>
                  <CurrencyInput
                    prefix="$"
                    placeholder="7600"
                    value={pricePerKgLive}
                    onChange={(val) => setPricePerKgLive(val)}
                    className="font-bold text-slate-900 text-sm h-9 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Precio pactado por kg vivo</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Costo Total del Animal
                  </label>
                  <div className="h-9 px-3 bg-slate-100 rounded-md border border-slate-200 flex items-center font-bold text-slate-900 text-sm">
                    {formatCurrency(cattleYield.totalAnimalCost)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Calculado automáticamente</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Código de Lote / Proveedor
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      type="text"
                      placeholder="LOTE-RES-01"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="h-9 text-xs bg-white flex-1"
                    />
                    <Input
                      type="text"
                      placeholder="Proveedor"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="h-9 text-xs bg-white flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta de Rendimiento y Costo Real de la Res (Visual Solicitado) */}
              <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold tracking-wider uppercase text-slate-200">
                      Rendimiento y Costo Real de la Res
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={cattleYield.yieldPercent >= 50 ? "success" : "warning"}
                      className="text-[10px] font-bold"
                    >
                      Rendimiento: {cattleYield.yieldPercent}%
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-slate-300 border-slate-700">
                      Merma: {cattleYield.wastePercent}%
                    </Badge>
                  </div>
                </div>

                {/* Resumen 4 Bloques: Costo, Peso Vivo, Merma, Peso Aprovechable */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Costo del Animal</span>
                    <strong className="text-sm sm:text-base font-bold text-white block mt-0.5">
                      {formatCurrency(cattleYield.totalAnimalCost)}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {liveWeightKg} kg × {formatCurrency(pricePerKgLive)}
                    </span>
                  </div>

                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peso Vivo</span>
                    <strong className="text-sm sm:text-base font-bold text-white block mt-0.5">
                      {formatWeight(liveWeightKg)}
                    </strong>
                    <span className="text-[10px] text-slate-400">Animal en pie</span>
                  </div>

                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Merma</span>
                    <strong className="text-sm sm:text-base font-bold text-amber-300 block mt-0.5">
                      {formatWeight(cattleYield.wasteKg)} · {cattleYield.wastePercent}%
                    </strong>
                    <span className="text-[10px] text-slate-400">Hueso blanco, vísceras</span>
                  </div>

                  <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peso Aprovechable</span>
                    <strong className="text-sm sm:text-base font-bold text-emerald-400 block mt-0.5">
                      {formatWeight(cattleYield.totalAprovechableKg)} · {cattleYield.yieldPercent}%
                    </strong>
                    <span className="text-[10px] text-slate-400">Cortes vendibles ({cuts.length})</span>
                  </div>
                </div>

                {/* Fila Financiera: Costo Promedio, Valor Venta, Utilidad y Margen */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Costo Promedio</span>
                    <strong className="text-sm font-bold text-slate-200">
                      {formatCurrency(cattleYield.averageCostPerAprovechableKg)}/kg
                    </strong>
                    <span className="text-[10px] text-slate-500 block">por kg vendible</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Potencial Venta</span>
                    <strong className="text-sm font-bold text-slate-100">
                      {formatCurrency(cattleYield.totalPotentialRevenue)}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">facturación estimada</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Utilidad Potencial</span>
                    <strong className={`text-sm font-bold ${cattleYield.totalPotentialProfit > 0 ? "text-emerald-400" : "text-slate-300"}`}>
                      {cattleYield.totalPotentialProfit > 0 ? `+${formatCurrency(cattleYield.totalPotentialProfit)}` : formatCurrency(cattleYield.totalPotentialProfit)}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">ganancia bruta</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Margen Bruto Real</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge
                        variant={cattleYield.totalPotentialMarginPercent >= targetMargin ? "success" : "destructive"}
                        className="text-[10px] font-bold"
                      >
                        {cattleYield.totalPotentialMarginPercent}%
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {cattleYield.totalPotentialMarginPercent >= targetMargin ? "(≥ 30% OK)" : "(Bajo)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validación de consistencia */}
                {cattleYield.validationMessage && (
                  <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-2.5 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{cattleYield.validationMessage}</span>
                  </div>
                )}

                {/* Botón de Costeo por Valor Relativo */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                  <div className="text-[11px] text-slate-300 leading-snug">
                    <strong className="text-white block">Costeo por Valor Relativo de Venta:</strong>
                    Distribuye los {formatCurrency(cattleYield.totalAnimalCost)} entre los cortes según el valor comercial de cada uno (los cortes finos absorben mayor costo).
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyRelativeCostDistribution}
                    disabled={cattleYield.cutAttributions.length === 0 || !cattleYield.isCoherent}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 shrink-0 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Distribuir Costo por Valor Relativo
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Modo Lote Directo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Gasto Total del Pedido ($) *
                  </label>
                  <CurrencyInput
                    prefix="$"
                    placeholder="0"
                    value={totalCost}
                    onChange={(val) => setTotalCost(val)}
                    className="font-bold text-slate-900 text-base"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">¿Cuánto pagaste por toda la carne?</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Código de Lote
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: LOTE-RES-01"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Proveedor / Frigorífico
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Frigorífico Central"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>
              </div>

              {/* Resumen 4 Métricas Estándar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gasto Total</span>
                  <strong className="text-sm font-bold text-slate-900">
                    {formatCurrency(totalCost)}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Venta Proyectada</span>
                  <strong className="text-sm font-bold text-slate-900">
                    {formatCurrency(metrics.projectedRevenue)}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Utilidad Real</span>
                  <strong className={`text-sm font-bold ${metrics.projectedProfit > 0 ? "text-emerald-700" : "text-slate-900"}`}>
                    {metrics.projectedProfit > 0 ? `+${formatCurrency(metrics.projectedProfit)}` : formatCurrency(metrics.projectedProfit)}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peso Vendible</span>
                  <strong className="text-sm font-bold text-slate-900">
                    {formatWeight(metrics.totalSellableWeightKg)}
                  </strong>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alerta de Déficit si no cumple 30% */}
      {!isCleanState && !metrics.isMarginSatisfied && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-bold">
            Margen Real Insuficiente ({metrics.realMarginPercent}%)
          </AlertTitle>
          <AlertDescription className="text-xs">
            Faltan <strong>{formatCurrency(metrics.revenueDeficit)}</strong> en facturación para alcanzar el 30% de utilidad real.
            Ajusta los precios de venta ($X) en los cortes más demandados para compensar el gasto del pedido.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de Cortes */}
      <Card className="shadow-xs">
        <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Desglose de Cortes y Fijación de Precios
            </CardTitle>
            <CardDescription className="text-xs">
              {cuts.length === 0
                ? "Agrega cortes para desglosar el peso y asignar precios de venta."
                : `${cuts.length} corte(s) agregados`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {purchaseMode === "CATTLE_LIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyRelativeCostDistribution}
                disabled={cuts.length === 0}
                className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                title="Distribuye el costo total del animal proporcionalmente al valor comercial de cada corte"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Costeo Relativo
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleAddCut} className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar Corte
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {cuts.length === 0 ? (
            <div className="p-10 text-center border-t border-slate-100 bg-slate-50/30 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Beef className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Simulador en blanco (0 cortes)
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Empieza agregando tus cortes de carne manualmente o carga una plantilla favorita para compras recurrentes.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" onClick={handleAddCut} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Agregar Primer Corte
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoadTemplateModal(true)}
                  className="text-xs"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1" />
                  Cargar desde Favoritos
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* VISTA MÓVIL: Tarjetas de Cortes (md:hidden) */}
              <div className="md:hidden p-3 space-y-3">
                {cuts.map((cut, idx) => {
                  const suggested = calculatePriceForTargetMargin(cut.costAttributed, targetMargin, 0);
                  const margin = calculateRealMargin(cut.costAttributed, cut.actualSellPrice);
                  const subtotal = cut.weightKg * cut.actualSellPrice;

                  return (
                    <div key={cut.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-xs">
                      {/* Header: Producto y Eliminar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Corte #{idx + 1}
                          </label>
                          <select
                            value={cut.productId}
                            onChange={(e) => handleCutChange(cut.id, "productId", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
                          >
                            <option value="">-- Seleccionar producto --</option>
                            {products
                              .filter(
                                (p: any) =>
                                  p.isMeatCut ||
                                  p.category?.slug?.includes("res") ||
                                  p.category?.slug?.includes("cerdo") ||
                                  p.category?.slug?.includes("pollo") ||
                                  p.category?.type === "CARNICERIA"
                              )
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                          {!cut.productId && (
                            <input
                              type="text"
                              value={cut.name}
                              onChange={(e) => handleCutChange(cut.id, "name", e.target.value)}
                              className="mt-1.5 w-full text-xs text-slate-700 bg-slate-50 border border-dashed border-slate-200 rounded px-2 py-1 focus:outline-none focus:bg-white"
                              placeholder="O escribe nombre del corte..."
                            />
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveCut(cut.id)}
                          className="p-2 text-slate-400 hover:text-red-600 rounded-lg active:bg-red-50 transition-colors"
                          title="Eliminar corte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Pesos: Vendible y Merma */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Peso Vendible (Kg)</label>
                          <CleanNumberInput
                            value={cut.weightKg}
                            onChange={(val) => handleCutChange(cut.id, "weightKg", val)}
                            className="w-full px-2 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-md text-right"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Merma (Kg)</label>
                          <CleanNumberInput
                            value={cut.wasteKg}
                            onChange={(val) => handleCutChange(cut.id, "wasteKg", val)}
                            className="w-full px-2 py-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-md text-right"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Costo y Venta */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">Costo Atribuido ($/Kg)</label>
                          <CurrencyInput
                            value={cut.costAttributed}
                            onChange={(val) => handleCutChange(cut.id, "costAttributed", val)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-right"
                            placeholder="0"
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            <span>Sug. 30%: <span className="font-mono font-medium text-slate-600">{formatCurrency(suggested)}</span></span>
                            {purchaseMode === "CATTLE_LIVE" && (
                              <span className="text-emerald-700 font-semibold">
                                {cattleYield.cutAttributions.find((a) => a.id === cut.id)?.valueSharePercent || 0}% valor
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-900">Precio Venta ($)</label>
                            <Badge
                              variant={margin >= 30 ? "success" : "destructive"}
                              className="text-[9px] font-bold px-1.5 py-0"
                            >
                              {margin}%
                            </Badge>
                          </div>
                          <CurrencyInput
                            value={cut.actualSellPrice}
                            onChange={(val) => handleCutChange(cut.id, "actualSellPrice", val)}
                            className="w-full px-2 py-1.5 text-xs font-bold text-slate-900 bg-emerald-50/50 border border-emerald-200 rounded-md text-right focus:bg-white"
                            placeholder="0"
                          />
                          <div className="text-[10px] text-slate-500 mt-1 text-right">
                            Subtotal: <strong className="text-slate-900">{formatCurrency(subtotal)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VISTA ESCRITORIO: Tabla Completa (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto touch-scroll">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Corte / Producto</TableHead>
                    <TableHead className="text-right">Kg</TableHead>
                    <TableHead className="text-right">Merma (Kg)</TableHead>
                    <TableHead className="text-right">Costo/Kg</TableHead>
                    <TableHead className="text-right">Sugerido (30%)</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">Precio Venta ($X)</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-center">Margen</TableHead>
                    <TableHead className="text-center w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuts.map((cut) => {
                    const suggested = calculatePriceForTargetMargin(cut.costAttributed, targetMargin, 0);
                    const margin = calculateRealMargin(cut.costAttributed, cut.actualSellPrice);
                    const subtotal = cut.weightKg * cut.actualSellPrice;

                    return (
                      <TableRow key={cut.id}>
                        <TableCell className="font-medium">
                          <select
                            value={cut.productId}
                            onChange={(e) => handleCutChange(cut.id, "productId", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none"
                          >
                            <option value="">-- Seleccionar producto --</option>
                            {products
                              .filter(
                                (p: any) =>
                                  p.isMeatCut ||
                                  p.category?.slug?.includes("res") ||
                                  p.category?.slug?.includes("cerdo") ||
                                  p.category?.slug?.includes("pollo") ||
                                  p.category?.type === "CARNICERIA"
                              )
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                          {!cut.productId && (
                            <input
                              type="text"
                              value={cut.name}
                              onChange={(e) => handleCutChange(cut.id, "name", e.target.value)}
                              className="mt-1 w-full text-xs text-slate-500 border-b border-slate-200 focus:outline-none"
                              placeholder="Nombre corte"
                            />
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <CleanNumberInput
                            value={cut.weightKg}
                            onChange={(val) => handleCutChange(cut.id, "weightKg", val)}
                            className="w-16 px-1.5 py-1 text-right text-xs font-semibold"
                            placeholder="0"
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <CleanNumberInput
                            value={cut.wasteKg}
                            onChange={(val) => handleCutChange(cut.id, "wasteKg", val)}
                            className="w-14 px-1.5 py-1 text-right text-xs text-slate-400"
                            placeholder="0"
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <CurrencyInput
                            value={cut.costAttributed}
                            onChange={(val) => handleCutChange(cut.id, "costAttributed", val)}
                            className="w-24 px-1.5 py-1 text-right text-xs"
                            placeholder="0"
                          />
                          {purchaseMode === "CATTLE_LIVE" && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              {cattleYield.cutAttributions.find((a) => a.id === cut.id)?.valueSharePercent || 0}% valor
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs text-slate-400 font-mono">
                          {formatCurrency(suggested)}
                        </TableCell>

                        <TableCell className="text-right">
                          <CurrencyInput
                            value={cut.actualSellPrice}
                            onChange={(val) => handleCutChange(cut.id, "actualSellPrice", val)}
                            className="w-24 px-1.5 py-1 text-right text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white"
                            placeholder="0"
                          />
                        </TableCell>

                        <TableCell className="text-right font-bold text-xs text-slate-900">
                          {formatCurrency(subtotal)}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant={margin >= 30 ? "success" : "destructive"}
                            className="text-[10px] font-bold px-1.5 py-0.2"
                          >
                            {margin}%
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <button
                            onClick={() => handleRemoveCut(cut.id)}
                            className="text-slate-400 hover:text-red-600 cursor-pointer p-1"
                            title="Eliminar corte"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

          {errorMessage && (
            <div className="p-4 border-t border-slate-100">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          {saveSuccess && (
            <div className="p-4 border-t border-slate-100">
              <Alert variant="success">
                <Check className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  ¡Pedido guardado con éxito! Se añadieron los kilos al inventario y se fijaron los precios de venta.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>

        {cuts.length > 0 && (
          <CardFooter className="p-4 sm:p-5 flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveTemplateModal(true)}
              className="text-xs w-full sm:w-auto h-10 sm:h-9"
            >
              <Bookmark className="w-3.5 h-3.5 mr-1.5" />
              Guardar este lote como Favorito
            </Button>

            <Button
              onClick={handleSaveBatch}
              disabled={isSaving}
              size="default"
              className="text-xs font-semibold w-full sm:w-auto h-11 sm:h-9"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSaving ? "Guardando..." : "Guardar Pedido e Ingresar al Inventario"}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Diálogo Guardar como Favorito */}
      <Dialog open={showSaveTemplateModal} onOpenChange={setShowSaveTemplateModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guardar como Plantilla Favorita</DialogTitle>
            <DialogDescription>
              Guarda este desglose de {cuts.length} cortes para cargarlo rápidamente en tus futuras compras.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAsFavorite} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nombre de la Plantilla Favorita *
              </label>
              <Input
                type="text"
                required
                placeholder="Ej: Media Res Novillo (8 cortes)"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowSaveTemplateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Guardar Favorito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo Cargar Plantilla Favorita */}
      <Dialog open={showLoadTemplateModal} onOpenChange={setShowLoadTemplateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cargar Plantilla Favorita</DialogTitle>
            <DialogDescription>
              Selecciona una compra frecuente guardada para cargar automáticamente sus cortes y pesos.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-2 my-2 pr-1">
            {templates.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No tienes plantillas guardadas aún.
              </div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl)}
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800" />
                      {tpl.name}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {tpl.supplier || "Proveedor"} • {tpl.cuts.length} cortes configurados
                      {tpl.defaultCost ? ` • Gasto: ${formatCurrency(tpl.defaultCost)}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" className="h-7 text-[11px]">
                      Cargar
                    </Button>
                    {tpl.id !== "preset-media-res" && (
                      <button
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowLoadTemplateModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
