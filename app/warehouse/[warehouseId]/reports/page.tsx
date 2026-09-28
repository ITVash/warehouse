'use client';

import React, { useEffect, useState, use } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { Button, StatusBadge } from '@/components/ui/common';
import * as XLSX from 'xlsx';
import api from '@/lib/axios';

export default function ReportsPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = use(params);

  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'groups'>('stock');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async (type = activeTab) => {
    try {
      setIsLoading(true);
      const res = await api.get('/reports', {
        params: { warehouseId, type },
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, activeTab]);

  const exportToExcel = () => {
    if (data.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Отчет_${activeTab}`);
    XLSX.writeFile(workbook, `sklad_report_${activeTab}_${Date.now()}.xlsx`);
  };

  return (
    <WarehouseLayout warehouseId={warehouseId}>
      <div className="space-y-6">
        {/* Header & Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Складские отчеты</h1>
            <p className="text-xs text-slate-400 mt-1">
              Аналитика остатков, движения товарных позиций и распределения по категориям
            </p>
          </div>
          <Button variant="secondary" onClick={exportToExcel} disabled={data.length === 0}>
            📥 Экспорт в Excel (XLSX)
          </Button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 space-x-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'stock'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Сводный отчет по остаткам
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'movements'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Движение товаров (Журнал операций)
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Остатки по группам
          </button>
        </div>

        {/* Content depending on Tab */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Формирование отчета...</div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">Данные по отчету отсутствуют</div>
          ) : activeTab === 'stock' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Артикул</th>
                    <th className="py-3 px-4">Штрихкод</th>
                    <th className="py-3 px-4">Товар</th>
                    <th className="py-3 px-4">Группа</th>
                    <th className="py-3 px-4 text-right">Количество</th>
                    <th className="py-3 px-4 text-right">Цена</th>
                    <th className="py-3 px-4 text-right">Сумма</th>
                    <th className="py-3 px-4 text-center">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {data.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono text-slate-400">{r.article}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-400">{r.barcode}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-100">{r.title}</td>
                      <td className="py-2.5 px-4 text-slate-400">{r.group}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-100">{r.quantity} {r.unit}</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">{r.price?.toLocaleString()} ₽</td>
                      <td className="py-2.5 px-4 text-right font-medium text-emerald-400">{r.totalCost?.toLocaleString()} ₽</td>
                      <td className="py-2.5 px-4 text-center">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'movements' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Дата / Время</th>
                    <th className="py-3 px-4">Товар</th>
                    <th className="py-3 px-4">Операция</th>
                    <th className="py-3 px-4 text-right">Количество</th>
                    <th className="py-3 px-4">Документ-основание</th>
                    <th className="py-3 px-4">Исполнитель</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {data.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-100">{m.product?.title}</div>
                        <div className="text-[10px] font-mono text-slate-500">{m.product?.article}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={m.type} />
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold">
                        <span className={m.type === 'INCOMING' ? 'text-emerald-400' : 'text-amber-400'}>
                          {m.type === 'INCOMING' ? '+' : '-'}{m.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {m.comments || m.referenceType}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {m.createdBy?.firstName || m.createdBy?.username || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Группа товаров</th>
                    <th className="py-3 px-4 text-center">Наименований</th>
                    <th className="py-3 px-4 text-right">Суммарный остаток</th>
                    <th className="py-3 px-4 text-right">Суммарная стоимость</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {data.map((g, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-100">{g.name}</td>
                      <td className="py-3 px-4 text-center text-slate-300">{g.totalItems}</td>
                      <td className="py-3 px-4 text-right font-medium text-blue-400">{g.totalStock.toLocaleString()} ед.</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{g.totalValue.toLocaleString()} ₽</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </WarehouseLayout>
  );
}
