"use client";

import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, X, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { UserItem } from '@/types/key';

interface TokenBalanceModalProps {
  isOpen: boolean;
  reseller: UserItem | null;
  onClose: () => void;
  onUpdateTokens: (userId: string, newTokenBalance: number) => Promise<void>;
}

export const TokenBalanceModal: React.FC<TokenBalanceModalProps> = ({
  isOpen,
  reseller,
  onClose,
  onUpdateTokens,
}) => {
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<string>('50');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('add');
      setAmount('50');
      setErrorMsg(null);
    }
  }, [isOpen, reseller]);

  if (!isOpen || !reseller) return null;

  const currentTokens = reseller.tokens ?? 0;
  const numAmount = Math.max(0, parseInt(amount, 10) || 0);

  let calculatedNewBalance = currentTokens;
  if (mode === 'add') {
    calculatedNewBalance = currentTokens + numAmount;
  } else {
    calculatedNewBalance = Math.max(0, currentTokens - numAmount);
  }

  const balanceDelta = calculatedNewBalance - currentTokens;

  const presets = [10, 50, 100, 500];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid token amount.');
      return;
    }

    if (mode === 'deduct' && numAmount > currentTokens) {
      setErrorMsg(`Cannot deduct more than current balance of ${currentTokens} tokens.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateTokens(reseller.id, calculatedNewBalance);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to update token balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Adjust Token Balance</h3>
              <p className="text-xs text-zinc-400 font-mono">
                Reseller: <span className="text-zinc-200 font-medium">{reseller.username}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-900 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Balance Summary Card */}
        <div className="mt-4 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between font-mono text-xs">
          <div>
            <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Current Balance</span>
            <span className="text-lg font-bold text-amber-400">{currentTokens.toLocaleString()} <span className="text-xs font-normal text-zinc-400">Tokens</span></span>
          </div>

          <div className="text-right">
            <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Role</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-700/60">
              {reseller.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 font-mono text-xs">
          {/* Mode Toggle: Add Tokens vs Deduct Tokens */}
          <div>
            <label className="text-zinc-400 text-[11px] uppercase font-semibold block mb-2">
              Action Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-1.5 border ${
                  mode === 'add'
                    ? 'bg-zinc-800 text-emerald-400 border-zinc-700 shadow-sm'
                    : 'text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tokens</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-1.5 border ${
                  mode === 'deduct'
                    ? 'bg-zinc-800 text-rose-400 border-zinc-700 shadow-sm'
                    : 'text-zinc-400 border-transparent hover:text-zinc-200'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Deduct Tokens</span>
              </button>
            </div>
          </div>

          {/* Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-400 text-[11px] uppercase font-semibold">
                Quick Presets
              </label>
              <span className="text-[10px] text-zinc-500">Select amount</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((val) => {
                const isSelected = numAmount === val;
                const prefix = mode === 'add' ? '+' : '-';
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`py-1.5 rounded-lg border text-center transition-colors font-semibold ${
                      isSelected
                        ? mode === 'add'
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
                    }`}
                  >
                    {prefix}{val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="text-zinc-400 text-[11px] uppercase font-semibold block mb-1.5">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter token count..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl px-3.5 py-2.5 text-zinc-100 outline-none transition font-mono text-sm"
              />
              <span className="absolute right-3.5 top-2.5 text-zinc-500 text-xs font-semibold pointer-events-none">
                Tokens
              </span>
            </div>
          </div>

          {/* Live Calculation Summary */}
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold uppercase">
              <span>Projected Balance</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  balanceDelta > 0
                    ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-800/40'
                    : balanceDelta < 0
                    ? 'text-rose-400 bg-rose-950/50 border border-rose-800/40'
                    : 'text-zinc-400 bg-zinc-800'
                }`}
              >
                {balanceDelta > 0 ? `+${balanceDelta}` : balanceDelta < 0 ? `${balanceDelta}` : '0'} Tokens
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-zinc-400">{currentTokens}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              <span
                className={`text-base font-bold ${
                  mode === 'add' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {calculatedNewBalance.toLocaleString()} <span className="text-xs font-normal text-zinc-400">Tokens</span>
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold py-2.5 rounded-xl border border-zinc-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 font-semibold py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 disabled:opacity-50 ${
                mode === 'add'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{mode === 'add' ? 'Add Tokens' : 'Deduct Tokens'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
