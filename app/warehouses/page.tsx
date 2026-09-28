'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useWarehouseStore } from '@/store/useStore';
import { Button, StatusBadge } from '@/components/ui/common';
import Link from 'next/link';

export default function WarehousesPage() {
  const router = useRouter();
  const { user, fetchUser, logout, isLoading: authLoading } = useAuthStore();
  const { warehouses, fetchWarehouses, setCurrentWarehouse, isLoading: whLoading } = useWarehouseStore();
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    fetchUser().then((currentUser) => {
      setInitDone(true);
      if (!currentUser) {
        router.push('/auth');
      } else if (currentUser.role === 'GUEST') {
        router.push('/auth');
      } else {
        fetchWarehouses();
      }
    });
  }, [fetchUser, fetchWarehouses, router]);

  const handleSelectWarehouse = (wh: any) => {
    setCurrentWarehouse(wh);
    router.push(`/warehouse/${wh.id}/orders`);
  };

  if (!initDone || authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-sm text-slate-400">Проверка сессии...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏢</span>
            <div>
              <h1 className="text-sm font-semibold text-white">Выбор склада</h1>
              <p className="text-xs text-slate-400">Выберите контекст работы</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin/users"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Управление пользователями
              </Link>
            )}

            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200">
                {user?.firstName || user?.username || 'Пользователь'}
              </div>
              <StatusBadge status={user?.role || 'GUEST'} />
            </div>

            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 flex-1">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white tracking-tight">Доступные склады</h2>
          <p className="text-sm text-slate-400 mt-1">
            Каждый склад содержит изолированную номенклатуру, счета, приходы и остатки.
          </p>
        </div>

        {whLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-44 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
            <div className="h-44 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-sm text-slate-400">Вам не назначен ни один склад.</p>
            <p className="text-xs text-slate-500 mt-1">Обратитесь к администратору для предоставления прав.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {warehouses.map((wh: any) => (
              <div
                key={wh.id}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-6 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-blue-500/5"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
                      📦
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {wh.code || 'SKLAD'}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {wh.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                    {wh.description || wh.address || 'Рабочий склад компании'}
                  </p>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                    <div>
                      Товаров: <span className="text-white font-medium">{wh._count?.products ?? 0}</span>
                    </div>
                    <div>
                      Счетов: <span className="text-white font-medium">{wh._count?.orders ?? 0}</span>
                    </div>
                    <div>
                      Приходов: <span className="text-white font-medium">{wh._count?.comings ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleSelectWarehouse(wh)}
                  >
                    Открыть склад →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
