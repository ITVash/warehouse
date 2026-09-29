"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/src/stores/auth.store";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { TelegramLoginView } from "@/src/components/auth/TelegramLoginView";
import { GuestNoticeView } from "@/src/components/auth/GuestNoticeView";
import { WarehouseSelectorView } from "@/src/components/warehouse/WarehouseSelectorView";
import { WarehouseDashboard } from "@/src/components/warehouse/WarehouseDashboard";
import { ToastContainer } from "@/src/components/layout/ToastContainer";
import { BarcodeScannerModal } from "@/src/components/scanner/BarcodeScannerModal";
import { Package, RefreshCw } from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, role, isInitialized, fetchMe } = useAuthStore();
  const { currentWarehouseId, currentWarehouse } = useWarehouseStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchMe().catch(() => {});
  }, [fetchMe]);

  if (!mounted || !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center animate-pulse">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            Загрузка системы NegoStore...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <BarcodeScannerModal />

      {!isAuthenticated ? (
        <TelegramLoginView />
      ) : role === "GUEST" ? (
        <GuestNoticeView />
      ) : !currentWarehouseId ? (
        <WarehouseSelectorView />
      ) : (
        <WarehouseDashboard />
      )}
    </>
  );
}
