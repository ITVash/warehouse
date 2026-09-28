'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, StatusBadge } from '@/components/ui/common';
import { useAuthStore } from '@/store/useStore';
import api from '@/lib/axios';

export default function AuthPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramFirstName, setTelegramFirstName] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser().then((currentUser) => {
      if (currentUser) {
        if (currentUser.role === 'GUEST') {
          // Stay on guest explanation or redirect
        } else {
          router.push('/warehouses');
        }
      }
    });
  }, [fetchUser, router]);

  const handleTelegramAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const generatedId = telegramId.trim() || `tg_${Date.now()}`;
      const res = await api.post('/auth/telegram', {
        id: generatedId,
        username: telegramUsername.trim() || 'telegram_user',
        first_name: telegramFirstName.trim() || 'Пользователь',
        is_demo_login: false,
      });

      if (res.data.success) {
        await fetchUser();
        const role = res.data.data.role;
        if (role === 'GUEST') {
          // guest mode
        } else {
          router.push('/warehouses');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRoleLogin = async (role: 'ADMIN' | 'MANAGER' | 'GUEST') => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.post('/auth/telegram', {
        is_demo_login: true,
        role,
      });
      if (res.data.success) {
        await fetchUser();
        if (role === 'GUEST') {
          // stay or reload
        } else {
          router.push('/warehouses');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📦</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">Складской учёт</h1>
          <p className="text-xs text-slate-400 mt-1">
            ИП Новиков & ООО &quot;ТД &quot;Негоциант&quot;
          </p>
        </div>

        {user && user.role === 'GUEST' && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
            <div className="text-amber-400 font-semibold text-sm mb-1">
              Ожидается подтверждение администратора
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Вы успешно авторизовались с ролью <strong>GUEST</strong>. Администратор системы должен назначить вам роль Менеджера и доступ к складам.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs text-slate-500">Ваш ID: {user.telegramId || user.id}</span>
              <button
                onClick={() => fetchUser()}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Проверить статус
              </button>
            </div>
          </div>
        )}

        {user && user.isBlocked && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
            <div className="text-rose-400 font-semibold text-sm mb-1">Доступ заблокирован</div>
            <p className="text-xs text-slate-400">
              Ваша учетная запись была отключена администратором.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Telegram Auth Form */}
        <form onSubmit={handleTelegramAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Telegram Username (@username)
            </label>
            <input
              type="text"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="например: ivan_sklad"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Имя пользователя
            </label>
            <input
              type="text"
              value={telegramFirstName}
              onChange={(e) => setTelegramFirstName(e.target.value)}
              placeholder="Иван"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Telegram ID (опционально)
            </label>
            <input
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="12345678"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500"
            isLoading={isLoading}
          >
            ✈️ Войти через Telegram
          </Button>
        </form>

        {/* Development Quick Role Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-center text-[11px] text-slate-500 uppercase tracking-wider mb-3">
            Быстрый вход для проверки ролей (RBAC)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickRoleLogin('ADMIN')}
              className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-emerald-400 font-medium transition-colors text-center"
            >
              ADMIN
            </button>
            <button
              onClick={() => handleQuickRoleLogin('MANAGER')}
              className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-blue-400 font-medium transition-colors text-center"
            >
              MANAGER
            </button>
            <button
              onClick={() => handleQuickRoleLogin('GUEST')}
              className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-xs text-slate-400 font-medium transition-colors text-center"
            >
              GUEST
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
