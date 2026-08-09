"use client";

import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, X, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { UserItem } from '@/types/key';

interface TokenBalanceModalProps {
  isOpen: boolean;
  reseller?: UserItem | null;
  user?: UserItem | null;
  onClose: () => void;
  onUpdateTokens: (userId: string, amount: number, action: 'add' | 'deduct', note?: string) => Promise<void>;
}

export const TokenBalanceModal: React.FC<TokenBalanceModalProps> = ({
  isOpen,
  reseller: resellerProp,
  user: userProp,
  onClose,
  onUpdateTokens,
}) => {
  const reseller = resellerProp || userProp || null;
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<string>('50');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetReseller = reseller;

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
      setAmount('50');
      setErrorMsg(null);
    }
  }, [isOpen, targetReseller]);

  if (!isOpen || !targetReseller) return null;

  const currentTokens = targetReseller.tokens ?? 0;
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
      await onUpdateTokens(targetReseller.id, numAmount, mode);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to update token balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-150 font-mono text-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Adjust Token Balance</h3>
              <p className="text-[11px] text-slate-400">
                Reseller: <strong className="text-slate-200">{targetReseller.username}</strong>
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

        {/* Current Balance Summary */}
        <div className="p-3.5 bg-slate-950 border border-slate-800/90 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Current Balance</span>
            <span className="text-lg font-bold text-amber-400">{currentTokens.toLocaleString()} Tokens</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Role</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] uppercase font-semibold border border-slate-700">
              {targetReseller.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Toggle */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Action Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-2 rounded-xl font-semibold transition flex items-center justify-center space-x-1 border ${
                  mode === 'add'
                    ? 'bg-slate-800 text-emerald-400 border-slate-700'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tokens</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`py-2 rounded-xl font-semibold transition flex items-center justify-center space-x-1 border ${
                  mode === 'deduct'
                    ? 'bg-slate-800 text-rose-400 border-slate-700'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Deduct Tokens</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className={`py-2 rounded-xl border text-center font-semibold transition ${
                    numAmount === val
                      ? mode === 'add'
                        ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                        : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {mode === 'add' ? '+' : '-'}{val}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Amount
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none transition"
              placeholder="Token count..."
            />
          </div>

          {/* Projection Bar */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
              <span>Projected Balance</span>
              <span className={balanceDelta > 0 ? 'text-emerald-400' : balanceDelta < 0 ? 'text-rose-400' : 'text-slate-400'}>
                {balanceDelta > 0 ? `+${balanceDelta}` : balanceDelta} Tokens
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">{currentTokens}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className={`text-base font-bold ${mode === 'add' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {calculatedNewBalance.toLocaleString()} Tokens
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl border border-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 font-bold py-2.5 rounded-xl transition flex items-center justify-center space-x-1 disabled:opacity-50 ${
                mode === 'add'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : mode === 'add' ? 'Add Tokens' : 'Deduct Tokens'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
