"use client";

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Check, X, Coins, Sparkles, FileText, AlertCircle } from 'lucide-react';
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
  onUpdateNote,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 font-sans text-xs">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Extend Key Duration</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Key: <strong className="text-cyan-300">{keyItem.key}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Info Pill */}
        <div className="p-3 bg-slate-950 border border-slate-800/90 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Current Status</span>
            <span
              className={`font-mono font-bold ${
                keyItem.status === 'active' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {keyItem.status.toUpperCase()}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Expires At</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {keyItem.expiresAt ? new Date(keyItem.expiresAt).toLocaleDateString() : 'Lifetime'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
              Select Additional Duration
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => handlePresetSelect(p.days)}
                  className={`py-2 px-2 rounded-xl border text-center font-mono text-xs font-semibold transition ${
                    selectedDays === p.days
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days Input */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Custom Days
            </label>
            <input
              type="number"
              min="1"
              value={customDaysInput}
              onChange={handleCustomChange}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none transition"
              placeholder="Number of days..."
            />
          </div>

          {/* Customer Note */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Customer Note / Metadata (Optional)
            </label>
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none transition"
              placeholder="e.g. VIP Discord @CustomerName"
            />
          </div>

          {/* Token Cost Summary */}
          {isReseller && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Extension Token Cost:</span>
              <span className={`font-bold ${isInsufficient ? 'text-rose-400' : 'text-amber-400'}`}>
                {tokenCost} Tokens
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isInsufficient}
              className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-lg shadow-cyan-600/20"
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
