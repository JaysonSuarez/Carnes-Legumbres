"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BellRing, Clock3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TENANT_ID = "andres";
const DUE_DATE = "2026-09-23";
const DUE_HOUR = 17;
const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;
const STORAGE_PREFIX = `cl-payment-reminder:${TENANT_ID}:${DUE_DATE}`;
const NEXT_REMINDER_KEY = `${STORAGE_PREFIX}:next`;

type BogotaTime = {
  date: string;
  hour: number;
};

function getBogotaTime(now: Date): BogotaTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

export function AndresPaymentReminder({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [deadlineReached, setDeadlineReached] = useState(false);

  const checkReminder = useCallback(() => {
    if (tenantId !== TENANT_ID || typeof window === "undefined") return;

    const now = Date.now();
    const bogotaTime = getBogotaTime(new Date(now));
    if (bogotaTime.date !== DUE_DATE) {
      setOpen(false);
      return;
    }

    setDeadlineReached(bogotaTime.hour >= DUE_HOUR);
    const nextReminderAt = Number(window.localStorage.getItem(NEXT_REMINDER_KEY) || 0);
    if (now >= nextReminderAt) {
      window.localStorage.setItem(
        NEXT_REMINDER_KEY,
        String(now + REMINDER_INTERVAL_MS)
      );
      setOpen(true);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId !== TENANT_ID) return;

    const initialCheckId = window.setTimeout(checkReminder, 0);
    const intervalId = window.setInterval(checkReminder, CHECK_INTERVAL_MS);
    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
    };
  }, [checkReminder, tenantId]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }

    setOpen(false);
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      NEXT_REMINDER_KEY,
      String(Date.now() + REMINDER_INTERVAL_MS)
    );
  };

  if (tenantId !== TENANT_ID) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl border-amber-200 p-5 sm:p-6">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            {deadlineReached ? (
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            ) : (
              <BellRing className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <DialogTitle className="text-lg font-bold">
            {deadlineReached ? "Plazo de pago cumplido" : "Recordatorio de pago"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            {deadlineReached
              ? "El plazo de pago de hoy llegó a las 5:00 p. m. La administración podrá suspender el servicio manualmente."
              : "Te recordamos que el pago del servicio está pendiente. Si no se recibe hoy antes de las 5:00 p. m., hora de Colombia, la administración suspenderá el servicio."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Fecha límite: hoy, 5:00 p. m. (hora de Colombia)</span>
        </div>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          La administración confirmará el pago. El aviso se repetirá mientras el
          servicio siga activo y el pago permanezca pendiente.
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            variant="outline"
            className="w-full border-amber-300 text-amber-900 hover:bg-amber-50"
            onClick={() => handleOpenChange(false)}
          >
            Posponer 5 minutos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
