"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/src/lib/axios";
import { useUiStore } from "@/src/stores/ui.store";
import { useAuthStore } from "@/src/stores/auth.store";
import { Client, Supplier } from "@/src/types";
import {
  Briefcase,
  Users,
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  FileBadge,
  MapPin,
  X,
  RefreshCw,
} from "lucide-react";

export const CounterpartiesTab: React.FC = () => {
  const { addToast } = useUiStore();
  const { role } = useAuthStore();

  const [activeSubTab, setActiveSubTab] = useState<"clients" | "suppliers">("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [inn, setInn] = useState("");
  const [address, setAddress] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        api.get<{ success: boolean; data: Client[] }>("/clients"),
        api.get<{ success: boolean; data: Supplier[] }>("/suppliers"),
      ]);
      setClients(cRes.data.data || []);
      setSuppliers(sRes.data.data || []);
    } catch {
      addToast("error", "Не удалось загрузить контрагентов");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setEmail("");
    setInn("");
    setAddress("");
    setModalOpen(true);
  };

  const openEditModal = (item: Client | Supplier) => {
    setEditingId(item.id);
    setName(item.name);
    setPhone(item.phone || "");
    setEmail(item.email || "");
    setInn(item.inn || "");
    setAddress(item.address || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast("error", "Введите наименование контрагента");
      return;
    }

    try {
      const endpoint = activeSubTab === "clients" ? "/clients" : "/suppliers";
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        inn: inn.trim() || undefined,
        address: address.trim() || undefined,
      };

      if (editingId) {
        await api.put(`${endpoint}/${editingId}`, payload);
        addToast("success", "Контрагент успешно обновлен");
      } else {
        await api.post(endpoint, payload);
        addToast("success", "Контрагент успешно добавлен");
      }

      setModalOpen(false);
      fetchData();
    } catch {
      addToast("error", "Ошибка при сохранении контрагента");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить контрагента?")) return;
    try {
      const endpoint = activeSubTab === "clients" ? "/clients" : "/suppliers";
      await api.delete(`${endpoint}/${id}`);
      addToast("success", "Контрагент удален");
      fetchData();
    } catch {
      addToast("error", "Не удалось удалить контрагента (возможно есть связанные документы)");
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.inn?.includes(search)
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.inn?.includes(search)
  );

  const currentList = activeSubTab === "clients" ? filteredClients : filteredSuppliers;

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Управление контрагентами
          </h2>
          <p className="text-xs text-slate-400">
            Справочник покупателей (клиентов) и поставщиков товаров
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role !== "GUEST" && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Добавить {activeSubTab === "clients" ? "покупателя" : "поставщика"}
            </button>
          )}

          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Buyers vs Suppliers */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveSubTab("clients");
            setSearch("");
          }}
          className={`flex items-center gap-2 pb-2.5 transition border-b-2 ${
            activeSubTab === "clients"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Покупатели (Клиенты) ({clients.length})
        </button>

        <button
          onClick={() => {
            setActiveSubTab("suppliers");
            setSearch("");
          }}
          className={`flex items-center gap-2 pb-2.5 transition border-b-2 ${
            activeSubTab === "suppliers"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Truck className="w-4 h-4" />
          Поставщики ({suppliers.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию, телефону или ИНН..."
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* List / Table */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {isLoading ? "Загрузка..." : "Контрагенты не найдены"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                  <th className="p-3">Наименование</th>
                  <th className="p-3">ИНН</th>
                  <th className="p-3">Телефон</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Адрес</th>
                  <th className="p-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {currentList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                          {activeSubTab === "clients" ? <Users className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                        </div>
                        {item.name}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-400">
                      {item.inn || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3 text-slate-300 font-mono">
                      {item.phone || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3 text-slate-400">
                      {item.email || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3 text-slate-400">
                      {item.address || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3 text-right">
                      {role !== "GUEST" && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-sm">
                {editingId
                  ? `Редактирование: ${name}`
                  : `Добавить ${activeSubTab === "clients" ? "покупателя" : "поставщика"}`}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Наименование организации / ФИО *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="например, ООО 'ТехСнаб' или ИП Иванов"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Телефон</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">ИНН</label>
                  <input
                    type="text"
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    placeholder="10 или 12 цифр"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.ru"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Юридический/фактический адрес</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="г. Москва, ул. Складская, д. 10"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-indigo-600/20 transition"
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
