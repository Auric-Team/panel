"use client";

import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, X, Check, AlertCircle, ArrowRight, FileText } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="ref-card relative w-full max-w-lg p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-soft">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-md bg-accent/10 text-accent flex items-center justify-center border border-border-soft shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-normal text-ink leading-tight">
                Adjust Reseller Tokens
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Reseller Partner: <span className="font-medium text-ink">@{reseller.username}</span> ({reseller.role.toUpperCase()})
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

        {/* Current Balance Summary Box */}
        <div className="ref-card-subtle p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted uppercase font-semibold block tracking-wider mb-0.5">
              Current Token Balance
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-display text-2xl font-normal text-ink">{currentTokens.toLocaleString()}</span>
              <span className="text-muted text-xs">Tokens</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted uppercase font-semibold block tracking-wider mb-0.5">
              Reseller ID
            </span>
            <span className="ref-badge font-mono text-[10px]">
              #{reseller.id.slice(0, 8)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operation Type Toggle (Credit / Debit) */}
          <div>
            <label className="text-xs font-medium text-ink block mb-1.5">
              Operation Type
            </label>
            <div className="ref-tab-list grid grid-cols-2 p-1">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`ref-tab-btn flex items-center justify-center space-x-2 py-2 ${
                  mode === 'add' ? 'active' : ''
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Credit Tokens (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('deduct')}
                className={`ref-tab-btn flex items-center justify-center space-x-2 py-2 ${
                  mode === 'deduct' ? 'active' : ''
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Debit Tokens (-)</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-medium text-ink block mb-1.5">
              Quick Presets
            </label>
            <div className="grid grid-cols-5 gap-2">
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

          {/* Token Quantity Input */}
          <div>
            <label className="text-xs font-medium text-ink block mb-1.5">
              Token Quantity
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ref-input w-full font-mono text-xs pr-8"
                placeholder="Enter token amount..."
              />
              <Coins className="w-4 h-4 text-muted absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Transaction Note */}
          <div>
            <label className="text-xs font-medium text-ink block mb-1.5 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-muted" />
              <span>Audit Note (Optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="ref-input w-full text-xs placeholder:text-muted"
              placeholder="e.g. Monthly quota allocation / Manual admin override"
            />
          </div>

          {/* Real-time Balance Preview Calculation Box */}
          <div className="ref-card-subtle p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Real-time Balance Projection</span>
              <span className={`font-mono font-semibold ${balanceDelta > 0 ? 'text-success' : balanceDelta < 0 ? 'text-danger' : 'text-muted'}`}>
                {balanceDelta > 0 ? `+${balanceDelta}` : balanceDelta} Tokens
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted uppercase">Current</span>
                <span className="font-mono text-sm font-semibold text-ink">{currentTokens.toLocaleString()}</span>
              </div>

              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-surface border border-border-soft">
                <ArrowRight className="w-3.5 h-3.5 text-accent" />
              </div>

              <div className="flex flex-col text-right">
                <span className="text-[10px] text-muted uppercase">Resulting</span>
                <span className={`font-display text-base font-normal ${mode === 'add' ? 'text-success' : 'text-danger'}`}>
                  {calculatedNewBalance.toLocaleString()} <span className="font-sans text-xs font-normal text-muted">Tokens</span>
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/25 rounded-md text-danger text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
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
              <span>{isSubmitting ? 'Processing...' : mode === 'add' ? 'Credit Tokens (+)' : 'Debit Tokens (-)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
