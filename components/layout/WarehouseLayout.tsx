'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useWarehouseStore } from '@/store/useStore';
import { StatusBadge } from '@/components/ui/common';
import api from '@/lib/axios';

export function WarehouseLayout({
  warehouseId,
  children,
}: {
  warehouseId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, fetchUser, logout } = useAuthStore();
  const { currentWarehouse, setCurrentWarehouse, warehouses, fetchWarehouses } = useWarehouseStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchWarehouses();

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log('SW registration error:', err));
    }
  }, [fetchUser, fetchWarehouses]);

  useEffect(() => {
    if (warehouses.length > 0) {
      const match = warehouses.find((w) => w.id === warehouseId);
      if (match) {
        setCurrentWarehouse(match);
      }
    }
  }, [warehouses, warehouseId, setCurrentWarehouse]);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/push');
      if (res.data.success) {
        setNotifications(res.data.data || []);
        const unread = (res.data.data || []).filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post('/push', { markAllAsRead: true });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const navLinks = [
    { href: `/warehouse/${warehouseId}/orders`, label: 'Счета покупателей', icon: '📄' },
    { href: `/warehouse/${warehouseId}/nomenclature`, label: 'Номенклатура', icon: '📦' },
    { href: `/warehouse/${warehouseId}/stock`, label: 'Остатки', icon: '📊' },
    { href: `/warehouse/${warehouseId}/coming`, label: 'Приходы от поставщиков', icon: '📥' },
    { href: `/warehouse/${warehouseId}/reports`, label: 'Отчеты', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/warehouses"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              <span>←</span>
              <span className="hidden sm:inline">Склады</span>
            </Link>

            <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>

            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {currentWarehouse?.name || 'Загрузка склада...'}
              </span>
              <span className="text-xs text-slate-400">
                Складской учёт
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) markAllRead();
                }}
                className="relative p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <span>🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Уведомления</span>
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Прочитать все
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">Нет новых уведомлений</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-slate-800/40 transition-colors">
                          <p className="text-xs font-medium text-slate-200">{n.title}</p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Users Link if Admin */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin/users"
                className="text-xs px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
              >
                Управление доступом
              </Link>
            )}

            {/* User Info & Logout */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-slate-200">
                  {user?.firstName || user?.username || 'Пользователь'}
                </div>
                <StatusBadge status={user?.role || 'GUEST'} />
              </div>
              <button
                onClick={logout}
                title="Выйти"
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors text-xs"
              >
                Выход
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-slate-400 hover:text-white"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden sm:flex space-x-1 border-t border-slate-800/80">
          {navLinks.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`py-3 px-3.5 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  isActive
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden px-4 py-2 border-t border-slate-800 bg-slate-900 space-y-1">
            {navLinks.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${
                    isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin/users"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm rounded-lg text-slate-300 hover:bg-slate-800"
              >
                ⚙️ Управление доступом
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
