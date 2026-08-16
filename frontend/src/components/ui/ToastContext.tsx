"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, options?: { title?: string; duration?: number; action?: ToastAction }) => string;
    error: (message: string, options?: { title?: string; duration?: number; action?: ToastAction }) => string;
    warning: (message: string, options?: { title?: string; duration?: number; action?: ToastAction }) => string;
    info: (message: string, options?: { title?: string; duration?: number; action?: ToastAction }) => string;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000, action }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration, action };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, opts?: { title?: string; duration?: number; action?: ToastAction }) =>
      addToast({ type: 'success', message, title: opts?.title, duration: opts?.duration, action: opts?.action }),
    error: (message: string, opts?: { title?: string; duration?: number; action?: ToastAction }) =>
      addToast({ type: 'error', message, title: opts?.title, duration: opts?.duration, action: opts?.action }),
    warning: (message: string, opts?: { title?: string; duration?: number; action?: ToastAction }) =>
      addToast({ type: 'warning', message, title: opts?.title, duration: opts?.duration, action: opts?.action }),
    info: (message: string, opts?: { title?: string; duration?: number; action?: ToastAction }) =>
      addToast({ type: 'info', message, title: opts?.title, duration: opts?.duration, action: opts?.action }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      {/* Stacked Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0 text-xs font-sans animate-in fade-in slide-in-from-bottom-2 ${
                isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                  : isError
                  ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-[0_4px_20px_rgba(244,63,94,0.15)]'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-900/95 border-cyan-500/40 text-slate-100 shadow-[0_4px_20px_rgba(6,182,212,0.15)]'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {isInfo && <Info className="w-4 h-4 text-cyan-400" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title && <div className="font-semibold text-white text-xs mb-0.5">{t.title}</div>}
                <div className="text-slate-300 break-words leading-relaxed text-[11px] font-mono">{t.message}</div>

                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      removeToast(t.id);
                    }}
                    className="mt-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
