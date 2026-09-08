"use client";

import React, { useEffect, useState } from "react";
import {
  isOnline,
  subscribeToSync,
  processSyncQueue,
  getPendingCount,
} from "@/lib/offline-sync";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function OfflineSyncIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    setOnline(isOnline());
    setPendingCount(getPendingCount());

    const unsubscribe = subscribeToSync((count, isOnlineNow, isSyncingNow) => {
      setPendingCount(count);
      setOnline(isOnlineNow);
      setSyncing(isSyncingNow);
    });

    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (!online || syncing) return;
    const res = await processSyncQueue();
    if (res.synced > 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    }
  };

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-2 py-1 rounded-md text-xs font-medium animate-pulse shadow-xs">
        <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="hidden sm:inline">Modo Offline</span>
        {pendingCount > 0 && (
          <span className="bg-amber-200 text-amber-900 px-1 rounded text-[10px] font-bold">
            {pendingCount} pend.
          </span>
        )}
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="flex items-center gap-1.5 bg-sky-50 text-sky-800 border border-sky-300 px-2 py-1 rounded-md text-xs font-medium shadow-xs">
        <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />
        <span className="hidden sm:inline">Sincronizando...</span>
      </div>
    );
  }

  if (justSynced) {
    return (
      <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-md text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="hidden sm:inline">Sincronizado</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={handleManualSync}
          className="h-7 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-amber-600" />
          <span>Subir {pendingCount} {pendingCount === 1 ? "cambio" : "cambios"}</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="hidden md:flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-xs px-2 py-1 transition-colors"
      title="Conectado al servidor en tiempo real"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
      <span className="text-[11px] font-medium text-slate-600">Online</span>
    </div>
  );
}