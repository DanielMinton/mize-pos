"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // Online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === "accepted";
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    promptInstall,
  };
}

// Hook for offline data sync
export function useOfflineSync() {
  const [pendingActions, setPendingActions] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const queueAction = useCallback((action: unknown) => {
    // In production, store in IndexedDB
    const queue = JSON.parse(localStorage.getItem("offline-queue") || "[]");
    queue.push({ action, timestamp: Date.now() });
    localStorage.setItem("offline-queue", JSON.stringify(queue));
    setPendingActions(queue.length);
  }, []);

  const syncPendingActions = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem("offline-queue") || "[]");
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      // Process queue
      for (const item of queue) {
        // In production, make API calls here
        console.log("Syncing:", item);
      }
      localStorage.setItem("offline-queue", "[]");
      setPendingActions(0);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem("offline-queue") || "[]");
    setPendingActions(queue.length);

    // Sync when online
    const handleOnline = () => {
      syncPendingActions();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncPendingActions]);

  return {
    pendingActions,
    isSyncing,
    queueAction,
    syncPendingActions,
  };
}
