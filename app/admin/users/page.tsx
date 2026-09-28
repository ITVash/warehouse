'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Dialog, StatusBadge } from '@/components/ui/common';
import { useAuthStore } from '@/store/useStore';
import api from '@/lib/axios';

export default function AdminUsersPage() {
  const { user, fetchUser } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState('GUEST');
  const [isBlocked, setIsBlocked] = useState(false);
  const [assignedWarehouseIds, setAssignedWarehouseIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [uRes, wRes] = await Promise.all([
        api.get('/users'),
        api.get('/warehouses'),
      ]);
      if (uRes.data.success) setUsers(uRes.data.data);
      if (wRes.data.success) setWarehouses(wRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setSelectedRole(u.role);
    setIsBlocked(u.isBlocked);
    setAssignedWarehouseIds(u.warehouses.map((w: any) => w.id));
  };

  const handleWarehouseToggle = (wId: string) => {
    setAssignedWarehouseIds((prev) =>
      prev.includes(wId) ? prev.filter((id) => id !== wId) : [...prev, wId]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsSaving(true);
      const res = await api.patch('/users', {
        userId: editingUser.id,
        role: selectedRole,
        isBlocked,
        warehouseIds: assignedWarehouseIds,
      });

      if (res.data.success) {
        setEditingUser(null);
        loadData();
      }
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/warehouses"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-slate-800"
            >
              ← Склады
            </Link>
            <div className="h-4 w-px bg-slate-800"></div>
            <div>
              <h1 className="text-sm font-semibold text-white">Управление пользователями</h1>
              <p className="text-xs text-slate-400">Роли, доступы к складам и блокировки (RBAC)</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-300 mr-2">{user?.firstName || user?.username}</span>
            <StatusBadge status={user?.role || 'ADMIN'} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Загрузка пользователей...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                  <tr>
                    <th className="py-3 px-4">Имя / Username</th>
                    <th className="py-3 px-4">Telegram ID</th>
                    <th className="py-3 px-4">Роль</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4">Доступные склады</th>
                    <th className="py-3 px-4">Дата регистрации</th>
                    <th className="py-3 px-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">
                          {u.firstName} {u.lastName || ''}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          @{u.username || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{u.telegramId || '—'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={u.role} />
                      </td>
                      <td className="py-3 px-4">
                        <span className={u.isBlocked ? 'text-rose-400 font-medium' : 'text-emerald-400'}>
                          {u.isBlocked ? 'Заблокирован' : 'Активен'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'ADMIN' ? (
                          <span className="text-emerald-400 font-medium">Все склады (ADMIN)</span>
                        ) : u.warehouses?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.warehouses.map((w: any) => (
                              <span
                                key={w.id}
                                className="text-[11px] text-slate-300"
                              >
                                {w.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">Нет доступа к складам</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(u)}
                        >
                          Изменить права
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit User Rights Modal */}
      <Dialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Права пользователя: ${editingUser.firstName || editingUser.username}` : ''}
      >
        {editingUser && (
          <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Системная роль</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="GUEST">GUEST — Доступ заблокирован до подтверждения</option>
                <option value="MANAGER">MANAGER — Работа со складами, счетами, остатками</option>
                <option value="ADMIN">ADMIN — Полный неограниченный доступ</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="blockToggle"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500"
              />
              <label htmlFor="blockToggle" className="text-slate-300 cursor-pointer">
                Заблокировать пользователя (отключить вход)
              </label>
            </div>

            {selectedRole !== 'ADMIN' && (
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-slate-400 font-medium mb-2">
                  Разрешенные склады для Менеджера:
                </label>
                <div className="space-y-2">
                  {warehouses.map((wh) => (
                    <label
                      key={wh.id}
                      className="flex items-center gap-2 p-2 bg-slate-950/60 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-950"
                    >
                      <input
                        type="checkbox"
                        checked={assignedWarehouseIds.includes(wh.id)}
                        onChange={() => handleWarehouseToggle(wh.id)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-slate-200 font-medium">{wh.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Отмена
              </Button>
              <Button type="submit" variant="primary" isLoading={isSaving}>
                Сохранить изменения
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
