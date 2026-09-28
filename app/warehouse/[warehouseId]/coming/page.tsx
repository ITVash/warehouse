'use client';

import React, { useEffect, useState, use } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { Button, Input, Dialog, StatusBadge } from '@/components/ui/common';
import api from '@/lib/axios';

export default function ComingPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = use(params);

  const [comings, setComings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComing, setSelectedComing] = useState<any | null>(null);

  // New Coming Form
  const [newNumber, setNewNumber] = useState(`ПР-${Math.floor(1000 + Math.random() * 9000)}`);
  const [supplierId, setSupplierId] = useState('');
  const [comments, setComments] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number; price: number }[]>([
    { productId: '', quantity: 10, price: 0 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComings = async (targetPage = page, query = search, status = statusFilter) => {
    try {
      setIsLoading(true);
      const res = await api.get('/coming', {
        params: {
          warehouseId,
          page: targetPage,
          limit: 25,
          q: query,
          status,
        },
      });

      if (res.data.success) {
        setComings(res.data.data.items);
        setPage(res.data.data.pagination.page);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalCount(res.data.data.pagination.total);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/clients'),
        api.get('/nomenclature', { params: { warehouseId, limit: 100 } }),
      ]);
      if (cRes.data.success) {
        setClients(cRes.data.data);
        if (cRes.data.data.length > 0 && !supplierId) {
          setSupplierId(cRes.data.data[0].id);
        }
      }
      if (pRes.data.success) {
        setProducts(pRes.data.data.items);
        if (pRes.data.data.items.length > 0 && items[0] && !items[0].productId) {
          setItems([{ productId: pRes.data.data.items[0].id, quantity: 10, price: pRes.data.data.items[0].price || 0 }]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadComings(1, search, statusFilter);
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, statusFilter]);

  const handleAddItemRow = () => {
    const firstP = products[0];
    setItems((prev) => [
      ...prev,
      { productId: firstP?.id || '', quantity: 10, price: firstP?.price || 0 },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[idx] };
      if (field === 'productId') {
        current.productId = value;
        const p = products.find((x) => x.id === value);
        if (p) current.price = p.price || 0;
      } else if (field === 'quantity') {
        current.quantity = Math.max(1, parseFloat(value) || 1);
      } else if (field === 'price') {
        current.price = Math.max(0, parseFloat(value) || 0);
      }
      updated[idx] = current;
      return updated;
    });
  };

  const handleCreateComing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierId) {
      setFormError('Выберите поставщика');
      return;
    }

    if (items.length === 0 || items.some((it) => !it.productId)) {
      setFormError('Добавьте позиции товаров');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/coming', {
        warehouseId,
        clientId: supplierId,
        number: newNumber,
        comments,
        items,
        status: 'CREATED',
      });

      if (res.data.success) {
        setIsCreateModalOpen(false);
        setNewNumber(`ПР-${Math.floor(1000 + Math.random() * 9000)}`);
        setComments('');
        loadComings(1, search, statusFilter);
      }
    } catch (err: any) {
      setFormError(err.message || 'Ошибка создания приходной накладной');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (comingId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/coming/${comingId}`, { status: newStatus });
      if (res.data.success) {
        if (selectedComing && selectedComing.id === comingId) {
          setSelectedComing(res.data.data);
        }
        loadComings(page, search, statusFilter);
      }
    } catch (err: any) {
      alert(`Ошибка обновления статуса: ${err.message}`);
    }
  };

  const totalCalculated = items.reduce((acc, it) => acc + it.quantity * it.price, 0);

  return (
    <WarehouseLayout warehouseId={warehouseId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Приходы от поставщиков</h1>
            <p className="text-xs text-slate-400 mt-1">
              Оприходование товаров на склад (всего {totalCount})
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
          >
            + Оформить приход
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadComings(1, search, statusFilter);
            }}
            className="flex-1 flex gap-2"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по номеру или поставщику..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Button type="submit" variant="secondary" size="md">
              Найти
            </Button>
          </form>

          <div className="w-full md:w-52">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                loadComings(1, search, e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Все статусы</option>
              <option value="CREATED">Создан</option>
              <option value="PROCESSING">В обработке</option>
              <option value="COMPLETED">Проведён (Оприходован)</option>
              <option value="CANCELLED">Отменён</option>
              <option value="DRAFT">Черновик</option>
            </select>
          </div>
        </div>

        {/* Coming Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Загрузка приходов...</div>
          ) : comings.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-3xl block mb-2">📥</span>
              <p className="text-sm font-medium text-slate-300">Приходы отсутствуют</p>
              <p className="text-xs text-slate-500 mt-1">Оформите первую поставку для пополнения остатков.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                  <tr>
                    <th className="py-3 px-4">Номер накладной</th>
                    <th className="py-3 px-4">Поставщик</th>
                    <th className="py-3 px-4">Дата</th>
                    <th className="py-3 px-4 text-center">Позиций</th>
                    <th className="py-3 px-4 text-right">Сумма</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4">Принял</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {comings.map((com) => (
                    <tr
                      key={com.id}
                      onClick={() => {
                        setSelectedComing(com);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-emerald-400">{com.number}</td>
                      <td className="py-3 px-4 font-medium text-slate-100">{com.supplier?.name}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(com.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{com.items?.length || 0}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-100">
                        {com.totalAmount?.toLocaleString()} ₽
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={com.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {com.createdBy?.firstName || com.createdBy?.username || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedComing(com);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          Открыть
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
                  onClick={() => loadComings(page - 1, search, statusFilter)}
                >
                  ← Назад
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => loadComings(page + 1, search, statusFilter)}
                >
                  Вперед →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Coming Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Оприходование товаров (Поступление)"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateComing} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Номер накладной поставщика *"
              required
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Поставщик *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Комментарий к поставке"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Номер ТТН, экспедитор, особенности приемки..."
          />

          {/* Positions Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Позиции приходной накладной:</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                + Добавить товар
              </button>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Товар</th>
                    <th className="py-2.5 px-3 text-right w-24">Кол-во</th>
                    <th className="py-2.5 px-3 text-right w-28">Цена закупки</th>
                    <th className="py-2.5 px-3 text-right w-28">Сумма</th>
                    <th className="py-2.5 px-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((item, idx) => {
                    const rowSum = item.quantity * item.price;
                    return (
                      <tr key={idx} className="bg-slate-900/60">
                        <td className="p-2">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title} ({p.article}) — ост: {p.stockQuantity} {p.unit}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-slate-200 focus:outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-slate-200 focus:outline-none"
                          />
                        </td>
                        <td className="p-2 text-right font-medium text-slate-200">
                          {rowSum.toLocaleString()} ₽
                        </td>
                        <td className="p-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-right mt-3 text-sm text-slate-300">
              Сумма поставки:{' '}
              <span className="font-bold text-base text-emerald-400">
                {totalCalculated.toLocaleString()} ₽
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Сохранить накладную
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Coming Detail & Conducting Modal */}
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedComing ? `Приход №${selectedComing.number}` : 'Приход'}
        maxWidth="max-w-2xl"
      >
        {selectedComing && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400">Поставщик:</span>
                <div className="text-sm font-semibold text-white">{selectedComing.supplier?.name}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Статус:</span>
                <StatusBadge status={selectedComing.status} />
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Товар</th>
                    <th className="py-2.5 px-3 text-center">Артикул</th>
                    <th className="py-2.5 px-3 text-right">Кол-во</th>
                    <th className="py-2.5 px-3 text-right">Цена закупки</th>
                    <th className="py-2.5 px-3 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedComing.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-medium text-slate-200">{it.product?.title}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{it.product?.article}</td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-400">
                        +{it.quantity} {it.product?.unit}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">{it.price?.toLocaleString()} ₽</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-100">
                        {(it.quantity * it.price).toLocaleString()} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800/80">
              <span className="text-xs text-slate-400">Итоговая стоимость поставки:</span>
              <span className="text-base font-bold text-emerald-400">
                {selectedComing.totalAmount?.toLocaleString()} ₽
              </span>
            </div>

            {selectedComing.comments && (
              <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                💬 {selectedComing.comments}
              </p>
            )}

            {/* Workflow controls */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedComing.status !== 'COMPLETED' && selectedComing.status !== 'CANCELLED' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedComing.id, 'COMPLETED')}
                    >
                      ✓ Провести (Увеличить остатки)
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedComing.id, 'CANCELLED')}
                    >
                      Отменить
                    </Button>
                  </>
                )}

                {selectedComing.status === 'COMPLETED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedComing.id, 'CANCELLED')}
                  >
                    Отменить проведение
                  </Button>
                )}
              </div>

              <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </WarehouseLayout>
  );
}
