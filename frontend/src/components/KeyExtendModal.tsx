"use client";

import React, { useState, useEffect } from 'react';
import { Clock, Check, X, AlertCircle } from 'lucide-react';
import { KeyItem, UserItem } from '@/types/key';

export interface KeyExtendModalProps {
  isOpen: boolean;
  keyItem: KeyItem | null;
  currentUser: UserItem | null;
  onClose: () => void;
  onExtend: (keyId: string, additionalDays: number, note?: string) => Promise<void>;
  onUpdateNote?: (keyId: string, note: string) => Promise<void>;
}

export const KeyExtendModal: React.FC<KeyExtendModalProps> = ({
  isOpen,
  keyItem,
  currentUser,
  onClose,
  onExtend,
}) => {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [customDaysInput, setCustomDaysInput] = useState<string>('7');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (keyItem) {
      setNoteInput(keyItem.note || '');
      setSelectedDays(7);
      setCustomDaysInput('7');
      setErrorMsg(null);
    }
  }, [keyItem, isOpen]);

  if (!isOpen || !keyItem) return null;

  const isReseller = currentUser?.role === 'reseller';
  const tokenCost = isReseller ? selectedDays * 10 : 0;
  const userTokens = currentUser?.tokens ?? 0;
  const isInsufficient = isReseller && userTokens < tokenCost;

  const presets = [
    { label: '+1 Day', days: 1 },
    { label: '+3 Days', days: 3 },
    { label: '+7 Days', days: 7 },
    { label: '+14 Days', days: 14 },
    { label: '+30 Days', days: 30 },
  ];

  const handlePresetSelect = (days: number) => {
    setSelectedDays(days);
    setCustomDaysInput(String(days));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDaysInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedDays(parsed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedDays <= 0) {
      setErrorMsg('Please select a valid duration to extend.');
      return;
    }

    if (isInsufficient) {
      setErrorMsg(`Insufficient token balance. Required: ${tokenCost} tokens, Available: ${userTokens} tokens.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onExtend(keyItem.id, selectedDays, noteInput);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to extend license key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans text-xs">
      <div className="w-full sm:max-w-md ref-card p-6 shadow-xl space-y-4 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-soft">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-surface border border-border-soft flex items-center justify-center text-accent">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-base font-normal text-ink">Extend Key Duration</h3>
              <p className="text-[11px] text-muted font-mono">
                Key: <strong className="text-ink">{keyItem.key}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ref-btn-icon w-7 h-7 text-muted hover:text-ink"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Info Pill */}
        <div className="p-3 bg-surface border border-border-soft rounded-sm flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-muted uppercase font-sans font-medium block">Current Status</span>
            <span
              className={`font-mono font-bold text-xs ${
                keyItem.status === 'active' ? 'text-success' : 'text-danger'
              }`}
            >
              {keyItem.status.toUpperCase()}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted uppercase font-sans font-medium block">Expires At</span>
            <span className="text-ink font-mono text-[11px]">
              {keyItem.expiresAt ? new Date(keyItem.expiresAt).toLocaleDateString() : 'Lifetime'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1.5">
              Select Additional Duration
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => handlePresetSelect(p.days)}
                  className={`ref-btn py-1.5 px-2 text-center font-mono text-xs transition ${
                    selectedDays === p.days
                      ? 'ref-btn-primary'
                      : ''
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days Input */}
          <div>
            <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1">
              Custom Days
            </label>
            <input
              type="number"
              min="1"
              value={customDaysInput}
              onChange={handleCustomChange}
              className="ref-input w-full font-mono text-xs"
              placeholder="Number of days..."
            />
          </div>

          {/* Customer Note */}
          <div>
            <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1">
              Customer Note / Metadata (Optional)
            </label>
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="ref-input w-full font-sans text-xs"
              placeholder="e.g. VIP Discord @CustomerName"
            />
          </div>

          {/* Token Cost Summary */}
          {isReseller && (
            <div className="p-3 bg-surface border border-border-soft rounded-sm flex items-center justify-between text-xs font-mono">
              <span className="text-muted font-sans">Extension Token Cost:</span>
              <span className={`font-bold ${isInsufficient ? 'text-danger' : 'text-warning'}`}>
                {tokenCost} Tokens
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/25 rounded-sm text-danger text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-border-soft">
            <button
              type="button"
              onClick={onClose}
              className="ref-btn flex-1 py-2 text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isInsufficient}
              className="ref-btn ref-btn-primary flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Extending...' : `Extend +${selectedDays} Days`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
