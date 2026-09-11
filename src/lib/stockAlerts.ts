/**
 * Utilidades para notificaciones de bajo stock (Audio sintetizado y Notificaciones Web)
 */

export interface StockAlertItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  categoryName?: string;
}

/**
 * Tono de alerta suave no intrusivo mediante Web Audio API
 */
export function playAlertChime(isCritical = false) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (isCritical) {
      // Doble tono descendente de precaución (Agotado o crítico)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18); // A4
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.18);

      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(440, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(349.23, ctx.currentTime + 0.22); // F4
          gain2.gain.setValueAtTime(0.18, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.22);
        } catch (e) {
          // ignore
        }
      }, 140);
    } else {
      // Tono simple suave de advertencia (Bajo stock)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.2); // C5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Si el navegador bloquea audio por falta de interacción, se descarta silenciosamente
  }
}

/**
 * Solicitar permiso para notificaciones del navegador
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    if (Notification.permission === "granted") return true;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (e) {
    console.error("Error al solicitar permisos de notificación:", e);
    return false;
  }
}

/**
 * Emitir notificación nativa del navegador o sistema (compatible con Service Worker en Android/PC en segundo plano)
 */
export async function sendBrowserNotification(
  title: string,
  options?: { body?: string; tag?: string; data?: any }
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  try {
    if (Notification.permission === "granted") {
      // 1. Intentar a través del Service Worker (requerido para móviles Android y funcionamiento en segundo plano)
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && "showNotification" in reg) {
            await reg.showNotification(title, {
              icon: "/icons/icon.svg",
              badge: "/icons/icon.svg",
              ...options,
            });
            return;
          }
        } catch (swError) {
          // Continuar al fallback clásico
        }
      }

      // 2. Fallback estándar para navegadores de escritorio
      new Notification(title, {
        icon: "/icons/icon.svg",
        badge: "/icons/icon.svg",
        ...options,
      });
    }
  } catch (e) {
    console.error("Error al emitir notificación del navegador:", e);
  }
}
