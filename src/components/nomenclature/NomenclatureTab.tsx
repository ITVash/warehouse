"use client";

import React, { useEffect, useState } from "react";
import { useNomenclatureStore } from "@/src/stores/nomenclature.store";
import { useWarehouseStore } from "@/src/stores/warehouse.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { useUiStore } from "@/src/stores/ui.store";
import { Nomenclature } from "@/src/types";
import {
  Package,
  Plus,
  Camera,
  Search,
  Filter,
  Edit,
  Trash2,
  RefreshCw,
  X,
  Barcode as BarcodeIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const NomenclatureTab: React.FC = () => {
  const { currentWarehouseId, currentWarehouse } = useWarehouseStore();
  const {
    items,
    groups,
    total,
    page,
    pageSize,
    totalPages,
    search,
    groupId,
    isLoading,
    fetchGroups,
    fetchItems,
    setSearch,
    setGroupId,
    setPage,
    createItem,
    updateItem,
    deleteItem,
  } = useNomenclatureStore();
  const { role } = useAuthStore();
  const { openScanner, addToast } = useUiStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Nomenclature | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formShortTitle, setFormShortTitle] = useState("");
  const [formArticle, setFormArticle] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formPrice, setFormPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchGroups().catch(() => {});
  }, [fetchGroups]);

  useEffect(() => {
    if (currentWarehouseId) {
      fetchItems({ warehouseId: currentWarehouseId, page, pageSize }).catch(() => {});
    }
  }, [currentWarehouseId, page, pageSize, fetchItems]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormShortTitle("");
    setFormArticle(`АРТ-${Math.floor(100 + Math.random() * 900)}`);
    setFormBarcode("");
    setFormGroupId(groups[0]?.id || "");
    setFormPrice(0);
    setModalOpen(true);
  };

  const openEditModal = (item: Nomenclature) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormShortTitle(item.shortTitle || "");
    setFormArticle(item.article);
    setFormBarcode(item.barcode || "");
    setFormGroupId(item.groupId);
    setFormPrice(item.price);
    setModalOpen(true);
  };

  const handleScanBarcodeForForm = () => {
    openScanner({
      title: editingItem ? "Изменить штрихкод сканером" : "Сканировать штрихкод для товара",
      onScan: (barcode) => {
        setFormBarcode(barcode);
        addToast("success", `Штрихкод ${barcode} успешно зафиксирован`);
      },
    });
  };

  const handleScanForSearch = () => {
    openScanner({
      title: "Поиск товара по штрихкоду",
      onScan: (barcode) => {
        setSearch(barcode);
        if (currentWarehouseId) {
          fetchItems({ warehouseId: currentWarehouseId, search: barcode });
        }
      },
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWarehouseId) return;
    if (!formTitle.trim()) {
      addToast("error", "Укажите название товара");
      return;
    }
    if (!formArticle.trim()) {
      addToast("error", "Укажите артикул");
      return;
    }
    if (!formGroupId) {
      addToast("error", "Выберите товарную группу");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateItem(editingItem.id, {
          title: formTitle,
          shortTitle: formShortTitle || null,
          article: formArticle,
          barcode: formBarcode || null,
          groupId: formGroupId,
          price: formPrice,
        });
        addToast("success", "Товар успешно обновлен");
      } else {
        await createItem({
          warehouseId: currentWarehouseId,
          title: formTitle,
          shortTitle: formShortTitle || null,
          article: formArticle,
          barcode: formBarcode || null,
          groupId: formGroupId,
          price: formPrice,
        });
        addToast("success", "Товар успешно добавлен в номенклатуру");
      }

      setModalOpen(false);
      fetchItems({ warehouseId: currentWarehouseId });
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Ошибка при сохранении товара");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Удалить позицию "${title}" из номенклатуры?`)) return;
    try {
      await deleteItem(id);
      addToast("success", "Товар удален");
      if (currentWarehouseId) fetchItems({ warehouseId: currentWarehouseId });
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Ошибка при удалении товара");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию, артикулу, штрихкоду..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (currentWarehouseId) {
                  fetchItems({ warehouseId: currentWarehouseId, search: e.target.value });
                }
              }}
              className="w-full pl-9 pr-9 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleScanForSearch}
              title="Сканировать для поиска"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                if (currentWarehouseId) {
                  fetchItems({ warehouseId: currentWarehouseId, groupId: e.target.value });
                }
              }}
              className="bg-transparent text-xs text-slate-200 focus:outline-none pr-1"
            >
              <option value="all">Все группы</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentWarehouseId) fetchItems({ warehouseId: currentWarehouseId });
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
            Добавить товар
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Товар</th>
                <th className="py-3 px-4">Артикул</th>
                <th className="py-3 px-4">Штрихкод</th>
                <th className="py-3 px-4">Группа</th>
                <th className="py-3 px-4 text-right">Текущий остаток</th>
                <th className="py-3 px-4 text-right">Цена продажи</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-2" />
                    Загрузка номенклатуры...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Товары не найдены. Нажмите «Добавить товар».
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isZero = Number(item.quantity) <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{item.title}</div>
                        {item.shortTitle && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.shortTitle}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {item.article}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {item.barcode ? (
                          <span className="flex items-center gap-1">
                            <BarcodeIcon className="w-3.5 h-3.5 text-slate-500" />
                            {item.barcode}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.group?.name || "Без группы"}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span
                          className={`font-semibold ${
                            isZero ? "text-rose-400 font-bold" : "text-emerald-400"
                          }`}
                        >
                          {item.quantity} шт.
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-white">
                        {item.price.toLocaleString("ru-RU")} ₽
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Редактировать товар"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {role === "ADMIN" && (
                            <button
                              onClick={() => handleDeleteItem(item.id, item.title)}
                              title="Удалить товар"
                              className="p-1.5 rounded-md hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
            <div>
              Всего позиций: <span className="font-semibold text-white">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingItem ? "Редактирование номенклатуры" : "Новая товарная позиция"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Полное наименование *</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Бумага А4 SvetoCopy Classic (500 листов)"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Краткое наименование</label>
                <input
                  type="text"
                  placeholder="Например: Бумага А4 SvetoCopy"
                  value={formShortTitle}
                  onChange={(e) => setFormShortTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Артикул *</label>
                  <input
                    type="text"
                    required
                    value={formArticle}
                    onChange={(e) => setFormArticle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Товарная группа *</label>
                  <select
                    value={formGroupId}
                    onChange={(e) => setFormGroupId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Штрихкод</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ввести вручную или сканировать"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleScanBarcodeForForm}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-1.5 transition"
                  >
                    <Camera className="w-4 h-4" />
                    Сканировать
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Базовая цена продажи, ₽</label>
                  <input
                    type="number"
                    min={0}
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {editingItem && (
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Текущий остаток (только просмотр)</label>
                    <div className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 font-mono text-emerald-400 font-semibold cursor-not-allowed">
                      {editingItem.quantity} шт.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
