// Motor de Sincronización Offline-First para Carne & Legumbre

export type SyncActionType = "SALE" | "BATCH" | "WASTE";

export interface SyncAction {
  id: string;
  type: SyncActionType;
  payload: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = "cl_sync_queue_v1";
const PRODUCTS_CACHE_KEY = "cl_products_cache_v1";
const CATEGORIES_CACHE_KEY = "cl_categories_cache_v1";

type SyncListener = (count: number, isOnline: boolean, isSyncing: boolean) => void;
const listeners: Set<SyncListener> = new Set();
let isSyncing = false;

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function subscribeToSync(listener: SyncListener): () => void {
  listeners.add(listener);
  // Notificar estado inicial
  listener(getPendingCount(), isOnline(), isSyncing);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  const count = getPendingCount();
  const online = isOnline();
  listeners.forEach((l) => l(count, online, isSyncing));
}

// -------------------------------------------------------------
// GESTIÓN DE COLA DE SINCRONIZACIÓN
// -------------------------------------------------------------

export function getPendingQueue(): SyncAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading sync queue:", e);
    return [];
  }
}

export function getPendingCount(): number {
  return getPendingQueue().length;
}

export function enqueueAction(type: SyncActionType, payload: any): SyncAction {
  const queue = getPendingQueue();
  const action: SyncAction = {
    id: "offline_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(action);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Error saving sync queue:", e);
  }

  // Si es una venta, descontar stock en la caché local optimísticamente
  if (type === "SALE" && Array.isArray(payload.items)) {
    deductLocalStock(payload.items);
  }

  notifyListeners();
  return action;
}

function removeAction(id: string) {
  const queue = getPendingQueue().filter((a) => a.id !== id);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Error updating sync queue:", e);
  }
  notifyListeners();
}

// -------------------------------------------------------------
// CACHÉ DE PRODUCTOS Y CATEGORÍAS (Para funcionar offline)
// -------------------------------------------------------------

export function saveProductsCache(products: any[]) {
  if (typeof window === "undefined" || !Array.isArray(products)) return;
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn("Could not cache products:", e);
  }
}

export function getCachedProducts(): any[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCategoriesCache(categories: any[]) {
  if (typeof window === "undefined" || !Array.isArray(categories)) return;
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.warn("Could not cache categories:", e);
  }
}

export function getCachedCategories(): any[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function deductLocalStock(items: Array<{ productId: string; quantity: number }>) {
  const cached = getCachedProducts();
  if (!cached) return;

  const itemMap = new Map(items.map((i) => [i.productId, i.quantity]));
  const updated = cached.map((p) => {
    const qty = itemMap.get(p.id);
    if (qty) {
      const currentStock = Math.max(0, (p.currentStock || 0) - qty);
      return {
        ...p,
        currentStock,
        isOutOfStock: currentStock <= 0,
        isLowStock: currentStock > 0 && currentStock <= (p.minStock || 5),
      };
    }
    return p;
  });

  saveProductsCache(updated);
}

// -------------------------------------------------------------
// SINCRONIZACIÓN AUTOMÁTICA CON EL SERVIDOR
// -------------------------------------------------------------

export async function processSyncQueue(): Promise<{
  total: number;
  synced: number;
  failed: number;
}> {
  if (!isOnline() || isSyncing) {
    return { total: getPendingCount(), synced: 0, failed: 0 };
  }

  const queue = getPendingQueue();
  if (queue.length === 0) return { total: 0, synced: 0, failed: 0 };

  isSyncing = true;
  notifyListeners();

  let synced = 0;
  let failed = 0;

  try {
    // Enviar lote completo al endpoint /api/sync
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions: queue }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.processedIds)) {
        for (const id of data.processedIds) {
          removeAction(id);
          synced++;
        }
      } else {
        failed = queue.length;
      }
    } else {
      failed = queue.length;
    }
  } catch (err) {
    console.error("Error executing sync batch:", err);
    failed = queue.length;
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return { total: queue.length, synced, failed };
}

// Inicializar escuchas automáticas en el cliente
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    notifyListeners();
    // Reintento automático cuando se detecta conexión
    setTimeout(() => {
      processSyncQueue();
    }, 1500);
  });

  window.addEventListener("offline", () => {
    notifyListeners();
  });

  // Chequeo periódico cada 30 segundos si hay items pendientes y hay internet
  setInterval(() => {
    if (isOnline() && getPendingCount() > 0 && !isSyncing) {
      processSyncQueue();
    }
  }, 30000);
}