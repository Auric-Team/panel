"use client";

import React, { useEffect } from 'react';
import { Trash2, RotateCcw, AlertCircle, Check, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md ref-card p-6 shadow-xl space-y-4 text-center font-sans text-xs relative animate-in zoom-in-95 duration-150">
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 ref-btn-icon w-7 h-7 text-muted hover:text-ink"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Dialog Icon */}
        <div className="ref-dialog-icon">
          {isDanger ? (
            <Trash2 className="w-5 h-5 text-danger" />
          ) : isWarning ? (
            <RotateCcw className="w-5 h-5 text-warning" />
          ) : (
            <AlertCircle className="w-5 h-5 text-accent" />
          )}
        </div>

        <div>
          <h3 className="font-display text-base font-normal text-ink">{title}</h3>
          <p className="text-muted text-xs mt-1.5 leading-relaxed whitespace-pre-line font-sans">
            {description}
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="ref-btn flex-1 py-2 text-xs"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`ref-btn flex-1 py-2 text-xs font-semibold ${
              isDanger
                ? 'ref-btn-danger'
                : 'ref-btn-primary'
            }`}
          >
            {isLoading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
