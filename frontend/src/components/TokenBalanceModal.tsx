"use client";

import React, { useState } from 'react';
import { Coins, Plus, Minus, X, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';
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

  if (!isOpen || !reseller) return null;

  const currentTokens = reseller.tokens ?? 0;
  const numAmount = parseInt(amount, 10) || 0;

  let calculatedNewBalance = currentTokens;
  if (mode === 'add') calculatedNewBalance = currentTokens + numAmount;
  else if (mode === 'deduct') calculatedNewBalance = Math.max(0, currentTokens - numAmount);
  else calculatedNewBalance = Math.max(0, numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onUpdateTokens(reseller.id, calculatedNewBalance);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-card rounded-3xl p-6 border border-purple-500/40 shadow-2xl glow-purple">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-2xl text-amber-400">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Manage Tokens</h3>
            <p className="text-xs text-slate-400 font-mono">
              Adjust balance for <span className="text-purple-300 font-bold">{reseller.username}</span>
            </p>
          </div>
        </div>

        {/* Current Balance Display */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Current Balance</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono">{currentTokens} Tokens</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Role</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800/60 uppercase">
              {reseller.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Action Selector: Add / Deduct / Set */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">
              Adjustment Action
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 ${
                  mode === 'add'
                    ? 'bg-emerald-600 text-white shadow-glow-emerald'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 ${
                  mode === 'deduct'
                    ? 'bg-rose-600 text-white shadow-glow-rose'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Deduct</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('set')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 ${
                  mode === 'set'
                    ? 'bg-purple-600 text-white shadow-glow-purple'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Set Exact</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2 uppercase tracking-wider">
              Quick Amount Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {[10, 50, 100, 250, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-purple-950/60 border border-slate-700/80 rounded-xl text-xs font-mono text-purple-300 hover:border-purple-500 transition"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1 uppercase tracking-wider">
              Token Amount
            </label>
            <input
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
            />
          </div>

          {/* Projected Balance preview */}
          <div className="bg-purple-950/40 border border-purple-800/40 rounded-2xl p-3.5 flex items-center justify-between text-xs font-mono">
            <span className="text-purple-300 font-semibold">New Balance After Update:</span>
            <span className="text-amber-300 font-extrabold text-base">{calculatedNewBalance} Tokens</span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
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
              className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold py-3 rounded-xl transition shadow-glow-amber text-xs flex items-center justify-center space-x-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Confirm Token Balance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
