"use client";

import React from "react";
import { useAuthStore } from "@/src/stores/auth.store";
import { Clock, LogOut, ShieldAlert, RefreshCw } from "lucide-react";

export const GuestNoticeView: React.FC = () => {
  const { user, logout, checkAuth, devSwitchRole } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">Ожидается назначение прав администратора</h1>
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Ваш профиль Telegram успешно зарегистрирован в системе NegoStore. Для доступа к складам и номенклатуре обратитесь к администратору предприятия.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-left mb-6 space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Пользователь:</span>
            <span className="text-slate-200 font-medium">{user?.firstName || user?.username || "Гость"}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Telegram ID:</span>
            <span className="font-mono text-slate-200">{user?.telegramId}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Текущий статус:</span>
            <span className="text-amber-400 font-semibold">GUEST (Без доступа к данным)</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => checkAuth()}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Проверить статус назначения
          </button>

          <button
            onClick={() => devSwitchRole("ADMIN")}
            className="w-full py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-medium border border-emerald-500/30 transition flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            [Тест] Назначить права Администратора
          </button>

          <button
            onClick={() => logout()}
            className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-xs transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Выйти из системы
          </button>
        </div>
      </div>
    </div>
  );
};
