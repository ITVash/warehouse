"use client";

import React, { useEffect, useState } from "react";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { useUiStore } from "@/src/stores/ui.store";
import { api } from "@/src/lib/axios";
import {
  BarChart3,
  Building2,
  TrendingUp,
  Boxes,
  Truck,
  FileText,
  ShieldCheck,
  RefreshCw,
  Award,
  Layers,
} from "lucide-react";
import { AuditLog } from "@/src/types";

interface ReportData {
  warehouses: {
    id: string;
    name: string;
    code: string;
    skuCount: number;
    totalStockQuantity: number;
    totalStockCost: number;
    postedOrdersCount: number;
    postedOrdersSum: number;
    postedIncomingsCount: number;
    postedIncomingsSum: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    article: string;
    totalSoldQty: number;
    totalSoldSum: number;
  }[];
  recentAudits: AuditLog[];
}

export const ReportsTab: React.FC = () => {
  const { currentWarehouse } = useWarehouseStore();
  const { addToast } = useUiStore();

  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ReportData }>("/reports");
      setReport(res.data.data);
    } catch {
      addToast("error", "Не удалось загрузить аналитические отчёты");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Складская аналитика и отчёты
          </h2>
          <p className="text-xs text-slate-400">
            Сравнение складов «ИП Новиков» и «ООО ТД Негоциант», финансовые показатели и журнал безопасности
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          Обновить отчёт
        </button>
      </div>

      {/* Comparison: ИП Новиков vs ООО ТД Негоциант */}
      <div>
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          Сводка по организациям и складам
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {report?.warehouses.map((wh) => (
            <div
              key={wh.id}
              className={`p-5 rounded-2xl border transition ${
                currentWarehouse?.id === wh.id
                  ? "bg-slate-900/80 border-indigo-500/50 shadow-lg shadow-indigo-950/20"
                  : "bg-slate-900/40 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs uppercase">
                    {wh.code}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{wh.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {wh.code === "novikov" ? "Основной торговый склад" : "Оптовый распределительный склад"}
                    </span>
                  </div>
                </div>

                {currentWarehouse?.id === wh.id && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Активен
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Номенклатурных позиций</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">{wh.skuCount}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Штук в наличии</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {wh.totalStockQuantity.toLocaleString("ru-RU")} шт
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Себестоимость склада</div>
                  <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
                    {wh.totalStockCost.toLocaleString("ru-RU")} ₽
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Проведено счетов (продаж)</div>
                  <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">
                    {wh.postedOrdersCount} шт
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 col-span-2">
                  <div className="text-[10px] text-slate-400">Выручка по счетам</div>
                  <div className="text-base font-bold text-indigo-300 font-mono mt-0.5">
                    {wh.postedOrdersSum.toLocaleString("ru-RU")} ₽
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top products & Audit log grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Лидеры продаж по номенклатуре
          </h3>

          {!report?.topProducts || report.topProducts.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              Нет данных о продажах. Проведите счета покупателей для формирования статистики.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Товар</th>
                    <th className="p-2.5 text-right">Продано</th>
                    <th className="p-2.5 text-right">Выручка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {report.topProducts.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-800/20">
                      <td className="p-2.5 text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">арт: {p.article}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-400 font-semibold">
                        {p.totalSoldQty} шт
                      </td>
                      <td className="p-2.5 text-right font-mono text-indigo-300 font-bold">
                        {p.totalSoldSum.toLocaleString("ru-RU")} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit log */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex flex-col">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Журнал аудита действий (Audit Log)
          </h3>

          {!report?.recentAudits || report.recentAudits.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              Записи аудита пока отсутствуют
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
              {report.recentAudits.map((a) => (
                <div
                  key={a.id}
                  className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-slate-200">
                      {a.action === "AUTH_LOGIN"
                        ? "Авторизация пользователя"
                        : a.action === "ROLE_CHANGED"
                        ? "Изменение роли доступа"
                        : a.action === "ORDER_POSTED"
                        ? "Проведение счёта покупателя"
                        : a.action === "INCOMING_POSTED"
                        ? "Проведение прихода от поставщика"
                        : a.action}
                    </div>
                    {a.details && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{a.details}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
