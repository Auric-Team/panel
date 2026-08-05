"use client";

import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, X, CheckCircle, Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
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
  const [mode, setMode] = useState<'add' | 'deduct' | 'set'>('add');
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
  if (mode === 'add') calculatedNewBalance = currentTokens + numAmount;
  else if (mode === 'deduct') calculatedNewBalance = Math.max(0, currentTokens - numAmount);
  else calculatedNewBalance = numAmount;

  const balanceDelta = calculatedNewBalance - currentTokens;

  const presets = [10, 50, 100, 500, 1000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isNaN(numAmount) || numAmount < 0) {
      setErrorMsg('Please enter a valid token amount.');
      return;
    }

    if (mode === 'deduct' && numAmount > currentTokens) {
      setErrorMsg(`Cannot deduct more than the current balance of ${currentTokens} tokens.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateTokens(reseller.id, calculatedNewBalance);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to update token balance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Background ambient light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div
          className={`w-96 h-96 rounded-full blur-[120px] opacity-25 transition-all duration-500 ${
            mode === 'add'
              ? 'bg-emerald-500'
              : mode === 'deduct'
              ? 'bg-rose-500'
              : 'bg-purple-500'
          }`}
        />
      </div>

      <div
        className={`relative w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border shadow-2xl transition-all duration-300 ${
          mode === 'add'
            ? 'border-emerald-500/40 glow-emerald'
            : mode === 'deduct'
            ? 'border-rose-500/40 glow-red'
            : 'border-purple-500/40 glow-purple'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 mb-6">
          <div
            className={`p-3 rounded-2xl border transition-colors ${
              mode === 'add'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : mode === 'deduct'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                : 'bg-purple-500/10 border-purple-500/40 text-purple-400'
            }`}
          >
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Manage Token Balance</h3>
            <p className="text-xs text-slate-400 font-mono">
              Adjust tokens for <span className="text-purple-300 font-bold">{reseller.username}</span>
            </p>
          </div>
        </div>

        {/* Reseller Info & Current Balance Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Current Balance
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-amber-400 font-mono">
                  {currentTokens.toLocaleString()}
                </span>
                <span className="text-xs font-mono text-amber-400/80 uppercase">Tokens</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Reseller Role
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800/80 uppercase font-mono shadow-sm">
                {reseller.role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode Selector Toggle: Add vs Deduct vs Set */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-2 uppercase tracking-wider font-mono">
              Adjustment Action
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
              {/* Add Button */}
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                  mode === 'add'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>

              {/* Deduct Button */}
              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                  mode === 'deduct'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Deduct</span>
              </button>

              {/* Set Exact Button */}
              <button
                type="button"
                onClick={() => setMode('set')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                  mode === 'set'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Set Exact</span>
              </button>
            </div>
          </div>

          {/* Quick Balance Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                Quick Presets
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Click to set</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((val) => {
                const displayLabel = mode === 'add' ? `+${val}` : mode === 'deduct' ? `-${val}` : `${val}`;
                const isSelected = numAmount === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                      isSelected
                        ? mode === 'add'
                          ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500 shadow-glow-emerald scale-105'
                          : mode === 'deduct'
                          ? 'bg-rose-900/60 text-rose-300 border-rose-500 shadow-glow-rose scale-105'
                          : 'bg-purple-900/60 text-purple-300 border-purple-500 shadow-glow-purple scale-105'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wider font-mono">
              Token Amount
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                className={`w-full bg-slate-950 border rounded-2xl px-4 py-3.5 text-white font-mono text-lg outline-none transition-all ${
                  mode === 'add'
                    ? 'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    : mode === 'deduct'
                    ? 'focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                } ${errorMsg ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-700'}`}
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono text-slate-500 uppercase font-bold pt-1 pointer-events-none">
                Tokens
              </span>
            </div>
          </div>

          {/* Live Projected Balance Display */}
          <div
            className={`border rounded-2xl p-4 transition-all duration-200 ${
              mode === 'add'
                ? 'bg-emerald-950/20 border-emerald-800/40'
                : mode === 'deduct'
                ? 'bg-rose-950/20 border-rose-800/40'
                : 'bg-purple-950/20 border-purple-800/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Live Projected Balance
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  balanceDelta > 0
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : balanceDelta < 0
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {balanceDelta > 0 ? `+${balanceDelta} Tokens` : balanceDelta < 0 ? `${balanceDelta} Tokens` : 'No Change'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-slate-400 font-mono text-sm">
                <span>{currentTokens}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className="text-right">
                <span
                  className={`text-xl font-extrabold font-mono transition-colors ${
                    mode === 'add'
                      ? 'text-emerald-400'
                      : mode === 'deduct'
                      ? 'text-rose-400'
                      : 'text-purple-300'
                  }`}
                >
                  {calculatedNewBalance.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-mono ml-1">Tokens</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit & Cancel Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 font-bold py-3 rounded-xl transition shadow-lg text-xs flex items-center justify-center space-x-2 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'add'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-glow-emerald'
                  : mode === 'deduct'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-glow-rose'
                  : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-glow-amber'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {mode === 'add'
                      ? 'Add Tokens'
                      : mode === 'deduct'
                      ? 'Deduct Tokens'
                      : 'Set Balance'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
