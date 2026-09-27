"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

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
      {/* Stacked Floating Notification Container */}
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
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-md ref-card shadow-lg transition-all duration-200 transform translate-y-0 text-xs font-sans animate-in fade-in slide-in-from-bottom-2"
            >
              {/* Circular Status Icon */}
              <div
                className={`ref-status-icon ${
                  isSuccess
                    ? 'success'
                    : isError
                    ? 'error'
                    : isWarning
                    ? 'warning'
                    : 'info'
                }`}
              >
                {isSuccess && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                {isError && <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />}
                {isWarning && <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />}
                {isInfo && <Info className="w-3.5 h-3.5 stroke-[2.5]" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title ? (
                  <div className="font-semibold text-ink text-xs mb-0.5">{t.title}</div>
                ) : (
                  <div className="font-semibold text-ink text-xs mb-0.5 capitalize">{t.type}</div>
                )}
                <div className="text-muted break-words leading-relaxed text-[11px] font-sans">{t.message}</div>

                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      removeToast(t.id);
                    }}
                    className="mt-1.5 text-[10px] font-semibold text-accent hover:underline uppercase tracking-wider"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-muted hover:text-ink rounded-sm hover:bg-surface transition"
                aria-label="Dismiss notification"
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
