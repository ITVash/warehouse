"use client";

import React, { useEffect, useState } from "react";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { useUiStore, WorkspaceTab } from "@/src/stores/ui.store";
import { useOrderStore } from "@/src/stores/order.store";
import { useIncomingStore } from "@/src/stores/incoming.store";
import { useNomenclatureStore } from "@/src/stores/nomenclature.store";
import { useStockStore } from "@/src/stores/stock.store";
import { PWAInstallButton } from "../pwa/PWAInstallButton";

import { OrdersTab } from "../orders/OrdersTab";
import { NomenclatureTab } from "../nomenclature/NomenclatureTab";
import { StockTab } from "../stock/StockTab";
import { IncomingTab } from "../incoming/IncomingTab";
import { ReportsTab } from "../reports/ReportsTab";
import { UsersTab } from "../users/UsersTab";
import { CounterpartiesTab } from "../counterparties/CounterpartiesTab";

import {
  Building2,
  ArrowLeft,
  FileText,
  Package,
  Boxes,
  Truck,
  BarChart3,
  Users,
  Briefcase,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { Role } from "@/src/types";

export const WarehouseDashboard: React.FC = () => {
  const { currentWarehouse, clearWarehouse, currentWarehouseId } = useWarehouseStore();
  const { user, role, logout, devSwitchRole } = useAuthStore();
  const { activeTab, setActiveTab, mobileMenuOpen, setMobileMenuOpen } = useUiStore();

  const { orders, fetchOrders } = useOrderStore();
  const { incomings, fetchIncomings } = useIncomingStore();
  const { total: totalNomenclature, fetchItems } = useNomenclatureStore();
  const { summary, fetchStock } = useStockStore();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    if (currentWarehouseId) {
      fetchOrders({ warehouseId: currentWarehouseId }).catch(() => {});
      fetchIncomings({ warehouseId: currentWarehouseId }).catch(() => {});
      fetchItems({ warehouseId: currentWarehouseId }).catch(() => {});
      fetchStock({ warehouseId: currentWarehouseId }).catch(() => {});
    }
  }, [currentWarehouseId, fetchOrders, fetchIncomings, fetchItems, fetchStock]);

  const draftOrdersCount = orders.filter((o) => o.status === "DRAFT").length;
  const postedOrdersCount = orders.filter((o) => o.status === "POSTED").length;
  const draftIncomingsCount = incomings.filter((i) => i.status === "DRAFT").length;
  const postedIncomingsCount = incomings.filter((i) => i.status === "POSTED").length;

  const tabs: { id: WorkspaceTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "orders", label: "Счета покупателей", icon: <FileText className="w-4 h-4" /> },
    { id: "nomenclature", label: "Номенклатура", icon: <Package className="w-4 h-4" /> },
    { id: "stock", label: "Остатки", icon: <Boxes className="w-4 h-4" /> },
    { id: "incomings", label: "Приходы от поставщиков", icon: <Truck className="w-4 h-4" /> },
    { id: "reports", label: "Отчёты", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "counterparties", label: "Контрагенты", icon: <Briefcase className="w-4 h-4" /> },
    { id: "users", label: "Пользователи", icon: <Users className="w-4 h-4" />, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || role === "ADMIN");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={clearWarehouse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Выбор склада</span>
            </button>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                  {currentWarehouse?.name}
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">
                  Код: {currentWarehouse?.code}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <PWAInstallButton />

            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] uppercase font-bold text-amber-300">{role}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500">
                    Переключить роль для теста
                  </div>
                  {(["ADMIN", "MANAGER", "GUEST"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        devSwitchRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                        role === r ? "text-emerald-400 font-bold" : "text-slate-300"
                      }`}
                    >
                      <span>{r === "ADMIN" ? "Администратор" : r === "MANAGER" ? "Менеджер" : "Гость"}</span>
                      <span className="text-[10px] font-mono text-slate-500">{r}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 pl-2">
              <span className="text-xs text-slate-300 font-medium">
                {user?.firstName || user?.username}
              </span>
            </div>

            <button
              onClick={() => logout()}
              title="Выйти"
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-4 text-xs min-w-max text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Номенклатура:</span>
              <span className="font-mono font-semibold text-white">{totalNomenclature}</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Остатков:</span>
              <span className="font-mono font-semibold text-emerald-400">
                {summary?.totalItems.toLocaleString("ru-RU") || 0} шт.
              </span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Счетов (черновики):</span>
              <span className="font-mono font-semibold text-amber-400">{draftOrdersCount}</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Счетов (проведённых):</span>
              <span className="font-mono font-semibold text-white">{postedOrdersCount}</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Приходов (черновики):</span>
              <span className="font-mono font-semibold text-amber-400">{draftIncomingsCount}</span>
            </div>
            <span className="text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Приходов (проведённых):</span>
              <span className="font-mono font-semibold text-white">{postedIncomingsCount}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          {visibleTabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "nomenclature" && <NomenclatureTab />}
        {activeTab === "stock" && <StockTab />}
        {activeTab === "incomings" && <IncomingTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "counterparties" && <CounterpartiesTab />}
        {activeTab === "users" && role === "ADMIN" && <UsersTab />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-3 px-6 text-center text-[11px] text-slate-600">
        NegoStore © 2026 · Система складского учёта для ИП Новиков и ООО "ТД "Негоциант"
      </footer>
    </div>
  );
};
