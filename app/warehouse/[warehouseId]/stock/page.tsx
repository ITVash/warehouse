'use client';

import React, { useEffect, useState, use } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { Button } from '@/components/ui/common';
import api from '@/lib/axios';

export default function StockPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = use(params);

  const [stocks, setStocks] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'positive' | 'zero'>('all');

  const loadStock = async () => {
    try {
      setIsLoading(true);
      const [stockRes, groupsRes] = await Promise.all([
        api.get('/stocks', {
          params: {
            warehouseId,
            q: search,
            groupId: selectedGroupId,
            inStock: stockFilter,
          },
        }),
        groups.length === 0 ? api.get('/groups') : Promise.resolve({ data: { data: groups } }),
      ]);

      if (stockRes.data.success) {
        setStocks(stockRes.data.data);
      }
      if (groupsRes.data.success && groups.length === 0) {
        setGroups(groupsRes.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, selectedGroupId, stockFilter]);

  const totalStockCount = stocks.reduce((acc, it) => acc + it.quantity, 0);
  const totalStockCost = stocks.reduce((acc, it) => acc + (it.quantity * it.price || 0), 0);

  return (
    <WarehouseLayout warehouseId={warehouseId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Остатки склада</h1>
            <p className="text-xs text-slate-400 mt-1">
              Текущие остатки номенклатуры, рассчитанные из проведенных приходов и счетов
            </p>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Наименований на складе</span>
            <div className="text-2xl font-bold text-white mt-1">{stocks.length} поз.</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Суммарный остаток (физ. ед.)</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">{totalStockCount.toLocaleString()} ед.</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Оценочная стоимость склада</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{totalStockCost.toLocaleString()} ₽</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск товара по названию, артикулу, штрихкоду..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Button variant="secondary" onClick={() => loadStock()}>
              Найти
            </Button>
          </div>

          <div className="w-full md:w-52">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Все группы</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                stockFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setStockFilter('positive')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                stockFilter === 'positive' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              В наличии
            </button>
            <button
              onClick={() => setStockFilter('zero')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                stockFilter === 'zero' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Закончились
            </button>
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Загрузка остатков...</div>
          ) : stocks.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-3xl block mb-2">📊</span>
              <p className="text-sm font-medium text-slate-300">Данные по остаткам отсутствуют</p>
              <p className="text-xs text-slate-500 mt-1">Оформите приход или добавьте товары в номенклатуру.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                  <tr>
                    <th className="py-3 px-4">Артикул</th>
                    <th className="py-3 px-4">Штрихкод</th>
                    <th className="py-3 px-4">Наименование</th>
                    <th className="py-3 px-4">Группа</th>
                    <th className="py-3 px-4 text-right">Текущий остаток</th>
                    <th className="py-3 px-4 text-right">Учетная цена</th>
                    <th className="py-3 px-4 text-right">Сумма остатка</th>
                    <th className="py-3 px-4 text-center">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {stocks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{item.article}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{item.barcode}</td>
                      <td className="py-3 px-4 font-medium text-slate-100">{item.title}</td>
                      <td className="py-3 px-4 text-slate-400">{item.group}</td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span
                          className={
                            item.quantity <= 0
                              ? 'text-rose-400'
                              : item.quantity <= item.minStock
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {item.price ? `${item.price.toLocaleString()} ₽` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-100">
                        {item.totalValue ? `${item.totalValue.toLocaleString()} ₽` : '0 ₽'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] font-medium ${
                            item.quantity <= 0
                              ? 'text-rose-400'
                              : item.quantity <= item.minStock
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
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
