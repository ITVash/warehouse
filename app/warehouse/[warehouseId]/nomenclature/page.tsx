'use client';

import React, { useEffect, useState, use } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { Button, Input, Select, Dialog, StatusBadge } from '@/components/ui/common';
import { BarcodeScannerModal } from '@/components/scanner/BarcodeScannerModal';
import api from '@/lib/axios';

export default function NomenclaturePage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = use(params);

  const [items, setItems] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetField, setScannerTargetField] = useState<'search' | 'create'>('search');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    article: '',
    barcode: '',
    title: '',
    shortTitle: '',
    groupId: '',
    unit: 'шт',
    price: '0',
    minStock: '5',
    initialStock: '0',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (targetPage = page, query = searchQuery, group = selectedGroupId) => {
    try {
      setIsLoading(true);
      const [itemsRes, groupsRes] = await Promise.all([
        api.get('/nomenclature', {
          params: {
            warehouseId,
            page: targetPage,
            limit: 25,
            q: query,
            groupId: group,
          },
        }),
        groups.length === 0 ? api.get('/groups') : Promise.resolve({ data: { data: groups } }),
      ]);

      if (itemsRes.data.success) {
        setItems(itemsRes.data.data.items);
        setPage(itemsRes.data.data.pagination.page);
        setTotalPages(itemsRes.data.data.pagination.totalPages);
        setTotalCount(itemsRes.data.data.pagination.total);
      }
      if (groupsRes.data.success && groups.length === 0) {
        setGroups(groupsRes.data.data);
        if (groupsRes.data.data.length > 0 && !formData.groupId) {
          setFormData((prev) => ({ ...prev, groupId: groupsRes.data.data[0].id }));
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, searchQuery, selectedGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, selectedGroupId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1, searchQuery, selectedGroupId);
  };

  const handleScanBarcode = (barcode: string) => {
    if (scannerTargetField === 'search') {
      setSearchQuery(barcode);
      loadData(1, barcode, selectedGroupId);
    } else {
      setFormData((prev) => ({ ...prev, barcode }));
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.article || !formData.barcode || !formData.title || !formData.groupId) {
      setFormError('Заполните все обязательные поля');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/nomenclature', {
        ...formData,
        warehouseId,
      });

      if (res.data.success) {
        setIsCreateModalOpen(false);
        setFormData({
          article: '',
          barcode: '',
          title: '',
          shortTitle: '',
          groupId: groups[0]?.id || '',
          unit: 'шт',
          price: '0',
          minStock: '5',
          initialStock: '0',
        });
        loadData(1, searchQuery, selectedGroupId);
      }
    } catch (err: any) {
      setFormError(err.message || 'Ошибка сохранения товара');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProductDetail = async (productId: string) => {
    try {
      const res = await api.get(`/nomenclature/${productId}`);
      if (res.data.success) {
        setSelectedProduct(res.data.data);
        setIsDetailModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <WarehouseLayout warehouseId={warehouseId}>
      <div className="space-y-6">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Номенклатура</h1>
            <p className="text-xs text-slate-400 mt-1">
              Справочник товаров склада (всего {totalCount} поз.)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
          >
            + Добавить товар
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию, артикулу, штрихкоду..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    loadData(1, '', selectedGroupId);
                  }}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <Button type="submit" variant="secondary" size="md">
              Найти
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              title="Сканировать штрихкод камерой"
              onClick={() => {
                setScannerTargetField('search');
                setIsScannerOpen(true);
              }}
            >
              📷 <span className="hidden sm:inline">Сканер</span>
            </Button>
          </form>

          <div className="w-full md:w-56">
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                loadData(1, searchQuery, e.target.value);
              }}
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
        </div>

        {/* Nomenclature Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Загрузка товаров...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-3xl block mb-2">📦</span>
              <p className="text-sm font-medium text-slate-300">Товары не найдены</p>
              <p className="text-xs text-slate-500 mt-1">
                Попробуйте изменить параметры поиска или добавьте новый товар.
              </p>
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
                    <th className="py-3 px-4 text-right">Остаток</th>
                    <th className="py-3 px-4 text-right">Цена</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openProductDetail(item.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">{item.article}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{item.barcode}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-100">{item.title}</div>
                        {item.shortTitle && (
                          <div className="text-[11px] text-slate-500">{item.shortTitle}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{item.group?.name}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        <span
                          className={
                            item.stockQuantity <= 0
                              ? 'text-rose-400'
                              : item.stockQuantity <= item.minStock
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {item.stockQuantity} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {item.price ? `${item.price.toLocaleString()} ₽` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openProductDetail(item.id);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          Карточка
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Страница {page} из {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => loadData(page - 1, searchQuery, selectedGroupId)}
                >
                  ← Назад
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => loadData(page + 1, searchQuery, selectedGroupId)}
                >
                  Вперед →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Product Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Добавление товара в номенклатуру"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Артикул *"
              required
              value={formData.article}
              onChange={(e) => setFormData({ ...formData, article: e.target.value })}
              placeholder="ART-001"
            />

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Штрихкод *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="4601234567890"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  title="Сканировать камерой"
                  onClick={() => {
                    setScannerTargetField('create');
                    setIsScannerOpen(true);
                  }}
                >
                  📷
                </Button>
              </div>
            </div>
          </div>

          <Input
            label="Полное наименование товара *"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Бумага для печати SvetoCopy А4, 80 г/м2, 500 листов"
          />

          <Input
            label="Краткое наименование"
            value={formData.shortTitle}
            onChange={(e) => setFormData({ ...formData, shortTitle: e.target.value })}
            placeholder="Бумага А4 500л"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Группа товаров *"
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
            />

            <Input
              label="Единица измерения"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="шт, упак, кг"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Цена (₽)"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />

            <Input
              label="Минимальный остаток"
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
            />

            <Input
              label="Начальный остаток"
              type="number"
              value={formData.initialStock}
              onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Сохранить товар
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Product Detail Modal */}
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Карточка товара"
        maxWidth="max-w-2xl"
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-xs text-blue-400 font-mono">{selectedProduct.article}</span>
              <h2 className="text-lg font-bold text-white mt-1">{selectedProduct.title}</h2>
              {selectedProduct.shortTitle && (
                <p className="text-xs text-slate-400">{selectedProduct.shortTitle}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">Штрихкод</span>
                <span className="font-mono text-slate-200 mt-0.5 block">{selectedProduct.barcode}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">Группа</span>
                <span className="text-slate-200 mt-0.5 block">{selectedProduct.group?.name}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">Текущий остаток</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5 block">
                  {selectedProduct.stockQuantity} {selectedProduct.unit}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">Учетная цена</span>
                <span className="text-slate-200 mt-0.5 block font-medium">
                  {selectedProduct.price ? `${selectedProduct.price.toLocaleString()} ₽` : '—'}
                </span>
              </div>
            </div>

            {/* Movement History */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                История движения товара
              </h4>
              {selectedProduct.movements?.length === 0 ? (
                <p className="text-xs text-slate-500">Движений по данному товару пока нет.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 border border-slate-800 rounded-lg">
                  {selectedProduct.movements?.map((m: any) => (
                    <div key={m.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-950/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={m.type} />
                          <span className="text-slate-400">
                            {new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-1">{m.comments || m.referenceType}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-semibold ${
                            m.type === 'INCOMING' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {m.type === 'INCOMING' ? '+' : '-'}{m.quantity} {selectedProduct.unit}
                        </span>
                        {m.createdBy && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {m.createdBy.firstName || m.createdBy.username}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanBarcode}
      />
    </WarehouseLayout>
  );
}
