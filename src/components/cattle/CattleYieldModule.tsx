"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  calculateAnimalDeboning,
  calculateMaxPurchasePrice,
  generatePurchaseScenarios,
  computeHistoricalYieldStats,
  formatMoney,
  formatWeightNumber,
  AnimalType,
  CutClassification,
  DeboningCutInput,
  AdditionalCosts,
  REFERENCE_CATTLE_FIXTURE,
  DEFAULT_COLOMBIAN_BEEF_BENCHMARKS,
  HistoricalYieldStats,
  isMeatProduct,
  isBeefProduct,
} from "@/lib/cattleEngine";
import {
  Beef,
  Scale,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  Calculator,
  Layers,
  PackagePlus,
  Check,
  Eye,
  Info,
  ExternalLink,
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

interface ProductOption {
  id: string;
  name: string;
  sellPrice: number;
  marketPrice?: number;
  costPrice?: number;
  classification?: string;
  unit: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    type: string;
  };
  isMeatCut?: boolean;
}

export function CattleYieldModule({ onInventoryUpdated }: { onInventoryUpdated?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<
    "workflow" | "calculator" | "history" | "catalog"
  >("workflow");

  // Estado del Formulario de Compra
  const [animalType, setAnimalType] = useState<AnimalType>("Novilla");
  const [batchNumber, setBatchNumber] = useState("LOTE-RES-515");
  const [supplier, setSupplier] = useState("Ganadería La Esperanza");
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [liveWeightKg, setLiveWeightKg] = useState<number>(515);
  const [pricePerKgLive, setPricePerKgLive] = useState<number>(7600);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(30);
  const [notes, setNotes] = useState<string>("");

  // Costos Adicionales
  const [showAdditionalCosts, setShowAdditionalCosts] = useState(true);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCosts>({
    transport: 100000,
    slaughter: 150000,
    deboning: 100000,
    labor: 0,
    cooling: 0,
    packaging: 0,
    other: 0,
    notes: "",
  });

  // Cortes del Desposte
  const [cuts, setCuts] = useState<DeboningCutInput[]>([]);

  // Datos del Catálogo y Benchmarks
  const [catalogProducts, setCatalogProducts] = useState<ProductOption[]>([]);
  const [historicalStats, setHistoricalStats] = useState<HistoricalYieldStats>({
    totalAnimalsRecorded: 0,
    averageLiveWeightKg: 515,
    averageYieldPercent: 55.0,
    averageTotalCost: 3914000,
    averageGrossProfit: 1172250,
    averageMarginOnSalesPercent: 23.05,
    cutBenchmarks: DEFAULT_COLOMBIAN_BEEF_BENCHMARKS,
  });

  // Historial de compras de ganado
  const [pastPurchases, setPastPurchases] = useState<any[]>([]);
  const [selectedAuditPurchase, setSelectedAuditPurchase] = useState<any | null>(null);

  // Estados de proceso
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Modal para agregar producto al catálogo
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductClassification, setNewProductClassification] =
    useState<CutClassification>("COMERCIALIZABLE");
  const [newProductSellPrice, setNewProductSellPrice] = useState<number>(20000);
  const [newProductMarketPrice, setNewProductMarketPrice] = useState<number>(22000);

  // Estado del Cotizador "¿Cuánto puedo pagar?"
  const [calcLiveWeight, setCalcLiveWeight] = useState<number>(515);
  const [calcExpectedYield, setCalcExpectedYield] = useState<number>(55);
  const [calcAdditionalCosts, setCalcAdditionalCosts] = useState<number>(350000);
  const [calcTargetMargin, setCalcTargetMargin] = useState<number>(20);
  const [calcRevenuePerKg, setCalcRevenuePerKg] = useState<number>(18000);

  // 1. Cargar productos, benchmarks y compras iniciales
  const loadData = async () => {
    try {
      const [prodRes, statsRes, purchasesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/cattle/stats"),
        fetch("/api/cattle/purchases"),
      ]);

      const prodData = await prodRes.json();
      if (prodData.success && prodData.data) {
        // Filtrar estrictamente solo cortes de ganado/res (excluye pescados, cerdo, pollo, legumbres y abarrotes)
        const beefOnlyProducts = prodData.data.filter(isBeefProduct);
        setCatalogProducts(beefOnlyProducts);
      }

      const statsData = await statsRes.json();
      if (statsData.success && statsData.data) {
        setHistoricalStats(statsData.data);
      }

      const purchasesData = await purchasesRes.json();
      if (purchasesData.success && purchasesData.data) {
        setPastPurchases(purchasesData.data);
      }
    } catch (e) {
      console.error("Error al cargar datos de ganado:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Cargar automáticamente el fixture de prueba de 515 kg al iniciar si cuts está vacío
  useEffect(() => {
    if (cuts.length === 0) {
      loadFixture();
    }
  }, [catalogProducts]);

  const loadFixture = () => {
    setLiveWeightKg(REFERENCE_CATTLE_FIXTURE.liveWeightKg);
    setPricePerKgLive(REFERENCE_CATTLE_FIXTURE.pricePerKgLive);
    setAdditionalCosts({ ...REFERENCE_CATTLE_FIXTURE.additionalCosts, notes: "Gastos de flete y faenado" });

    const fixtureCuts: DeboningCutInput[] = REFERENCE_CATTLE_FIXTURE.cuts.map((c, i) => {
      const matched = catalogProducts.find(
        (p) => p.name.toLowerCase().includes(c.name.toLowerCase()) ||
               c.name.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        id: `fix-cut-${i}`,
        productId: matched?.id || undefined,
        productName: c.name,
        classification: c.classification,
        weightKg: c.weightKg,
        actualSellPrice: c.sellPrice,
        marketPrice: matched?.marketPrice || c.sellPrice + 1000,
        expectedWeightKg: Number((515 * ((c.weightKg / 515))).toFixed(2)),
      };
    });

    setCuts(fixtureCuts);
  };

  // Cargar estimación estadística a partir del peso en pie y los benchmarks históricos
  const handleApplyHistoricalBenchmarks = () => {
    const benchmarks = historicalStats.cutBenchmarks.length > 0
      ? historicalStats.cutBenchmarks
      : DEFAULT_COLOMBIAN_BEEF_BENCHMARKS;

    const newCuts: DeboningCutInput[] = benchmarks.map((b, i) => {
      const estimatedWeight = Number(
        (liveWeightKg * (b.averagePercentageOfLiveWeight / 100)).toFixed(2)
      );

      const matched = catalogProducts.find(
        (p) => p.name.toLowerCase().includes(b.productName.toLowerCase()) ||
               b.productName.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        id: `bench-cut-${Date.now()}-${i}`,
        productId: matched?.id || undefined,
        productName: b.productName,
        classification: b.classification,
        weightKg: estimatedWeight, // Estimación sugerida
        actualSellPrice: matched?.sellPrice || b.lastUsedSellPrice || 20000,
        marketPrice: matched?.marketPrice || (matched?.sellPrice ? matched.sellPrice + 1000 : 21000),
        expectedWeightKg: estimatedWeight,
      };
    });

    setCuts(newCuts);
    setSaveSuccessMsg(`¡${newCuts.length} cortes estimados cargados a partir del promedio histórico para ${liveWeightKg} kg!`);
    setTimeout(() => setSaveSuccessMsg(""), 4000);
  };

  // 3. Cálculo en tiempo real con el motor financiero
  const deboningResult = useMemo(() => {
    return calculateAnimalDeboning(
      liveWeightKg,
      pricePerKgLive,
      additionalCosts,
      cuts,
      targetMarginPercent
    );
  }, [liveWeightKg, pricePerKgLive, additionalCosts, cuts, targetMarginPercent]);

  // Manejo de cambios en los cortes
  const handleCutChange = (id: string, field: keyof DeboningCutInput, value: any) => {
    setCuts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        if (field === "productId") {
          const prod = catalogProducts.find((p) => p.id === value);
          if (prod) {
            updated.productName = prod.name;
            updated.actualSellPrice = prod.sellPrice;
            updated.marketPrice = prod.marketPrice || prod.sellPrice;
            if (prod.classification) {
              updated.classification = prod.classification as CutClassification;
            }
          }
        }
        return updated;
      })
    );
  };

  const handleAddCut = () => {
    const newId = `new-cut-${Date.now()}`;
    setCuts((prev) => [
      ...prev,
      {
        id: newId,
        productName: `Corte #${prev.length + 1}`,
        classification: "COMERCIALIZABLE",
        weightKg: 10.0,
        actualSellPrice: 20000,
        marketPrice: 21000,
        expectedWeightKg: 10.0,
      },
    ]);
  };

  const handleRemoveCut = (id: string) => {
    setCuts((prev) => prev.filter((c) => c.id !== id));
  };

  // Crear nuevo producto en el catálogo desde este módulo
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    try {
      // Asignar categoría de Carnes de Res por defecto
      const defaultCatId =
        catalogProducts.find((p) => p.category?.slug === "carnes-res")?.categoryId ||
        "cmtq8g9ek0000vao8zrd3ezat";

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProductName.trim(),
          categoryId: defaultCatId,
          unit: "kg",
          sellPrice: newProductSellPrice,
          marketPrice: newProductMarketPrice,
          isMeatCut: true,
          classification: newProductClassification,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setCatalogProducts((prev) => [...prev, data.data]);
        setShowNewProductModal(false);
        setNewProductName("");
        setSaveSuccessMsg(`¡Producto "${data.data.name}" agregado al catálogo con éxito!`);
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        setErrorMessage(data.error || "Error al crear producto");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar");
    }
  };

  // Guardar compra y desposte en base de datos
  const handleSavePurchaseAndDebone = async (confirmToInventory: boolean) => {
    setIsSaving(true);
    setErrorMessage("");
    setSaveSuccessMsg("");

    try {
      if (liveWeightKg <= 0 || pricePerKgLive <= 0) {
        throw new Error("Ingresa el peso en pie y el precio por kilo válido.");
      }

      const payload = {
        batchNumber: batchNumber.trim() || `RES-${Date.now().toString().slice(-4)}`,
        animalType,
        supplier: supplier.trim() || "Ganado en Pie",
        purchaseDate,
        liveWeightKg,
        pricePerKgLive,
        additionalCosts,
        targetMarginPercent,
        notes,
        cuts,
      };

      // 1. Guardar la compra
      const res = await fetch("/api/cattle/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error al guardar compra");

      const createdPurchaseId = data.data.id;

      // 2. Si se solicitó cargar al inventario
      if (confirmToInventory) {
        const invRes = await fetch(
          `/api/cattle/purchases/${createdPurchaseId}/confirm-inventory`,
          { method: "POST" }
        );
        const invData = await invRes.json();
        if (!invData.success) throw new Error(invData.error || "Error al ingresar al inventario");

        setSaveSuccessMsg(
          `¡Desposte confirmado! Se cargaron los ${deboningResult.totalSellableWeightKg} kg al inventario de productos y se sincronizó con el lote ${payload.batchNumber}.`
        );
        if (onInventoryUpdated) onInventoryUpdated();
      } else {
        setSaveSuccessMsg(`¡Registro de compra y desposte de ${animalType} guardado con éxito!`);
      }

      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar el guardado");
    } finally {
      setIsSaving(false);
    }
  };

  // Cotizador "¿Cuánto puedo pagar?" en tiempo real
  const maxPurchaseCalc = useMemo(() => {
    return calculateMaxPurchasePrice({
      liveWeightKg: calcLiveWeight,
      expectedYieldPercent: calcExpectedYield,
      expectedRevenuePerAprovechableKg: calcRevenuePerKg,
      estimatedAdditionalCosts: calcAdditionalCosts,
      targetMarginPercent: calcTargetMargin,
    });
  }, [calcLiveWeight, calcExpectedYield, calcRevenuePerKg, calcAdditionalCosts, calcTargetMargin]);

  const purchaseScenarios = useMemo(() => {
    return generatePurchaseScenarios(
      calcLiveWeight,
      calcExpectedYield,
      calcRevenuePerKg,
      calcAdditionalCosts,
      calcTargetMargin
    );
  }, [calcLiveWeight, calcExpectedYield, calcRevenuePerKg, calcAdditionalCosts, calcTargetMargin]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Barra de Navegación del Módulo */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
            <Beef className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Rendimiento y Costeo de Ganado
              <Badge variant="outline" className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border-emerald-200">
                Aprende de tu historial
              </Badge>
            </h1>
            <p className="text-xs text-slate-500">
              Control de compra en pie, pesaje de desposte, costeo por valor comercial y rentabilidad.
            </p>
          </div>
        </div>

        {/* Pestañas Secundarias */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab("workflow")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "workflow"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>1. Registro & Desposte</span>
          </button>

          <button
            onClick={() => setActiveSubTab("calculator")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "calculator"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. ¿Cuánto puedo pagar?</span>
          </button>

          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "history"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>3. Historial ({pastPurchases.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("catalog")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "catalog"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>4. Catálogo Cortes</span>
          </button>
        </div>
      </div>

      {/* Alertas de Acción Globales */}
      {saveSuccessMsg && (
        <Alert variant="success" className="py-2.5">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-xs font-semibold">{saveSuccessMsg}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-semibold">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* PESTAÑA 1: FLUJO DE COMPRA Y DESPOSTE */}
      {activeSubTab === "workflow" && (
        <div className="space-y-6">
          {/* PASO 1: REGISTRO DE COMPRA EN PIE */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Datos de Compra del Animal en Pie
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs ml-8">
                    Ingresa el tipo de ganado, peso en báscula, precio pactado y costos adicionales recuperables.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFixture}
                    className="text-xs border-dashed"
                    title="Carga los 515 kg y 11 cortes del ejemplo de referencia"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    Ejemplo Novilla 515 kg
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
              {/* Formulario de Compra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Animal *
                  </label>
                  <select
                    value={animalType}
                    onChange={(e) => setAnimalType(e.target.value as AnimalType)}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="Novilla">Novilla</option>
                    <option value="Novillo">Novillo</option>
                    <option value="Vaca">Vaca</option>
                    <option value="Toro">Toro</option>
                    <option value="Ternero">Ternero</option>
                    <option value="Otro">Otro Ganado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Peso en Pie (kg) *
                  </label>
                  <CleanNumberInput
                    placeholder="515"
                    value={liveWeightKg}
                    onChange={(val) => setLiveWeightKg(val)}
                    className="font-bold text-slate-900 text-sm h-9 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Peso total del animal</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Precio por kg en Pie ($) *
                  </label>
                  <CurrencyInput
                    prefix="$"
                    placeholder="7600"
                    value={pricePerKgLive}
                    onChange={(val) => setPricePerKgLive(val)}
                    className="font-bold text-slate-900 text-sm h-9 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Precio pactado/kg</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Costo de Adquisición
                  </label>
                  <div className="h-9 px-3 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between font-bold text-slate-900 text-sm">
                    <span>{formatMoney(deboningResult.acquisitionCost)}</span>
                    <span className="text-[10px] text-slate-400 font-normal font-mono">
                      {liveWeightKg} × {formatMoney(pricePerKgLive)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Identificador / Arete / Lote
                  </label>
                  <Input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Ej: LOTE-RES-515"
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Proveedor / Ganadería
                  </label>
                  <Input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Ej: Frigorífico Central"
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Fecha de Compra
                  </label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Margen Objetivo Deseado (%)
                  </label>
                  <CleanNumberInput
                    value={targetMarginPercent}
                    onChange={(val) => setTargetMarginPercent(val)}
                    className="h-9 text-xs font-bold bg-white text-right"
                  />
                </div>
              </div>

              {/* SECCIÓN DE COSTOS ADICIONALES */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdditionalCosts(!showAdditionalCosts)}
                  className="w-full bg-slate-50 hover:bg-slate-100 p-3 text-xs font-bold text-slate-800 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-600" />
                    <span>Costos Adicionales Recuperables</span>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Total: {formatMoney(deboningResult.totalAdditionalCosts)}
                    </Badge>
                  </div>
                  {showAdditionalCosts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdditionalCosts && (
                  <div className="p-3.5 bg-white grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Transporte / Flete</label>
                      <CurrencyInput
                        value={additionalCosts.transport}
                        onChange={(val) => setAdditionalCosts((prev) => ({ ...prev, transport: val }))}
                        className="h-8 text-xs bg-slate-50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Sacrificio / Degüello</label>
                      <CurrencyInput
                        value={additionalCosts.slaughter}
                        onChange={(val) => setAdditionalCosts((prev) => ({ ...prev, slaughter: val }))}
                        className="h-8 text-xs bg-slate-50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Desposte / Carnicero</label>
                      <CurrencyInput
                        value={additionalCosts.deboning}
                        onChange={(val) => setAdditionalCosts((prev) => ({ ...prev, deboning: val }))}
                        className="h-8 text-xs bg-slate-50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Refrigeración / Frío</label>
                      <CurrencyInput
                        value={additionalCosts.cooling}
                        onChange={(val) => setAdditionalCosts((prev) => ({ ...prev, cooling: val }))}
                        className="h-8 text-xs bg-slate-50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Mano de Obra Auxiliar</label>
                      <CurrencyInput
                        value={additionalCosts.labor}
                        onChange={(val) => setAdditionalCosts((prev) => ({ ...prev, labor: val }))}
                        className="h-8 text-xs bg-slate-50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Empaque / Bolsas</label>
                      <CurrencyInput
                        value={additionalCosts.packaging}
                        onChange={(val) => setAdditionalCosts((prev) => ({ ...prev, packaging: val }))}
                        className="h-8 text-xs bg-slate-50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Otros Costos</label>
                      <CurrencyInput
                        value={additionalCosts.other}
                        onChange={(val) => setAdditionalCosts((prev) => ({ ...prev, other: val }))}
                        className="h-8 text-xs bg-slate-50"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Notas de Costos</label>
                      <Input
                        type="text"
                        value={additionalCosts.notes || ""}
                        onChange={(e) => setAdditionalCosts((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Detalle de gastos..."
                        className="h-8 text-xs bg-slate-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen 3 Tarjetas de Costo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Costo de Adquisición</span>
                  <strong className="text-base font-bold text-slate-900 block mt-0.5">
                    {formatMoney(deboningResult.acquisitionCost)}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {liveWeightKg} kg × {formatMoney(pricePerKgLive)}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Costos Adicionales</span>
                  <strong className="text-base font-bold text-amber-700 block mt-0.5">
                    +{formatMoney(deboningResult.totalAdditionalCosts)}
                  </strong>
                  <span className="text-[10px] text-slate-500">Transporte, faena, desposte</span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Costo Total del Animal/Lote</span>
                  <strong className="text-base font-bold text-emerald-400 block mt-0.5">
                    {formatMoney(deboningResult.totalAnimalCost)}
                  </strong>
                  <span className="text-[10px] text-slate-300">Costo total a recuperar en venta</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PASO 2: REGISTRO DE DESPOSTE & PESAJE */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Registro del Desposte & Kilos Obtenidos
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs ml-8">
                    Registra los kilos reales obtenidos por corte. El sistema distribuirá el costo proporcionalmente al valor comercial.
                  </CardDescription>
                </div>

                {/* Acciones de Precarga */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyHistoricalBenchmarks}
                    className="text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                    title="Aplica los porcentajes históricos promedio a los kilos del animal"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Proyectar según Historial
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewProductModal(true)}
                    className="text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nuevo Corte en Catálogo
                  </Button>

                  <Button size="sm" onClick={handleAddCut} className="text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Agregar Fila
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Resumen de Masa y Rendimiento */}
              <div className="bg-slate-900 text-white p-4 mx-4 mb-4 rounded-xl shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peso en Pie</span>
                  <strong className="text-sm sm:text-base font-bold text-white block mt-0.5">
                    {formatWeightNumber(liveWeightKg)}
                  </strong>
                  <span className="text-[10px] text-slate-400">Animal en báscula</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peso Aprovechable</span>
                  <strong className="text-sm sm:text-base font-bold text-emerald-400 block mt-0.5">
                    {formatWeightNumber(deboningResult.totalSellableWeightKg)}
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Rendimiento real: <strong className="text-emerald-300 font-bold">{deboningResult.yieldPercent}%</strong>
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Merma Registrada</span>
                  <strong className="text-sm sm:text-base font-bold text-amber-300 block mt-0.5">
                    {formatWeightNumber(deboningResult.totalWasteKg)}
                  </strong>
                  <span className="text-[10px] text-slate-400">Hueso blanco, recorte</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peso No Recuperado</span>
                  <strong className="text-sm sm:text-base font-bold text-rose-300 block mt-0.5">
                    {formatWeightNumber(deboningResult.unrecoveredWeightKg)}
                  </strong>
                  <span className="text-[10px] text-slate-400">Merma por oteo / pendiente</span>
                </div>
              </div>

              {/* TABLA DE CORTES */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] bg-slate-50">
                      <TableHead className="w-[180px]">Corte / Producto</TableHead>
                      <TableHead className="w-[110px]">Clasificación</TableHead>
                      <TableHead className="text-right">Kilos Reales</TableHead>
                      <TableHead className="text-right">Histórico Sug.</TableHead>
                      <TableHead className="text-right">Precio Venta ($/kg)</TableHead>
                      <TableHead className="text-right">Venta Potencial</TableHead>
                      <TableHead className="text-right">Costo Asig./kg</TableHead>
                      <TableHead className="text-right">Margen/kg</TableHead>
                      <TableHead className="text-right">Precio Sug. 30%</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deboningResult.cuts.map((cut) => {
                      return (
                        <TableRow key={cut.id} className="text-xs">
                          {/* Selector de Producto */}
                          <TableCell className="font-medium p-2">
                            <select
                              value={cut.productId || ""}
                              onChange={(e) => handleCutChange(cut.id, "productId", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:bg-white"
                            >
                              <option value="">-- Personalizado / Escribir corte --</option>
                              {catalogProducts
                                .filter(isBeefProduct)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                            </select>
                            {!cut.productId && (
                              <input
                                type="text"
                                value={cut.productName}
                                onChange={(e) => handleCutChange(cut.id, "productName", e.target.value)}
                                className="mt-1 w-full text-[11px] text-slate-700 border-b border-slate-200 px-1 py-0.5 focus:outline-none"
                                placeholder="Nombre corte"
                              />
                            )}
                          </TableCell>

                          {/* Clasificación */}
                          <TableCell className="p-2">
                            <select
                              value={cut.classification}
                              onChange={(e) =>
                                handleCutChange(cut.id, "classification", e.target.value as CutClassification)
                              }
                              className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] text-slate-700 focus:outline-none"
                            >
                              <option value="COMERCIALIZABLE">Corte Principal</option>
                              <option value="SUBPRODUCTO">Subproducto</option>
                              <option value="MERMA">Merma</option>
                              <option value="DESPERDICIO">Desperdicio</option>
                            </select>
                          </TableCell>

                          {/* Kilos Reales */}
                          <TableCell className="text-right p-2">
                            <CleanNumberInput
                              value={cut.weightKg}
                              onChange={(val) => handleCutChange(cut.id, "weightKg", val)}
                              className="w-16 px-1.5 py-1 text-right text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded"
                              placeholder="0"
                            />
                          </TableCell>

                          {/* Kilos Históricos y Variación */}
                          <TableCell className="text-right p-2 text-[11px] text-slate-500 font-mono">
                            {cut.expectedWeightKg > 0 ? (
                              <div>
                                <span>{cut.expectedWeightKg} kg</span>
                                <span
                                  className={`block text-[10px] ${
                                    cut.weightDiffKg >= 0 ? "text-emerald-600" : "text-amber-600"
                                  }`}
                                >
                                  {cut.weightDiffKg >= 0 ? `+${cut.weightDiffKg}` : cut.weightDiffKg} kg ({cut.weightDiffPercent}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>

                          {/* Precio Venta Actual */}
                          <TableCell className="text-right p-2">
                            <CurrencyInput
                              value={cut.actualSellPrice}
                              onChange={(val) => handleCutChange(cut.id, "actualSellPrice", val)}
                              className="w-22 px-1.5 py-1 text-right text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white"
                              placeholder="0"
                            />
                            {cut.marketPrice > 0 && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Ref: {formatMoney(cut.marketPrice)}
                              </span>
                            )}
                          </TableCell>

                          {/* Venta Potencial */}
                          <TableCell className="text-right p-2 font-bold text-slate-900">
                            {formatMoney(cut.potentialRevenue)}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {cut.valueSharePercent}% valor
                            </span>
                          </TableCell>

                          {/* Costo Asignado por Kilo */}
                          <TableCell className="text-right p-2 font-mono text-slate-700">
                            {formatMoney(cut.costAttributedPerKg)}
                            <span className="text-[10px] text-slate-400 block">
                              Total: {formatMoney(cut.costAttributed)}
                            </span>
                          </TableCell>

                          {/* Margen por Kilo y % */}
                          <TableCell className="text-right p-2">
                            <span className={`font-bold ${cut.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                              {cut.profit >= 0 ? `+${formatMoney(cut.actualSellPrice - cut.costAttributedPerKg)}` : formatMoney(cut.actualSellPrice - cut.costAttributedPerKg)}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {cut.realMarginPercent}% real
                            </span>
                          </TableCell>

                          {/* Precio Sugerido 30% */}
                          <TableCell className="text-right p-2 text-[11px] font-mono text-slate-600">
                            {formatMoney(cut.recommendedPrice)}
                            <span className="text-[10px] text-slate-400 block">
                              Mín: {formatMoney(cut.minSellPrice)}
                            </span>
                          </TableCell>

                          {/* Semáforo Accesible */}
                          <TableCell className="text-center p-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                cut.profitabilityStatus === "RENTABLE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : cut.profitabilityStatus === "BAJO_MARGEN"
                                  ? "bg-amber-100 text-amber-800"
                                  : cut.profitabilityStatus === "SIN_MARGEN"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {cut.profitabilityStatus === "RENTABLE" && <Check className="w-3 h-3" />}
                              {cut.profitabilityStatus === "BAJO_MARGEN" && <AlertTriangle className="w-3 h-3" />}
                              {cut.profitabilityStatus === "PERDIDA" && <AlertCircle className="w-3 h-3" />}
                              {cut.profitabilityStatus === "RENTABLE"
                                ? "Rentable"
                                : cut.profitabilityStatus === "BAJO_MARGEN"
                                ? "Bajo Margen"
                                : cut.profitabilityStatus === "SIN_MARGEN"
                                ? "Equilibrio"
                                : "Pérdida"}
                            </span>
                          </TableCell>

                          {/* Eliminar */}
                          <TableCell className="text-center p-2">
                            <button
                              onClick={() => handleRemoveCut(cut.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded"
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
            </CardContent>
          </Card>

          {/* PASO 3: DASHBOARD DEL ANIMAL & CONFIRMACIÓN */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Dashboard del Animal y Análisis Financiero
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Resumen consolidado de rentabilidad, balance de masa y estado de precios antes de integrar a inventario.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
              {/* Métricas Principales del Animal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor Potencial Venta</span>
                  <strong className="text-sm sm:text-base font-bold text-slate-900 block mt-0.5">
                    {formatMoney(deboningResult.totalPotentialRevenue)}
                  </strong>
                  <span className="text-[10px] text-slate-400">{deboningResult.totalSellableWeightKg} kg vendibles</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Costo Total del Lote</span>
                  <strong className="text-sm sm:text-base font-bold text-slate-900 block mt-0.5">
                    {formatMoney(deboningResult.totalAnimalCost)}
                  </strong>
                  <span className="text-[10px] text-slate-400">{formatMoney(deboningResult.averageCostPerSellableKg)}/kg vendible</span>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Margen Bruto Total</span>
                  <strong className="text-sm sm:text-base font-bold text-emerald-700 block mt-0.5">
                    +{formatMoney(deboningResult.grossProfit)}
                  </strong>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {deboningResult.marginOnSalesPercent}% sobre venta
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Margen sobre Costo (Markup)</span>
                  <strong className="text-sm sm:text-base font-bold text-slate-900 block mt-0.5">
                    {deboningResult.marginOnCostPercent}%
                  </strong>
                  <span className="text-[10px] text-slate-400">Rendimiento: {deboningResult.yieldPercent}%</span>
                </div>
              </div>

              {/* Alertas y Observaciones del Animal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Top Cortes por Valor */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Mayores Aportes a la Venta
                  </span>
                  <div className="space-y-1">
                    {deboningResult.topCutsByRevenue.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate">{c.productName}</span>
                        <span className="font-bold text-slate-900">{formatMoney(c.potentialRevenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cortes con Bajo Margen */}
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-2">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Cortes con Margen Bajo (&lt;30%)
                  </span>
                  {deboningResult.lowMarginCuts.length === 0 ? (
                    <p className="text-[11px] text-slate-500">Todos los cortes alcanzan el margen objetivo.</p>
                  ) : (
                    <div className="space-y-1">
                      {deboningResult.lowMarginCuts.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate">{c.productName}</span>
                          <Badge variant="outline" className="text-[9px] text-amber-800 border-amber-300">
                            {c.realMarginPercent}% (Sug: {formatMoney(c.recommendedPrice)})
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cortes bajo precio de mercado */}
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                  <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    Comparativa con Mercado
                  </span>
                  {deboningResult.belowMarketCuts.length === 0 ? (
                    <p className="text-[11px] text-slate-500">Precios alineados o superiores al mercado.</p>
                  ) : (
                    <div className="space-y-1">
                      {deboningResult.belowMarketCuts.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 truncate">{c.productName}</span>
                          <span className="text-[10px] text-rose-600 font-semibold">
                            {formatMoney(c.marketDiffPerKg)} vs ref
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/40">
              <div className="text-xs text-slate-500">
                Al confirmar, los kilos del desposte se convertirán en inventario disponible y se actualizarán costos.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSavePurchaseAndDebone(false)}
                  disabled={isSaving}
                  className="text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {isSaving ? "Guardando..." : "Guardar Borrador"}
                </Button>

                <Button
                  size="default"
                  onClick={() => handleSavePurchaseAndDebone(true)}
                  disabled={isSaving}
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                >
                  <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                  {isSaving ? "Procesando..." : "Confirmar e Ingresar a Inventario"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* PESTAÑA 2: CALCULADORA "¿CUÁNTO PUEDO PAGAR?" */}
      {activeSubTab === "calculator" && (
        <div className="space-y-6">
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    ¿Cuánto puedo pagar por este animal?
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Herramienta estratégica para cotizar antes de comprar y asegurar tu rentabilidad mínima sobre ventas.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 pt-0 space-y-6">
              {/* Inputs del Cotizador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peso en Pie Estimado (kg)</label>
                  <CleanNumberInput
                    value={calcLiveWeight}
                    onChange={(val) => setCalcLiveWeight(val)}
                    className="h-9 text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rendimiento Esperado (%)</label>
                  <CleanNumberInput
                    value={calcExpectedYield}
                    onChange={(val) => setCalcExpectedYield(val)}
                    className="h-9 text-xs font-bold bg-white text-right"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Promedio hist: {historicalStats.averageYieldPercent}%
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio Promedio Venta/kg</label>
                  <CurrencyInput
                    value={calcRevenuePerKg}
                    onChange={(val) => setCalcRevenuePerKg(val)}
                    className="h-9 text-xs font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Por kg aprovechable</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gastos Adicionales ($)</label>
                  <CurrencyInput
                    value={calcAdditionalCosts}
                    onChange={(val) => setCalcAdditionalCosts(val)}
                    className="h-9 text-xs font-bold bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Flete, matadero, etc.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Margen Mínimo Objetivo (%)</label>
                  <CleanNumberInput
                    value={calcTargetMargin}
                    onChange={(val) => setCalcTargetMargin(val)}
                    className="h-9 text-xs font-bold bg-white text-right"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Utilidad deseada</span>
                </div>
              </div>

              {/* Tarjeta del Resultado Recomendado */}
              <div className="bg-slate-900 text-white p-5 rounded-xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                    Precio Máximo Recomendado de Compra
                  </span>
                  <Badge variant="success" className="text-xs font-bold">
                    Margen Mínimo Garantizado: {calcTargetMargin}%
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <span className="text-xs text-slate-400 block">No deberías pagar más de:</span>
                    <strong className="text-3xl font-black text-emerald-400 block mt-1">
                      {formatMoney(maxPurchaseCalc.maxPricePerKgLiveRounded)}/kg
                    </strong>
                    <span className="text-xs text-slate-400 font-mono">
                      (Exacto: ${maxPurchaseCalc.maxPricePerKgLive.toLocaleString("es-CO")}/kg en pie)
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 border-l border-slate-800 pl-4">
                    <div>
                      Gasto máximo adquisición: <strong className="text-white">{formatMoney(maxPurchaseCalc.maxAcquisitionCost)}</strong>
                    </div>
                    <div>
                      Gastos adicionales presupuestados: <strong className="text-amber-300">{formatMoney(maxPurchaseCalc.estimatedAdditionalCosts)}</strong>
                    </div>
                    <div>
                      Costo total permitido: <strong className="text-white">{formatMoney(maxPurchaseCalc.maxTotalAllowedCost)}</strong>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 border-l border-slate-800 pl-4">
                    <div>
                      Facturación estimada: <strong className="text-white">{formatMoney(maxPurchaseCalc.expectedRevenue)}</strong>
                    </div>
                    <div>
                      Kilos vendibles esperados: <strong className="text-white">{maxPurchaseCalc.expectedAprovechableKg} kg</strong>
                    </div>
                    <div>
                      Utilidad proyectada: <strong className="text-emerald-400">+{formatMoney(maxPurchaseCalc.projectedProfit)}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-xs bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-slate-200 mt-2">
                  <strong>Recomendación:</strong> {maxPurchaseCalc.adviceMessage}
                </div>
              </div>

              {/* Simulación de Escenarios */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Comparación de Escenarios (Sensibilidad)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {purchaseScenarios.map((scen) => (
                    <div
                      key={scen.scenarioName}
                      className={`p-4 rounded-xl border transition-all ${
                        scen.scenarioName === "Actual"
                          ? "bg-emerald-50/40 border-emerald-300 shadow-xs"
                          : scen.scenarioName === "Conservador"
                          ? "bg-slate-50 border-slate-200"
                          : "bg-blue-50/40 border-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{scen.scenarioName}</span>
                        <Badge
                          variant={scen.scenarioName === "Actual" ? "success" : "outline"}
                          className="text-[10px]"
                        >
                          Rend: {scen.yieldPercent}%
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div>
                          Precio tope: <strong className="text-slate-900 text-sm">{formatMoney(scen.maxPricePerKgLive)}/kg</strong>
                        </div>
                        <div>
                          Venta proyectada: <strong className="text-slate-800">{formatMoney(scen.projectedRevenue)}</strong>
                        </div>
                        <div>
                          Utilidad esperada: <strong className="text-emerald-700">+{formatMoney(scen.projectedProfit)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PESTAÑA 3: HISTORIAL Y COMPARATIVA DE ANIMALES */}
      {activeSubTab === "history" && (
        <div className="space-y-6">
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Historial de Compras y Despostes
                </CardTitle>
                <CardDescription className="text-xs">
                  Registro histórico de rendimientos reales para comparar animales, proveedores y márgenes.
                </CardDescription>
              </div>

              <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Actualizar
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {/* Resumen Acumulado del Negocio */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 border-b border-slate-200 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Animales Procesados</span>
                  <strong className="text-base font-bold text-slate-900 block mt-0.5">
                    {pastPurchases.length}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rendimiento Promedio</span>
                  <strong className="text-base font-bold text-emerald-700 block mt-0.5">
                    {historicalStats.averageYieldPercent}%
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso Vivo Promedio</span>
                  <strong className="text-base font-bold text-slate-900 block mt-0.5">
                    {historicalStats.averageLiveWeightKg} kg
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Margen Promedio Venta</span>
                  <strong className="text-base font-bold text-slate-900 block mt-0.5">
                    {historicalStats.averageMarginOnSalesPercent}%
                  </strong>
                </div>
              </div>

              {pastPurchases.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No hay animales guardados en el historial aún. Registra tu primer desposte en la pestaña "1. Registro & Desposte".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] bg-slate-50">
                        <TableHead>Lote / Animal</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Peso en Pie</TableHead>
                        <TableHead className="text-right">Costo Total</TableHead>
                        <TableHead className="text-right">Rendimiento</TableHead>
                        <TableHead className="text-right">Venta Potencial</TableHead>
                        <TableHead className="text-right">Margen Bruto</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastPurchases.map((p) => (
                        <TableRow key={p.id} className="text-xs">
                          <TableCell className="font-bold text-slate-900">{p.batchNumber}</TableCell>
                          <TableCell>{p.animalType}</TableCell>
                          <TableCell className="text-slate-600">{p.supplier}</TableCell>
                          <TableCell className="text-slate-500">{new Date(p.purchaseDate).toLocaleDateString("es-CO")}</TableCell>
                          <TableCell className="text-right font-semibold">{formatWeightNumber(p.liveWeightKg)}</TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(p.totalAnimalCost)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.yieldPercent >= 50 ? "success" : "outline"} className="text-[10px]">
                              {p.yieldPercent ? `${p.yieldPercent}%` : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            {p.totalPotentialRevenue ? formatMoney(p.totalPotentialRevenue) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700">
                            {p.grossProfit ? `+${formatMoney(p.grossProfit)}` : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                p.status === "INVENTORY_LOADED"
                                  ? "success"
                                  : p.status === "DEBONED"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-[10px]"
                            >
                              {p.status === "INVENTORY_LOADED"
                                ? "En Inventario"
                                : p.status === "DEBONED"
                                ? "Despostado"
                                : "En Pie"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAuditPurchase(p)}
                              className="h-7 px-2 text-xs"
                              title="Ver detalle del desposte"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PESTAÑA 4: CATÁLOGO DE CORTES & RENDIMIENTOS */}
      {activeSubTab === "catalog" && (
        <div className="space-y-6">
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Catálogo de Cortes, Huesos y Subproductos
                </CardTitle>
                <CardDescription className="text-xs">
                  Gestiona los precios de venta actuales y precios de referencia de mercado para carnicería.
                </CardDescription>
              </div>

              <Button size="sm" onClick={() => setShowNewProductModal(true)} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar Producto al Catálogo
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] bg-slate-50">
                      <TableHead>Producto</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead className="text-right">Precio Venta Actual</TableHead>
                      <TableHead className="text-right">Precio de Mercado (Ref)</TableHead>
                      <TableHead className="text-right">Último Costo</TableHead>
                      <TableHead className="text-right">Margen Obj.</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalogProducts
                      .filter(isBeefProduct)
                      .map((prod) => (
                        <TableRow key={prod.id} className="text-xs">
                          <TableCell className="font-bold text-slate-900">{prod.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {prod.classification || "COMERCIALIZABLE"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">{prod.unit}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            {formatMoney(prod.sellPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-600">
                            {prod.marketPrice ? formatMoney(prod.marketPrice) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-500">
                            {prod.costPrice ? formatMoney(prod.costPrice) : "-"}
                          </TableCell>
                          <TableCell className="text-right">30%</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatWeightNumber((prod as any).currentStock || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DIÁLOGO: CREAR NUEVO PRODUCTO */}
      <Dialog open={showNewProductModal} onOpenChange={setShowNewProductModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Corte o Subproducto</DialogTitle>
            <DialogDescription>
              Agrega un producto cárnico con sus precios de venta y referencia de mercado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del Corte *</label>
              <Input
                required
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Ej: Muchacho de Res, Bofe, etc."
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Clasificación</label>
                <select
                  value={newProductClassification}
                  onChange={(e) => setNewProductClassification(e.target.value as CutClassification)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none"
                >
                  <option value="COMERCIALIZABLE">Corte Principal</option>
                  <option value="SUBPRODUCTO">Subproducto</option>
                  <option value="MERMA">Hueso / Merma</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Precio de Venta ($/kg) *</label>
                <CurrencyInput
                  value={newProductSellPrice}
                  onChange={(val) => setNewProductSellPrice(val)}
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Precio de Mercado / Referencia ($/kg)</label>
              <CurrencyInput
                value={newProductMarketPrice}
                onChange={(val) => setNewProductMarketPrice(val)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewProductModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Guardar en Catálogo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: AUDITORÍA DE ANIMAL ANTERIOR */}
      <Dialog open={Boolean(selectedAuditPurchase)} onOpenChange={() => setSelectedAuditPurchase(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedAuditPurchase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Beef className="w-5 h-5 text-red-600" />
                  Auditoría del Animal #{selectedAuditPurchase.batchNumber}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedAuditPurchase.animalType} • {selectedAuditPurchase.supplier} • {new Date(selectedAuditPurchase.purchaseDate).toLocaleDateString("es-CO")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* 4 KPIs del Animal */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-lg border">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peso en Pie</span>
                    <strong className="text-sm font-bold text-slate-900">{formatWeightNumber(selectedAuditPurchase.liveWeightKg)}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rendimiento</span>
                    <strong className="text-sm font-bold text-emerald-700">{selectedAuditPurchase.yieldPercent}%</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Costo Total</span>
                    <strong className="text-sm font-bold text-slate-900">{formatMoney(selectedAuditPurchase.totalAnimalCost)}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Margen Bruto</span>
                    <strong className="text-sm font-bold text-emerald-700">+{formatMoney(selectedAuditPurchase.grossProfit || 0)}</strong>
                  </div>
                </div>

                {/* Desglose de Cortes */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] bg-slate-50">
                        <TableHead>Corte</TableHead>
                        <TableHead className="text-right">Kilos</TableHead>
                        <TableHead className="text-right">Precio Venta</TableHead>
                        <TableHead className="text-right">Venta Total</TableHead>
                        <TableHead className="text-right">Costo Asignado/kg</TableHead>
                        <TableHead className="text-right">Margen %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedAuditPurchase.cuts || []).map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-semibold">{c.productName}</TableCell>
                          <TableCell className="text-right">{formatWeightNumber(c.weightKg)}</TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(c.actualSellPrice)}</TableCell>
                          <TableCell className="text-right font-bold">{formatMoney(c.potentialRevenue)}</TableCell>
                          <TableCell className="text-right font-mono">{formatMoney(c.costAttributedPerKg)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-700">{c.realMarginPercent}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedAuditPurchase(null)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
