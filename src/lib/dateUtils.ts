/**
 * Utilidades de Fecha y Hora adaptadas a la Zona Horaria Oficial de Colombia (America/Bogota, UTC-5).
 * Resuelve de forma definitiva cualquier desfase entre los servidores en la nube (Vercel corre en UTC)
 * y la hora local de operación en Colombia.
 */

export const COLOMBIA_TIMEZONE = "America/Bogota";

/**
 * Retorna la fecha actual en Colombia en formato "YYYY-MM-DD".
 * Ejemplo: "2026-09-11" incluso si en UTC ya son las 00:00 del día 12.
 */
export function getColombiaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Obtiene los componentes numéricos de la fecha y hora actual en Colombia.
 */
export function getColombiaDateParts(date: Date = new Date()): {
  year: number;
  month: number; // 1 - 12
  day: number;   // 1 - 31
  hour: number;  // 0 - 23
  minute: number;// 0 - 59
  second: number;// 0 - 59
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: COLOMBIA_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => {
    const p = parts.find((x) => x.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const weekdayPart = parts.find((x) => x.type === "weekday")?.value || "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
    dayOfWeek: weekdayMap[weekdayPart] ?? 0,
  };
}

/**
 * Convierte una fecha elegida en el frontend ("YYYY-MM-DD") a una cadena ISO UTC
 * fijada al mediodía colombiano (17:00 UTC) para que nunca se desplace de día en BD.
 */
export function colombiaDateStringToIso(dateString?: string | null): string {
  if (!dateString) return new Date().toISOString();
  const clean = dateString.slice(0, 10);
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  // 12:00 mediodía en Colombia (UTC-5) equivale a las 17:00 UTC
  return new Date(Date.UTC(y, m - 1, d, 17, 0, 0, 0)).toISOString();
}

/**
 * Rango de inicio y fin para "Hoy" en Colombia en formato ISO UTC.
 * Desde las 00:00:00 COT (05:00:00 UTC) hasta las 23:59:59.999 COT (04:59:59.999 UTC del día siguiente).
 */
export function getColombiaDayRange(dateString?: string): { startIso: string; endIso: string } {
  const targetDate = dateString ? dateString.slice(0, 10) : getColombiaDateString();
  const [y, m, d] = targetDate.split("-").map(Number);

  const startUtc = new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
  const endUtc = new Date(Date.UTC(y, m - 1, d + 1, 4, 59, 59, 999));

  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  };
}

/**
 * Rango de inicio y fin para "Esta Semana" en Colombia (Lunes a Domingo).
 */
export function getColombiaWeekRange(): { startIso: string; endIso: string } {
  const parts = getColombiaDateParts();
  // dayOfWeek: 0 = Domingo, 1 = Lunes, etc.
  const diffToMonday = parts.dayOfWeek === 0 ? -6 : 1 - parts.dayOfWeek;
  const mondayUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + diffToMonday, 5, 0, 0, 0));
  const sundayUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + diffToMonday + 7, 4, 59, 59, 999));

  return {
    startIso: mondayUtc.toISOString(),
    endIso: sundayUtc.toISOString(),
  };
}

/**
 * Rango de inicio y fin para "Esta Quincena" en Colombia (1 al 15, o 16 al fin de mes).
 */
export function getColombiaBiweekRange(): { startIso: string; endIso: string } {
  const parts = getColombiaDateParts();
  if (parts.day <= 15) {
    const startUtc = new Date(Date.UTC(parts.year, parts.month - 1, 1, 5, 0, 0, 0));
    const endUtc = new Date(Date.UTC(parts.year, parts.month - 1, 16, 4, 59, 59, 999));
    return {
      startIso: startUtc.toISOString(),
      endIso: endUtc.toISOString(),
    };
  } else {
    const startUtc = new Date(Date.UTC(parts.year, parts.month - 1, 16, 5, 0, 0, 0));
    // Último día del mes: día 0 del siguiente mes
    const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
    const endUtc = new Date(Date.UTC(parts.year, parts.month - 1, lastDay + 1, 4, 59, 59, 999));
    return {
      startIso: startUtc.toISOString(),
      endIso: endUtc.toISOString(),
    };
  }
}

/**
 * Rango de inicio y fin para "Este Mes" en Colombia (Día 1 a último día del mes).
 */
export function getColombiaMonthRange(): { startIso: string; endIso: string } {
  const parts = getColombiaDateParts();
  const startUtc = new Date(Date.UTC(parts.year, parts.month - 1, 1, 5, 0, 0, 0));
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  const endUtc = new Date(Date.UTC(parts.year, parts.month - 1, lastDay + 1, 4, 59, 59, 999));

  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  };
}
