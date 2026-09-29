"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/src/lib/axios";
import { useAuthStore } from "@/src/stores/auth.store";
import { useUiStore } from "@/src/stores/ui.store";
import { User, Role } from "@/src/types";
import {
  Users,
  Shield,
  ShieldAlert,
  UserCheck,
  Send,
  RefreshCw,
  Search,
  CheckCircle2,
} from "lucide-react";

export const UsersTab: React.FC = () => {
  const { user: currentUser, role: currentRole } = useAuthStore();
  const { addToast } = useUiStore();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: User[] }>("/users");
      setUsers(res.data.data || []);
    } catch {
      addToast("error", "Не удалось загрузить список пользователей");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdatingUserId(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      addToast("success", `Роль пользователя успешно изменена на ${newRole}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка при смене роли";
      addToast("error", msg);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      u.telegramId.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Управление пользователями и правами (RBAC)
          </h2>
          <p className="text-xs text-slate-400">
            Только Администратор может назначать роли <span className="text-indigo-400">ADMIN</span>,{" "}
            <span className="text-emerald-400">MANAGER</span> или отзывать доступ до{" "}
            <span className="text-amber-400">GUEST</span>.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          Обновить
        </button>
      </div>

      {/* Info card */}
      <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3 text-xs">
        <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-slate-300 leading-relaxed">
          Все новые сотрудники, авторизующиеся через Telegram бота, первоначально получают статус{" "}
          <strong className="text-amber-300">GUEST</strong> и не могут просматривать остатки или создавать документы до тех пор, пока Администратор не повысит их до{" "}
          <strong className="text-emerald-300">MANAGER</strong> или{" "}
          <strong className="text-indigo-300">ADMIN</strong>.
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по Telegram ID, имени или @юзернейму..."
          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {isLoading ? "Загрузка пользователей..." : "Пользователи не найдены"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                  <th className="p-3">Сотрудник / Telegram</th>
                  <th className="p-3">Telegram ID</th>
                  <th className="p-3">Текущая роль</th>
                  <th className="p-3">Дата регистрации</th>
                  <th className="p-3 text-right">Назначить роль</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0">
                            {u.firstName?.[0] || u.username?.[0] || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {u.firstName} {u.lastName}
                              {isSelf && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-normal">
                                  Вы
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {u.username ? `@${u.username}` : "без @юзернейма"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-slate-400">{u.telegramId}</td>

                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.role === "ADMIN"
                              ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                              : u.role === "MANAGER"
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                              : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                          }`}
                        >
                          {u.role === "ADMIN" ? (
                            <Shield className="w-3 h-3 text-indigo-400" />
                          ) : u.role === "MANAGER" ? (
                            <UserCheck className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                          )}
                          {u.role}
                        </span>
                      </td>

                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                      </td>

                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          {(["ADMIN", "MANAGER", "GUEST"] as Role[]).map((r) => (
                            <button
                              key={r}
                              disabled={updatingUserId === u.id || (isSelf && r !== "ADMIN")}
                              onClick={() => handleRoleChange(u.id, r)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                                u.role === r
                                  ? r === "ADMIN"
                                    ? "bg-indigo-600 text-white font-bold"
                                    : r === "MANAGER"
                                    ? "bg-emerald-600 text-white font-bold"
                                    : "bg-amber-600 text-white font-bold"
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
