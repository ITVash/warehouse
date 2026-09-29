"use client";

import React, { useEffect, useState } from "react";
import { useStockStore } from "@/src/stores/stock.store";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { useNomenclatureStore } from "@/src/stores/nomenclature.store";
import { useUiStore } from "@/src/stores/ui.store";
import {
  Boxes,
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  PackageCheck,
  PackageX,
  History,
  Tag,
} from "lucide-react";
import { api } from "@/src/lib/axios";
import { StockMovement } from "@/src/types";

export const StockTab: React.FC = () => {
  const { currentWarehouseId, currentWarehouse } = useWarehouseStore();
  const {
    items,
    summary,
    groupId,
    search,
    stockStatus,
    isLoading,
    fetchStock,
    setGroupId,
    setSearch,
    setStockStatus,
    exportCsv,
  } = useStockStore();
  const { groups, fetchGroups } = useNomenclatureStore();
  const { addToast } = useUiStore();

  const [movementsModalOpen, setMovementsModalOpen] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState("");
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  useEffect(() => {
    if (currentWarehouseId) {
      fetchStock({ warehouseId: currentWarehouseId }).catch(() => {});
      fetchGroups().catch(() => {});
    }
  }, [currentWarehouseId, fetchStock, fetchGroups]);

  const handleOpenMovements = async (productId: string, productName: string) => {
    if (!currentWarehouseId) return;
    setSelectedProductName(productName);
    setMovementsModalOpen(true);
    setIsLoadingMovements(true);
    try {
      const res = await api.get<{ success: boolean; data: StockMovement[] }>("/stock/movements", {
        params: { warehouseId: currentWarehouseId, productId },
      });
      setProductMovements(res.data.data || []);
    } catch {
      addToast("error", "Не удалось загрузить историю движений товара");
    } finally {
      setIsLoadingMovements(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            Остатки на складе
          </h2>
          <p className="text-xs text-slate-400">
            Текущие товарные остатки склада «{currentWarehouse?.name}»
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentWarehouseId && (
            <button
              onClick={() => exportCsv(currentWarehouseId)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
              title="Экспорт остатков в CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Экспорт CSV
            </button>
          )}

          <button
            onClick={() => currentWarehouseId && fetchStock({ warehouseId: currentWarehouseId })}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Всего позиций</div>
              <div className="text-lg font-bold text-white font-mono">{summary.totalPositions}</div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Общее количество</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {summary.totalQuantity.toLocaleString("ru-RU")} шт
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Себестоимость склада</div>
              <div className="text-lg font-bold text-amber-300 font-mono">
                {summary.totalCost.toLocaleString("ru-RU")} ₽
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Оценка в розничных ценах</div>
              <div className="text-lg font-bold text-indigo-300 font-mono">
                {summary.totalRetailValue.toLocaleString("ru-RU")} ₽
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, артикулу или штрихкоду..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Group selector */}
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Все группы номенклатуры</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        {/* Status buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          {(
            [
              { id: "ALL", label: "Все" },
              { id: "IN_STOCK", label: "В наличии" },
              { id: "ZERO_STOCK", label: "Нулевой остаток" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setStockStatus(s.id)}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                stockStatus === s.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {isLoading ? "Загрузка остатков..." : "Товары с выбранными параметрами не найдены"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                  <th className="p-3">Наименование</th>
                  <th className="p-3">Артикул</th>
                  <th className="p-3">Группа</th>
                  <th className="p-3 text-right">Остаток</th>
                  <th className="p-3 text-right">Закупка (₽)</th>
                  <th className="p-3 text-right">Розница (₽)</th>
                  <th className="p-3 text-right">Сумма склада (₽)</th>
                  <th className="p-3 text-center">История</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-semibold text-white">
                      <div>{it.name}</div>
                      {it.barcode && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ШК: {it.barcode}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-mono">{it.article}</td>
                    <td className="p-3 text-slate-300">
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {it.groupName}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          it.quantity > 0
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                            : "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                        }`}
                      >
                        {it.quantity} {it.unit}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {it.purchasePrice?.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="p-3 text-right font-mono text-slate-200 font-semibold">
                      {it.retailPrice?.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-300">
                      {(it.quantity * (it.purchasePrice || 0)).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenMovements(it.id, it.name)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition inline-flex items-center gap-1"
                        title="История движений товара"
                      >
                        <History className="w-4 h-4 text-emerald-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement History Modal */}
      {movementsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  Движения по товару: {selectedProductName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Склад: {currentWarehouse?.name}
                </p>
              </div>
              <button
                onClick={() => setMovementsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {isLoadingMovements ? (
                <div className="p-6 text-center text-slate-500 text-xs">Загрузка истории...</div>
              ) : productMovements.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  По этому товару ещё не зафиксировано движений на данном складе
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Дата</th>
                        <th className="p-2.5">Тип</th>
                        <th className="p-2.5 text-right">Изменение</th>
                        <th className="p-2.5 text-right">Остаток после</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {productMovements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/30">
                          <td className="p-2.5 text-slate-400 text-[11px]">
                            {new Date(m.createdAt).toLocaleString("ru-RU")}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                m.type === "INCOMING"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : m.type === "OUTGOING"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : "bg-blue-950 text-blue-300 border border-blue-800"
                              }`}
                            >
                              {m.type === "INCOMING"
                                ? "Приход"
                                : m.type === "OUTGOING"
                                ? "Расход (Счёт)"
                                : "Корректировка"}
                            </span>
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono font-bold ${
                              m.quantity > 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity} шт
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-200">
                            {m.balanceAfter} шт
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
              <button
                onClick={() => setMovementsModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
