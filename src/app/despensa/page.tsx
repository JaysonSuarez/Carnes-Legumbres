"use client";

import React from "react";
import Link from "next/link";
import { Boxes, ArrowLeft, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DespensaView } from "@/components/DespensaView";

export default function DespensaPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col text-slate-800 antialiased">
      {/* Encabezado Independiente y Exclusivo de /despensa */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                  Despensa
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold border-indigo-200 text-indigo-700 bg-indigo-50/50 hidden xs:inline-flex">
                  <ShieldCheck className="w-3 h-3 mr-1 text-indigo-600" />
                  Privado
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Badge variant="success" className="hidden md:inline-flex px-2.5 py-0.5 text-xs font-semibold">
              Fórmula: Costo / 0.7 → $100 (≥ 30%)
            </Badge>
            <Link
              href="/"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Volver al Sistema Principal</span>
              <span className="sm:hidden">Volver</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenedor Principal Independiente */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 pb-24 sm:p-6 lg:p-8">
        <DespensaView />
      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500 print:hidden hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Carne & Legumbre • Panel Privado de Despensa y Conteo Físico
          </span>
          <span className="text-slate-400">
            Ruta Privada: /despensa
          </span>
        </div>
      </footer>
    </div>
  );
}
