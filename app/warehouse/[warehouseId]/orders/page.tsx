'use client';

import React, { useEffect, useState, use } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { Button, Input, Select, Dialog, StatusBadge } from '@/components/ui/common';
import api from '@/lib/axios';

export default function OrdersPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = use(params);

  const [orders, setOrders] = useState<any[]>([]);
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
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // New Order Form
  const [newOrderNumber, setNewOrderNumber] = useState(`СЧ-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newOrderClientId, setNewOrderClientId] = useState('');
  const [newOrderComments, setNewOrderComments] = useState('');
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; price: number }[]>([
    { productId: '', quantity: 1, price: 0 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Client creation
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  const loadOrders = async (targetPage = page, query = search, status = statusFilter) => {
    try {
      setIsLoading(true);
      const res = await api.get('/orders', {
        params: {
          warehouseId,
          page: targetPage,
          limit: 25,
          q: query,
          status,
        },
      });

      if (res.data.success) {
        setOrders(res.data.data.items);
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
        if (cRes.data.data.length > 0 && !newOrderClientId) {
          setNewOrderClientId(cRes.data.data[0].id);
        }
      }
      if (pRes.data.success) {
        setProducts(pRes.data.data.items);
        if (pRes.data.data.items.length > 0 && orderItems[0] && !orderItems[0].productId) {
          setOrderItems([{ productId: pRes.data.data.items[0].id, quantity: 1, price: pRes.data.data.items[0].price || 0 }]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOrders(1, search, statusFilter);
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, statusFilter]);

  const handleAddItemRow = () => {
    const firstP = products[0];
    setOrderItems((prev) => [
      ...prev,
      { productId: firstP?.id || '', quantity: 1, price: firstP?.price || 0 },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    setOrderItems((prev) => {
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newOrderClientId) {
      setFormError('Выберите клиента');
      return;
    }

    if (orderItems.length === 0 || orderItems.some((it) => !it.productId)) {
      setFormError('Добавьте корректные позиции товаров');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/orders', {
        warehouseId,
        clientId: newOrderClientId,
        number: newOrderNumber,
        comments: newOrderComments,
        items: orderItems,
        status: 'CREATED',
      });

      if (res.data.success) {
        setIsCreateModalOpen(false);
        setNewOrderNumber(`СЧ-${Math.floor(1000 + Math.random() * 9000)}`);
        setNewOrderComments('');
        loadOrders(1, search, statusFilter);
      }
    } catch (err: any) {
      setFormError(err.message || 'Ошибка создания счета');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      const res = await api.post('/clients', { name: newClientName.trim() });
      if (res.data.success) {
        setClients((prev) => [...prev, res.data.data]);
        setNewOrderClientId(res.data.data.id);
        setNewClientName('');
        setIsCreateClientOpen(false);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/orders/${orderId}`, { status: newStatus });
      if (res.data.success) {
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(res.data.data);
        }
        loadOrders(page, search, statusFilter);
      }
    } catch (err: any) {
      alert(`Ошибка обновления статуса: ${err.message}`);
    }
  };

  const totalCalculated = orderItems.reduce((acc, it) => acc + it.quantity * it.price, 0);

  return (
    <WarehouseLayout warehouseId={warehouseId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Счета покупателей</h1>
            <p className="text-xs text-slate-400 mt-1">
              Расходные накладные и счета на оплату (всего {totalCount})
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
          >
            + Создать счет
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadOrders(1, search, statusFilter);
            }}
            className="flex-1 flex gap-2"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по номеру счета или клиенту..."
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
                loadOrders(1, search, e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">Все статусы</option>
              <option value="CREATED">Создан</option>
              <option value="PROCESSING">В обработке</option>
              <option value="COMPLETED">Проведён (Списан)</option>
              <option value="CANCELLED">Отменён</option>
              <option value="DRAFT">Черновик</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Загрузка счетов...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <span className="text-3xl block mb-2">📄</span>
              <p className="text-sm font-medium text-slate-300">Счета не найдены</p>
              <p className="text-xs text-slate-500 mt-1">Создайте первый расходный счет для покупателя.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                  <tr>
                    <th className="py-3 px-4">Номер</th>
                    <th className="py-3 px-4">Клиент</th>
                    <th className="py-3 px-4">Дата</th>
                    <th className="py-3 px-4 text-center">Позиций</th>
                    <th className="py-3 px-4 text-right">Сумма</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4">Автор</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {orders.map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-blue-400">{ord.number}</td>
                      <td className="py-3 px-4 font-medium text-slate-100">{ord.client?.name}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{ord.items?.length || 0}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-100">
                        {ord.totalAmount?.toLocaleString()} ₽
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ord.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {ord.createdBy?.firstName || ord.createdBy?.username || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(ord);
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
                  onClick={() => loadOrders(page - 1, search, statusFilter)}
                >
                  ← Назад
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => loadOrders(page + 1, search, statusFilter)}
                >
                  Вперед →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Новый счет покупателя"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Номер счета *"
              required
              value={newOrderNumber}
              onChange={(e) => setNewOrderNumber(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">Клиент *</label>
                <button
                  type="button"
                  onClick={() => setIsCreateClientOpen(true)}
                  className="text-[11px] text-blue-400 hover:text-blue-300"
                >
                  + Новый клиент
                </button>
              </div>
              <select
                required
                value={newOrderClientId}
                onChange={(e) => setNewOrderClientId(e.target.value)}
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
            label="Комментарий к счету"
            value={newOrderComments}
            onChange={(e) => setNewOrderComments(e.target.value)}
            placeholder="Оплата по безналичному расчету, самовывоз..."
          />

          {/* Positions Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Товарные позиции счета:</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                + Добавить строку
              </button>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Товар</th>
                    <th className="py-2.5 px-3 text-right w-24">Кол-во</th>
                    <th className="py-2.5 px-3 text-right w-28">Цена (₽)</th>
                    <th className="py-2.5 px-3 text-right w-28">Сумма</th>
                    <th className="py-2.5 px-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orderItems.map((item, idx) => {
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
                          {orderItems.length > 1 && (
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
              Итого к оплате:{' '}
              <span className="font-bold text-base text-white">{totalCalculated.toLocaleString()} ₽</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Сохранить счет
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Order Detail & Conducting Modal */}
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedOrder ? `Счет №${selectedOrder.number}` : 'Счет'}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400">Клиент:</span>
                <div className="text-sm font-semibold text-white">{selectedOrder.client?.name}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Статус:</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Товар</th>
                    <th className="py-2.5 px-3 text-center">Артикул</th>
                    <th className="py-2.5 px-3 text-right">Кол-во</th>
                    <th className="py-2.5 px-3 text-right">Цена</th>
                    <th className="py-2.5 px-3 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedOrder.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-medium text-slate-200">{it.product?.title}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{it.product?.article}</td>
                      <td className="py-2 px-3 text-right">{it.quantity} {it.product?.unit}</td>
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
              <span className="text-xs text-slate-400">Общая сумма счета:</span>
              <span className="text-base font-bold text-white">
                {selectedOrder.totalAmount?.toLocaleString()} ₽
              </span>
            </div>

            {selectedOrder.comments && (
              <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                💬 {selectedOrder.comments}
              </p>
            )}

            {/* Workflow status controls */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                    >
                      ✓ Провести (Списать остатки)
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'PROCESSING')}
                    >
                      В обработку
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    >
                      Отменить
                    </Button>
                  </>
                )}

                {selectedOrder.status === 'COMPLETED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                  >
                    Отменить проведение (Вернуть остатки)
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

      {/* Quick Add Client Modal */}
      <Dialog
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        title="Добавить контрагента"
      >
        <form onSubmit={handleCreateQuickClient} className="space-y-4">
          <Input
            label="Наименование контрагента *"
            required
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            placeholder="ООO 'ТоргСервис'"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateClientOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Создать
            </Button>
          </div>
        </form>
      </Dialog>
    </WarehouseLayout>
  );
}
