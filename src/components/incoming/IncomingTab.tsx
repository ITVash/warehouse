"use client";

import React, { useEffect, useState } from "react";
import { useIncomingStore } from "@/src/stores/incoming.store";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { useNomenclatureStore } from "@/src/stores/nomenclature.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { useUiStore } from "@/src/stores/ui.store";
import { Incoming, DocumentStatus } from "@/src/types";
import {
  Truck,
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
  Building,
} from "lucide-react";

export const IncomingTab: React.FC = () => {
  const { currentWarehouseId, currentWarehouse } = useWarehouseStore();
  const {
    incomings,
    suppliers,
    statusFilter,
    search,
    isLoading,
    fetchIncomings,
    fetchSuppliers,
    setStatusFilter,
    setSearch,
    createIncoming,
    updateIncoming,
    postIncoming,
    deleteIncoming,
  } = useIncomingStore();
  const { items: nomenclatureItems, fetchItems: fetchNomenclature, getByBarcode } = useNomenclatureStore();
  const { role } = useAuthStore();
  const { openScanner, addToast } = useUiStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalIncoming, setViewModalIncoming] = useState<Incoming | null>(null);
  const [editingIncomingId, setEditingIncomingId] = useState<string | null>(null);

  const [formSupplierId, setFormSupplierId] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formItems, setFormItems] = useState<{ productId: string; quantity: number; purchasePrice: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentWarehouseId) {
      fetchIncomings({ warehouseId: currentWarehouseId }).catch(() => {});
      fetchSuppliers().catch(() => {});
      fetchNomenclature({ warehouseId: currentWarehouseId, pageSize: 100 }).catch(() => {});
    }
  }, [currentWarehouseId, fetchIncomings, fetchSuppliers, fetchNomenclature]);

  const openCreateModal = () => {
    setEditingIncomingId(null);
    setFormSupplierId(suppliers[0]?.id || "");
    const generatedNum = `ПР-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormNumber(generatedNum);
    setFormComment("");
    setFormItems([]);
    setSelectedProductId(nomenclatureItems[0]?.id || "");
    setModalOpen(true);
  };

  const openEditModal = (inc: Incoming) => {
    if (inc.status === "POSTED") {
      addToast("error", "Проведённый приход нельзя редактировать!");
      return;
    }
    setEditingIncomingId(inc.id);
    setFormSupplierId(inc.supplierId);
    setFormNumber(inc.number);
    setFormComment(inc.comment || "");
    setFormItems(
      inc.items?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
      })) || []
    );
    setModalOpen(true);
  };

  const handleAddItemToForm = (productId: string, qty = 1) => {
    const product = nomenclatureItems.find((n) => n.id === productId);
    if (!product) return;

    setFormItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === productId);
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [
        ...prev,
        {
          productId,
          quantity: qty,
          purchasePrice: product.purchasePrice || 0,
        },
      ];
    });
  };

  const handleBarcodeScan = () => {
    openScanner(async (barcode) => {
      const found = await getByBarcode(barcode);
      if (found) {
        handleAddItemToForm(found.id, 1);
        addToast("success", `Добавлено по штрихкоду: ${found.name}`);
      } else {
        addToast("error", `Товар со штрихкодом "${barcode}" не найден в номенклатуре`);
      }
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWarehouseId) return;
    if (!formSupplierId) {
      addToast("error", "Выберите поставщика");
      return;
    }
    if (!formNumber.trim()) {
      addToast("error", "Укажите номер накладной");
      return;
    }
    if (formItems.length === 0) {
      addToast("error", "Добавьте хотя бы одну позицию в приход");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingIncomingId) {
        await updateIncoming(editingIncomingId, {
          supplierId: formSupplierId,
          number: formNumber.trim(),
          comment: formComment.trim() || null,
          items: formItems,
        });
        addToast("success", "Приход успешно обновлен");
      } else {
        await createIncoming({
          warehouseId: currentWarehouseId,
          supplierId: formSupplierId,
          number: formNumber.trim(),
          comment: formComment.trim() || null,
          items: formItems,
        });
        addToast("success", "Черновик прихода создан");
      }
      setModalOpen(false);
    } catch {
      addToast("error", "Ошибка при сохранении документа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePost = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await postIncoming(id);
      addToast("success", "Приход успешно проведен! Остатки увеличены.");
      if (currentWarehouseId) {
        fetchIncomings({ warehouseId: currentWarehouseId });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Не удалось провести документ";
      addToast("error", errorMsg);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Удалить этот документ прихода?")) return;
    try {
      await deleteIncoming(id);
      addToast("success", "Документ удален");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Не удалось удалить документ";
      addToast("error", errorMsg);
    }
  };

  const totalCalculated = formItems.reduce((acc, cur) => acc + cur.quantity * cur.purchasePrice, 0);

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            Приходы от поставщиков
          </h2>
          <p className="text-xs text-slate-400">
            Оприходование товаров на склад «{currentWarehouse?.name}»
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role !== "GUEST" && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Создать приход
            </button>
          )}

          <button
            onClick={() => currentWarehouseId && fetchIncomings({ warehouseId: currentWarehouseId })}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по номеру или поставщику..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          {(["ALL", "DRAFT", "POSTED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {status === "ALL" ? "Все" : status === "DRAFT" ? "Черновики" : "Проведённые"}
            </button>
          ))}
        </div>
      </div>

      {/* Incomings List */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
        {incomings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {isLoading ? "Загрузка приходов..." : "Документы прихода не найдены"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                  <th className="p-3">Номер</th>
                  <th className="p-3">Поставщик</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3 text-right">Позиций</th>
                  <th className="p-3 text-right">Сумма (₽)</th>
                  <th className="p-3">Дата</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incomings.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => setViewModalIncoming(inc)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="p-3 font-semibold text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      {inc.number}
                    </td>
                    <td className="p-3 text-slate-300">
                      {inc.supplier?.name || "Поставщик не указан"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          inc.status === "POSTED"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                            : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                        }`}
                      >
                        {inc.status === "POSTED" ? "Проведён" : "Черновик"}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-300 font-mono">
                      {inc.items?.length || 0}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-100">
                      {(inc.totalAmount || 0).toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(inc.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {inc.status === "DRAFT" && role !== "GUEST" && (
                          <>
                            <button
                              onClick={(e) => handlePost(inc.id, e)}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded border border-emerald-600/40 text-[11px] font-medium transition flex items-center gap-1"
                              title="Провести документ"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Провести</span>
                            </button>
                            <button
                              onClick={() => openEditModal(inc)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                              title="Редактировать"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(inc.id, e)}
                              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setViewModalIncoming(inc)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          title="Просмотреть"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                {editingIncomingId ? "Редактирование прихода" : "Новый приход товаров"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Поставщик *
                  </label>
                  <select
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Номер накладной *
                  </label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Комментарий
                </label>
                <input
                  type="text"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="Дополнительные примечания к поставке..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Add item section */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Добавить товар в приход</span>
                  <button
                    type="button"
                    onClick={handleBarcodeScan}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded font-medium transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Сканировать штрихкод
                  </button>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {nomenclatureItems.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} (арт: {n.article}, остаток: {n.currentStock || 0})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => selectedProductId && handleAddItemToForm(selectedProductId)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Товар</th>
                      <th className="p-2.5 w-24">Кол-во</th>
                      <th className="p-2.5 w-28">Цена закупки (₽)</th>
                      <th className="p-2.5 w-24 text-right">Сумма</th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {formItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 text-xs">
                          Товары не добавлены. Выберите товар выше или сканируйте штрихкод.
                        </td>
                      </tr>
                    ) : (
                      formItems.map((item, idx) => {
                        const product = nomenclatureItems.find((n) => n.id === item.productId);
                        return (
                          <tr key={item.productId} className="hover:bg-slate-800/30">
                            <td className="p-2.5 text-white">
                              <div className="font-medium">{product?.name || "Товар"}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                арт: {product?.article || "-"}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setFormItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                                  );
                                }}
                                className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.purchasePrice}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  setFormItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, purchasePrice: val } : it
                                    )
                                  );
                                }}
                                className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-slate-200">
                              {(item.quantity * item.purchasePrice).toLocaleString("ru-RU")} ₽
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setFormItems((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-rose-400 hover:text-rose-300 p-1 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Total */}
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Итого сумма по накладной:</span>
                <span className="text-base font-bold text-indigo-400 font-mono">
                  {totalCalculated.toLocaleString("ru-RU")} ₽
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingIncomingId ? "Сохранить изменения" : "Создать приход (Черновик)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewModalIncoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" />
                  Приходная накладная {viewModalIncoming.number}
                </h3>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    viewModalIncoming.status === "POSTED"
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                      : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                  }`}
                >
                  {viewModalIncoming.status === "POSTED" ? "Проведён в остатки" : "Черновик"}
                </span>
              </div>
              <button
                onClick={() => setViewModalIncoming(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500">Поставщик:</span>
                  <div className="font-semibold text-white mt-0.5">
                    {viewModalIncoming.supplier?.name || "Не указан"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Склад приёма:</span>
                  <div className="font-semibold text-white mt-0.5">
                    {viewModalIncoming.warehouse?.name || currentWarehouse?.name}
                  </div>
                </div>
                {viewModalIncoming.comment && (
                  <div className="col-span-2 pt-2 border-t border-slate-800/60">
                    <span className="text-slate-500">Комментарий:</span>
                    <div className="text-slate-300 mt-0.5">{viewModalIncoming.comment}</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-300 mb-2">Товары в накладной:</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Товар</th>
                        <th className="p-2.5 text-right">Кол-во</th>
                        <th className="p-2.5 text-right">Закупка</th>
                        <th className="p-2.5 text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {viewModalIncoming.items?.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2.5 text-white">
                            <div className="font-medium">{it.product?.name || "Товар"}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              арт: {it.product?.article}
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-300">
                            {it.quantity} шт
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-300">
                            {it.purchasePrice?.toLocaleString("ru-RU")} ₽
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-white">
                            {(it.quantity * it.purchasePrice).toLocaleString("ru-RU")} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Общая сумма накладной:</span>
                <span className="text-base font-bold text-indigo-400 font-mono">
                  {(viewModalIncoming.totalAmount || 0).toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              {viewModalIncoming.status === "DRAFT" && role !== "GUEST" ? (
                <button
                  onClick={() => {
                    handlePost(viewModalIncoming.id);
                    setViewModalIncoming(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Провести приход сейчас
                </button>
              ) : (
                <span className="text-[11px] text-slate-500">Документ проведён в складской учёт</span>
              )}

              <button
                onClick={() => setViewModalIncoming(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
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
