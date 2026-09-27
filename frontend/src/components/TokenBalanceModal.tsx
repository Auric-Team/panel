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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="ref-card relative w-full max-w-md p-6 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-soft">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-accent/10 text-accent flex items-center justify-center border border-border-soft shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-normal text-ink">Adjust Token Balance</h3>
              <p className="text-xs text-muted">
                Reseller: <span className="font-medium text-ink">@{targetReseller.username}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ref-btn-icon text-muted hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Balance Summary */}
        <div className="ref-card-subtle p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted uppercase font-semibold tracking-wider block">Current Balance</span>
            <span className="font-display text-lg font-normal text-ink">{currentTokens.toLocaleString()} <span className="text-xs font-sans font-normal text-muted">Tokens</span></span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted uppercase font-semibold tracking-wider block">Role</span>
            <span className="ref-badge uppercase">
              {targetReseller.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Toggle */}
          <div>
            <label className="text-xs font-medium text-ink block mb-1.5">
              Operation Mode
            </label>
            <div className="ref-tab-list grid grid-cols-2 p-1">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`ref-tab-btn flex items-center justify-center space-x-1.5 py-1.5 ${
                  mode === 'add' ? 'active' : ''
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Credit Tokens (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`ref-tab-btn flex items-center justify-center space-x-1.5 py-1.5 ${
                  mode === 'deduct' ? 'active' : ''
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Debit Tokens (-)</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-medium text-ink block mb-1.5">
              Quick Presets
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className={`py-1.5 rounded-md text-xs font-medium font-mono border transition text-center ${
                    numAmount === val
                      ? 'bg-accent text-accent-ink border-accent'
                      : 'bg-surface border-border-soft text-ink hover:bg-surface-hover'
                  }`}
                >
                  {mode === 'add' ? '+' : '-'}{val}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="text-xs font-medium text-ink block mb-1.5">
              Token Quantity
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="ref-input w-full font-mono text-xs"
              placeholder="Token count..."
            />
          </div>

          {/* Projection Bar */}
          <div className="ref-card-subtle p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Projected Balance</span>
              <span className={`font-mono font-semibold ${balanceDelta > 0 ? 'text-success' : balanceDelta < 0 ? 'text-danger' : 'text-muted'}`}>
                {balanceDelta > 0 ? `+${balanceDelta}` : balanceDelta} Tokens
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-muted text-xs">{currentTokens.toLocaleString()}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted" />
              <span className={`font-display text-base font-normal ${mode === 'add' ? 'text-success' : 'text-danger'}`}>
                {calculatedNewBalance.toLocaleString()} <span className="font-sans text-xs font-normal text-muted">Tokens</span>
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/25 rounded-md text-danger text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="ref-btn ref-btn-ghost flex-1 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`ref-btn flex-1 py-2 flex items-center justify-center space-x-1.5 disabled:opacity-50 ${
                mode === 'add' ? 'ref-btn-primary' : 'ref-btn-danger'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : mode === 'add' ? 'Credit Tokens' : 'Debit Tokens'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
