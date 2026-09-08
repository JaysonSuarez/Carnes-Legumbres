"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker listo en:", registration.scope);
          })
          .catch((error) => {
            console.warn("Error registrando PWA Service Worker:", error);
          });
      });
    }
  }, []);

  return null;
}