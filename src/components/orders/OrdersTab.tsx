"use client";

import React, { useEffect, useState } from "react";
import { useOrderStore } from "@/src/stores/order.store";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { useNomenclatureStore } from "@/src/stores/nomenclature.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { useUiStore } from "@/src/stores/ui.store";
import { Order, DocumentStatus } from "@/src/types";
import {
  FileText,
  Plus,
  Camera,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  Search,
  Filter,
  RefreshCw,
  X,
  AlertTriangle,
} from "lucide-react";

export const OrdersTab: React.FC = () => {
  const { currentWarehouseId, currentWarehouse } = useWarehouseStore();
  const {
    orders,
    clients,
    statusFilter,
    search,
    isLoading,
    fetchOrders,
    fetchClients,
    setStatusFilter,
    setSearch,
    createOrder,
    updateOrder,
    postOrder,
    deleteOrder,
  } = useOrderStore();
  const { items: nomenclatureItems, fetchItems: fetchNomenclature, getByBarcode } = useNomenclatureStore();
  const { role } = useAuthStore();
  const { openScanner, addToast } = useUiStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOrder, setViewModalOrder] = useState<Order | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [formClientId, setFormClientId] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formItems, setFormItems] = useState<{ productId: string; quantity: number; price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentWarehouseId) {
      fetchOrders({ warehouseId: currentWarehouseId }).catch(() => {});
      fetchClients().catch(() => {});
      fetchNomenclature({ warehouseId: currentWarehouseId, pageSize: 100 }).catch(() => {});
    }
  }, [currentWarehouseId, fetchOrders, fetchClients, fetchNomenclature]);

  const openCreateModal = () => {
    setEditingOrderId(null);
    setFormClientId(clients[0]?.id || "");
    const generatedNum = `СЧ-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormNumber(generatedNum);
    setFormComment("");
    setFormItems([]);
    setSelectedProductId(nomenclatureItems[0]?.id || "");
    setModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    if (order.status === "POSTED") {
      addToast("error", "Проведённый счёт нельзя редактировать!");
      return;
    }
    setEditingOrderId(order.id);
    setFormClientId(order.clientId);
    setFormNumber(order.number);
    setFormComment(order.comment || "");
    setFormItems(
      order.items?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })) || []
    );
    setModalOpen(true);
  };

  const handleAddItemToForm = (productId: string, qty = 1) => {
    const product = nomenclatureItems.find((n) => n.id === productId);
    if (!product) return;

    setFormItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === productId);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex].quantity += qty;
        return copy;
      }
      return [...prev, { productId, quantity: qty, price: product.price }];
    });
  };

  const handleScanBarcodeForOrder = () => {
    if (!currentWarehouseId) return;
    openScanner({
      title: "Сканировать товар в счёт",
      onScan: async (barcode) => {
        try {
          const product = await getByBarcode(currentWarehouseId, barcode);
          handleAddItemToForm(product.id, 1);
          addToast("success", `Товар "${product.title}" добавлен в счёт`);
        } catch (err: unknown) {
          addToast("error", (err as Error)?.message || "Товар с таким штрихкодом не найден на складе");
        }
      },
    });
  };

  const handleSaveOrder = async (shouldPost = false) => {
    if (!currentWarehouseId) return;
    if (!formClientId) {
      addToast("error", "Выберите клиента");
      return;
    }
    if (!formNumber.trim()) {
      addToast("error", "Укажите номер счёта");
      return;
    }
    if (formItems.length === 0) {
      addToast("error", "Добавьте хотя бы один товар в счёт");
      return;
    }

    setIsSubmitting(true);
    try {
      let savedOrder: Order;
      if (editingOrderId) {
        savedOrder = await updateOrder(editingOrderId, {
          clientId: formClientId,
          number: formNumber,
          comment: formComment,
          items: formItems,
        });
        addToast("success", `Счёт №${savedOrder.number} обновлен`);
      } else {
        savedOrder = await createOrder({
          warehouseId: currentWarehouseId,
          clientId: formClientId,
          number: formNumber,
          comment: formComment,
          items: formItems,
        });
        addToast("success", `Счёт №${savedOrder.number} сохранен как черновик`);
      }

      if (shouldPost) {
        await postOrder(savedOrder.id);
        addToast("success", `Счёт №${savedOrder.number} успешно проведён!`);
      }

      setModalOpen(false);
      fetchOrders({ warehouseId: currentWarehouseId });
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Ошибка при сохранении счёта");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostDirect = async (id: string, number: string) => {
    if (!confirm(`Провести счёт №${number}? Складские остатки будут списаны.`)) return;
    try {
      await postOrder(id);
      addToast("success", `Счёт №${number} проведён`);
      if (currentWarehouseId) fetchOrders({ warehouseId: currentWarehouseId });
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Ошибка проведения");
    }
  };

  const handleDeleteDirect = async (id: string, number: string) => {
    if (!confirm(`Удалить черновик счёта №${number}?`)) return;
    try {
      await deleteOrder(id);
      addToast("success", `Счёт №${number} удален`);
      if (currentWarehouseId) fetchOrders({ warehouseId: currentWarehouseId });
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Ошибка удаления");
    }
  };

  const totalCalculatedSum = formItems.reduce((acc, item) => acc + item.quantity * item.price, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по №, клиенту..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (currentWarehouseId) {
                  fetchOrders({ warehouseId: currentWarehouseId, search: e.target.value });
                }
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            {(["ALL", "DRAFT", "POSTED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  if (currentWarehouseId) {
                    fetchOrders({ warehouseId: currentWarehouseId, status: st });
                  }
                }}
                className={`px-2.5 py-1 rounded-md transition text-xs font-medium ${
                  statusFilter === st
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "Все" : st === "DRAFT" ? "Черновики" : "Проведённые"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentWarehouseId) fetchOrders({ warehouseId: currentWarehouseId });
            }}
            title="Обновить"
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Создать счёт
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">№ счёта</th>
                <th className="py-3 px-4">Клиент</th>
                <th className="py-3 px-4">Дата</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4 text-right">Позиций</th>
                <th className="py-3 px-4 text-right">Сумма</th>
                <th className="py-3 px-4">Создал</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-2" />
                    Загрузка счетов...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Счета покупателей отсутствуют. Нажмите «Создать счёт».
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isPosted = ord.status === "POSTED";
                  const itemsCount = ord.items?.length || 0;

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {ord.number}
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {ord.client?.name || "Не указан"}
                      </td>
                      <td className="py-3 px-4 text-slate-400 tabular-nums">
                        {new Date(ord.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPosted
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {isPosted ? "Проведён" : "Черновик"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                        {itemsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-white tabular-nums">
                        {ord.totalAmount.toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {ord.createdBy?.firstName || ord.createdBy?.username || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewModalOrder(ord)}
                            title="Просмотреть"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isPosted ? (
                            <>
                              <button
                                onClick={() => openEditModal(ord)}
                                title="Редактировать черновик"
                                className="p-1.5 rounded-md hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePostDirect(ord.id, ord.number)}
                                title="Провести счёт"
                                className="p-1.5 rounded-md hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDirect(ord.id, ord.number)}
                                title="Удалить"
                                className="p-1.5 rounded-md hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic pr-1">Проведён</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingOrderId ? `Редактирование счёта ${formNumber}` : "Создание счёта покупателя"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Клиент *</label>
                  <select
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Номер счёта *</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Комментарий к счёту</label>
                <input
                  type="text"
                  placeholder="Примечание к поставке или оплате"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-slate-300">Добавление товаров в счёт:</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    {nomenclatureItems.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({n.article}) — {n.price} ₽ [Остаток: {n.quantity}]
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItemToForm(selectedProductId)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition"
                    >
                      + Добавить
                    </button>
                    <button
                      type="button"
                      onClick={handleScanBarcodeForOrder}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Сканировать
                    </button>
                  </div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2.5">Товар</th>
                      <th className="p-2.5 text-right w-24">Кол-во</th>
                      <th className="p-2.5 text-right w-24">Цена, ₽</th>
                      <th className="p-2.5 text-right w-28">Сумма, ₽</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {formItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                          Товары не добавлены. Используйте выбор выше или камеру-сканер.
                        </td>
                      </tr>
                    ) : (
                      formItems.map((item, idx) => {
                        const product = nomenclatureItems.find((n) => n.id === item.productId);
                        const isLowStock = product ? product.quantity < item.quantity : false;

                        return (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-2.5">
                              <p className="font-medium text-white">{product?.title || item.productId}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>Арт: {product?.article}</span>
                                {product?.barcode && <span>ШК: {product.barcode}</span>}
                                {isLowStock && (
                                  <span className="text-amber-400 flex items-center gap-0.5 font-bold">
                                    <AlertTriangle className="w-3 h-3" /> Остаток {product?.quantity} &lt; {item.quantity}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setFormItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx].quantity = val;
                                    return copy;
                                  });
                                }}
                                className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-right text-white font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                value={item.price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setFormItems((prev) => {
                                    const copy = [...prev];
                                    copy[idx].price = val;
                                    return copy;
                                  });
                                }}
                                className="w-20 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-xs text-right text-white font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-white">
                              {(item.quantity * item.price).toLocaleString("ru-RU")}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormItems((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-slate-400 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs text-slate-300 font-semibold">Итого к оплате:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {totalCalculatedSum.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrder(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                Сохранить черновик
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrder(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Сохранить и Провести
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Счёт №{viewModalOrder.number}
                </h3>
                <span className="text-xs text-slate-400">Склад: {currentWarehouse?.name}</span>
              </div>
              <button
                onClick={() => setViewModalOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/40 rounded-xl">
                <div>
                  <span className="text-slate-400">Клиент:</span>
                  <p className="font-semibold text-white">{viewModalOrder.client?.name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Статус:</span>
                  <p className="font-semibold text-emerald-400">{viewModalOrder.status}</p>
                </div>
                <div>
                  <span className="text-slate-400">Дата создания:</span>
                  <p className="font-mono text-slate-200">{new Date(viewModalOrder.createdAt).toLocaleString("ru-RU")}</p>
                </div>
                {viewModalOrder.postedAt && (
                  <div>
                    <span className="text-slate-400">Дата проведения:</span>
                    <p className="font-mono text-emerald-300">{new Date(viewModalOrder.postedAt).toLocaleString("ru-RU")}</p>
                  </div>
                )}
              </div>

              {viewModalOrder.comment && (
                <div className="p-2.5 rounded-lg bg-slate-800/30 text-slate-300">
                  <span className="text-slate-500">Комментарий: </span>
                  {viewModalOrder.comment}
                </div>
              )}

              <div className="border border-slate-800 rounded-xl overflow-hidden mt-3">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="p-2">Товар</th>
                      <th className="p-2 text-right">Кол-во</th>
                      <th className="p-2 text-right">Цена</th>
                      <th className="p-2 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {viewModalOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2">
                          <p className="text-white font-medium">{item.product?.title || item.productId}</p>
                          <span className="text-[10px] text-slate-400">Арт: {item.product?.article}</span>
                        </td>
                        <td className="p-2 text-right font-mono">{item.quantity}</td>
                        <td className="p-2 text-right font-mono">{item.price} ₽</td>
                        <td className="p-2 text-right font-mono font-bold text-white">{item.total.toLocaleString("ru-RU")} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800 text-sm font-semibold">
                <span>Итого по счёту:</span>
                <span className="font-mono text-emerald-400">{viewModalOrder.totalAmount.toLocaleString("ru-RU")} ₽</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => setViewModalOrder(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
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
