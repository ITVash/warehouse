"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/src/stores/auth.store";
import { useUiStore } from "@/src/stores/ui.store";
import { Send, Shield, UserCheck, Eye, LogIn, Sparkles, Building2 } from "lucide-react";
import { Role } from "@/src/types";

export const TelegramLoginView: React.FC = () => {
  const { loginTelegram, devSwitchRole } = useAuthStore();
  const { addToast } = useUiStore();
  const [manualTgId, setManualTgId] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Negostore_bot";

  const handleDevLogin = async (role: Role) => {
    setIsSubmitting(true);
    try {
      const user = await devSwitchRole(role);
      addToast("success", `Вы вошли как ${user.firstName} (${role})`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Ошибка входа");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualTelegramLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTgId.trim()) return;

    setIsSubmitting(true);
    try {
      const user = await loginTelegram({
        telegramId: manualTgId.trim(),
        username: manualUsername.trim() || undefined,
        firstName: manualUsername.trim() || `User_${manualTgId.trim().slice(-4)}`,
      });
      addToast("success", `Вход выполнен: ${user.firstName} (роль: ${user.role})`);
    } catch (err: unknown) {
      addToast("error", (err as Error)?.message || "Ошибка авторизации");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">NegoStore</h1>
          <p className="text-xs text-slate-400 mt-1">Система складского учёта предприятий</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
            <h2 className="text-sm font-semibold text-slate-200 mb-1">Авторизация через Telegram</h2>
            <p className="text-xs text-slate-400 mb-4">
              Бот: <span className="font-mono text-sky-400">@{botUsername}</span>
            </p>

            <button
              onClick={() => handleDevLogin("ADMIN")}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1E8EC4] text-white font-medium text-sm shadow-md transition disabled:opacity-50"
            >
              <Send className="w-4 h-4 fill-white" />
              Войти через Telegram
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Быстрый вход для проверки ролей:</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDevLogin("ADMIN")}
                disabled={isSubmitting}
                className="flex flex-col items-center p-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs transition"
              >
                <Shield className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="font-semibold">Админ</span>
                <span className="text-[10px] text-emerald-400/70">Полный доступ</span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin("MANAGER")}
                disabled={isSubmitting}
                className="flex flex-col items-center p-2.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 text-xs transition"
              >
                <UserCheck className="w-4 h-4 mb-1 text-blue-400" />
                <span className="font-semibold">Менеджер</span>
                <span className="text-[10px] text-blue-400/70">Работа склада</span>
              </button>

              <button
                type="button"
                onClick={() => handleDevLogin("GUEST")}
                disabled={isSubmitting}
                className="flex flex-col items-center p-2.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs transition"
              >
                <Eye className="w-4 h-4 mb-1 text-neutral-400" />
                <span className="font-semibold">Гость</span>
                <span className="text-[10px] text-neutral-400">Ожидание прав</span>
              </button>
            </div>
          </div>

          <details className="text-xs text-slate-400 group">
            <summary className="cursor-pointer hover:text-slate-200 select-none flex items-center justify-between py-1">
              <span>Ввести произвольный Telegram ID</span>
              <span className="text-slate-500 group-open:rotate-180 transition">▼</span>
            </summary>
            <form onSubmit={handleManualTelegramLogin} className="mt-2 space-y-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Telegram ID (например: 123456789)"
                value={manualTgId}
                onChange={(e) => setManualTgId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <input
                type="text"
                placeholder="Имя или @username (опционально)"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!manualTgId.trim() || isSubmitting}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                Авторизовать
              </button>
            </form>
          </details>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          Склады: ИП Новиков · ООО "ТД "Негоциант"
        </div>
      </div>
    </div>
  );
};
