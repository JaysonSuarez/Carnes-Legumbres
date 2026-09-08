"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  allowNegative?: boolean;
}

/**
 * Formatea un número o string con puntos de miles (estilo colombiano: 40.000)
 */
export function formatThousands(val: number | string): string {
  if (val === "" || val === undefined || val === null) return "";
  const clean = String(val).replace(/\D/g, "");
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Input numérico optimizado para pesos/valores:
 * 1. Inicia o se borra a blanco (placeholder "0"), sin dejar el 0 superpuesto.
 * 2. Si escribes "4", queda "4" (nunca "04").
 * 3. A medida que escribes dígitos, coloca el punto automático de miles (ej: 40000 -> 40.000).
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "0", className, prefix, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Estado local para permitir que el campo quede vacío al borrar todo
    const [displayValue, setDisplayValue] = useState<string>(() => {
      if (value === 0 || value === undefined || value === null) return "";
      return formatThousands(value);
    });

    // Sincronizar cuando el valor externo cambie (ej: botones de ejemplo, limpiar a 0, cargar favorito)
    useEffect(() => {
      const currentNum = parseInt(displayValue.replace(/\D/g, "") || "0", 10);
      if (currentNum === value) return;
      if (value === 0 || value === undefined || value === null) {
        setDisplayValue("");
      } else {
        setDisplayValue(formatThousands(value));
      }
    }, [value, displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const rawText = input.value;
      const cursorPos = input.selectionStart || 0;

      // Contar cuántos dígitos había antes del cursor para reposicionarlo con precisión
      const digitsBeforeCursor = rawText.slice(0, cursorPos).replace(/\D/g, "").length;

      // Extraer solo números y quitar ceros a la izquierda para evitar "04"
      let digitsOnly = rawText.replace(/\D/g, "");
      digitsOnly = digitsOnly.replace(/^0+(?=\d)/, "");

      if (!digitsOnly) {
        setDisplayValue("");
        onChange(0);
        return;
      }

      // Parsear a entero
      const numericVal = parseInt(digitsOnly, 10);
      const formatted = formatThousands(digitsOnly);

      setDisplayValue(formatted);
      onChange(numericVal);

      // Restaurar la posición del cursor después de formatear con puntos
      requestAnimationFrame(() => {
        const target = inputRef.current;
        if (!target) return;
        let newPos = 0;
        let counted = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) {
            counted++;
          }
          if (counted === digitsBeforeCursor) {
            newPos = i + 1;
            break;
          }
        }
        target.setSelectionRange(newPos, newPos);
      });
    };

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-3 text-slate-400 font-mono text-sm pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          {...props}
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 font-mono",
            prefix && "pl-7",
            className
          )}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
