"use client";

import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, X, Check, AlertCircle, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { UserItem } from '@/types/key';

interface TokenAdjustmentModalProps {
  isOpen: boolean;
  reseller: UserItem | null;
  onClose: () => void;
  onUpdateTokens: (
    userId: string,
    amount: number,
    action: 'add' | 'deduct',
    note?: string
  ) => Promise<void>;
  onSuccessToast?: (msg: string) => void;
}

export const TokenAdjustmentModal: React.FC<TokenAdjustmentModalProps> = ({
  isOpen,
  reseller,
  onClose,
  onUpdateTokens,
  onSuccessToast,
}) => {
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<string>('100');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setMode('add');
      setAmount('100');
      setNote('');
      setErrorMsg(null);
    }
  }, [isOpen, reseller]);

  if (!isOpen || !reseller) return null;

  const currentTokens = reseller.tokens ?? reseller.credits ?? 0;
  const numAmount = Math.max(0, parseInt(amount, 10) || 0);

  let calculatedNewBalance = currentTokens;
  if (mode === 'add') {
    calculatedNewBalance = currentTokens + numAmount;
  } else {
    calculatedNewBalance = Math.max(0, currentTokens - numAmount);
  }

  const balanceDelta = mode === 'add' ? numAmount : -numAmount;
  const presets = [25, 50, 100, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid token quantity (greater than 0).');
      return;
    }

    if (mode === 'deduct' && numAmount > currentTokens) {
      setErrorMsg(`Cannot deduct ${numAmount} tokens. Current balance is only ${currentTokens} tokens.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateTokens(reseller.id, numAmount, mode, note);
      const actionLabel = mode === 'add' ? 'credited to' : 'deducted from';
      if (onSuccessToast) {
        onSuccessToast(`Successfully ${actionLabel} ${reseller.username}: ${mode === 'add' ? '+' : '-'}${numAmount} Tokens`);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to update token balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200 font-mono text-xs">
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-5 backdrop-blur-2xl">
        {/* Decorative Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500/20 to-cyan-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-md shadow-amber-500/10">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>Adjust Reseller Tokens</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Reseller Partner: <strong className="text-cyan-400">@{reseller.username}</strong> ({reseller.role.toUpperCase()})
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

        {/* Current Balance Summary Box */}
        <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-inner">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider mb-0.5">
              Current Token Balance
            </span>
            <div className="flex items-center space-x-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xl font-extrabold text-amber-400">{currentTokens.toLocaleString()}</span>
              <span className="text-slate-400 text-xs">Tokens</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider mb-0.5">
              Reseller ID
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-800">
              #{reseller.id.slice(0, 8)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operation Type Toggle (Credit / Debit) */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5 tracking-wider">
              Operation Type
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-950 border border-slate-800/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 border ${
                  mode === 'add'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Credit Tokens (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 border ${
                  mode === 'deduct'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/20'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Debit Tokens (-)</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5 tracking-wider">
              Quick Presets
            </label>
            <div className="grid grid-cols-5 gap-2">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className={`py-2 rounded-xl border text-center font-bold transition text-xs ${
                    numAmount === val
                      ? mode === 'add'
                        ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                        : 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/20'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {mode === 'add' ? '+' : '-'}{val}
                </button>
              ))}
            </div>
          </div>

          {/* Token Quantity Input */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5 tracking-wider">
              Token Quantity
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl px-4 py-3 text-white font-mono text-sm outline-none transition shadow-inner"
                placeholder="Enter token amount..."
              />
              <Coins className="w-4 h-4 text-slate-500 absolute right-4 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Transaction Note */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5 tracking-wider flex items-center space-x-1">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Transaction Audit Note</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl px-4 py-2.5 text-slate-200 font-mono text-xs outline-none transition placeholder:text-slate-600"
              placeholder="e.g. Monthly quota allocation / Manual admin override"
            />
          </div>

          {/* Real-time Balance Preview Calculation Box */}
          <div className="p-4 bg-slate-950/90 border border-slate-800/90 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Real-time Balance Projection</span>
              <span className={`font-extrabold ${balanceDelta > 0 ? 'text-emerald-400' : balanceDelta < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {balanceDelta > 0 ? `+${balanceDelta}` : balanceDelta} Tokens
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Current</span>
                <span className="text-sm font-bold text-slate-300">{currentTokens.toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                <ArrowRight className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>

              <div className="flex flex-col text-right">
                <span className="text-[10px] text-slate-500">Resulting</span>
                <span className={`text-base font-extrabold ${mode === 'add' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {calculatedNewBalance.toLocaleString()} Tokens
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-center space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold py-3 rounded-2xl border border-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 font-extrabold py-3 rounded-2xl transition flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 ${
                mode === 'add'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing...' : mode === 'add' ? 'Confirm Credit (+)' : 'Confirm Debit (-)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
