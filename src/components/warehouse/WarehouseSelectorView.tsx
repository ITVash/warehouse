"use client";

import React, { useEffect } from "react";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { ArrowRight, Building2, Shield, LogOut, Package, RefreshCw } from "lucide-react";
import { PWAInstallButton } from "../pwa/PWAInstallButton";

export const WarehouseSelectorView: React.FC = () => {
  const { warehouses, fetchWarehouses, setWarehouse, isLoading } = useWarehouseStore();
  const { user, role, logout, devSwitchRole } = useAuthStore();

  useEffect(() => {
    fetchWarehouses().catch(() => {});
  }, [fetchWarehouses]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="absolute top-4 right-4 flex items-center gap-3">
        <PWAInstallButton />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">{user?.firstName || user?.username}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
            {role}
          </span>
        </div>
        <button
          onClick={() => logout()}
          title="Выйти"
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">NegoStore</h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">Выберите склад для работы</p>
        </div>

        {isLoading && warehouses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            Загрузка доступных складов...
          </div>
        ) : (
          <div className="space-y-4">
            {warehouses.map((w) => (
              <div
                key={w.id}
                onClick={() => setWarehouse(w.id)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800/80 p-6 transition-all duration-200 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/60 group-hover:bg-emerald-950/50 group-hover:border-emerald-700/60 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                      {w.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Изолированная номенклатура и остатки
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition duration-200">
                  <span>Перейти на склад</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Тест ролей:</span>
          </div>
          <div className="flex gap-2">
            {(["ADMIN", "MANAGER", "GUEST"] as const).map((r) => (
              <button
                key={r}
                onClick={() => devSwitchRole(r)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  role === r
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
