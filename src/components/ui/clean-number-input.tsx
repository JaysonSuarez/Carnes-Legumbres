"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface CleanNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
  allowDecimals?: boolean;
  prefix?: string;
  suffix?: string;
}

/**
 * Input numérico para decimales o enteros (kilos, porcentajes, cantidades):
 * 1. Al borrar todo, queda completamente en blanco (placeholder "0"), sin dejar el 0 pegado.
 * 2. Al escribir "4", queda "4" (nunca "04").
 * 3. Permite decimales con punto o coma (ej: 0.5, 12.3) sin romper el cursor.
 */
export const CleanNumberInput = React.forwardRef<HTMLInputElement, CleanNumberInputProps>(
  (
    {
      value,
      onChange,
      allowDecimals = true,
      placeholder = "0",
      className,
      prefix,
      suffix,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [displayValue, setDisplayValue] = useState<string>(() => {
      if (value === 0 || value === undefined || value === null) return "";
      return String(value);
    });

    // Sincronizar cambios externos
    useEffect(() => {
      const currentNum = parseFloat(displayValue || "0");
      if (currentNum === value && (displayValue !== "" || value === 0)) return;
      if (value === 0 || value === undefined || value === null) {
        setDisplayValue("");
      } else {
        setDisplayValue(String(value));
      }
    }, [value, displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(",", "."); // convertir comas a puntos

      // Solo permitir números y a lo sumo un punto decimal si se permiten decimales
      if (allowDecimals) {
        raw = raw.replace(/[^0-9.]/g, "");
        const parts = raw.split(".");
        if (parts.length > 2) {
          raw = parts[0] + "." + parts.slice(1).join("");
        }
      } else {
        raw = raw.replace(/\D/g, "");
      }

      // Eliminar ceros a la izquierda seguidos de dígitos (ej: "04" -> "4", pero "0.5" -> "0.5")
      raw = raw.replace(/^0+(?=\d)/, "");

      if (raw === "" || raw === ".") {
        setDisplayValue(raw);
        onChange(0);
        return;
      }

      setDisplayValue(raw);

      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    };

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-2.5 text-slate-400 font-mono text-xs pointer-events-none select-none">
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
          inputMode={allowDecimals ? "decimal" : "numeric"}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 font-mono",
            prefix && "pl-6",
            suffix && "pr-7",
            className
          )}
        />
        {suffix && (
          <span className="absolute right-2 text-slate-400 font-mono text-xs pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);

CleanNumberInput.displayName = "CleanNumberInput";
