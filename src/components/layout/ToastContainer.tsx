"use client";

import React from "react";
import { useUiStore } from "@/src/stores/ui.store";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border text-xs shadow-xl animate-in slide-in-from-bottom-2 duration-200 ${
              isSuccess
                ? "bg-emerald-950/90 border-emerald-800 text-emerald-200"
                : isError
                ? "bg-rose-950/90 border-rose-800 text-rose-200"
                : "bg-neutral-900/90 border-neutral-700 text-neutral-200"
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {isError && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {!isSuccess && !isError && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
