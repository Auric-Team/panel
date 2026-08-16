"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Delete, ArrowRight, ShieldCheck } from 'lucide-react';

interface DialPad2FAProps {
  isOpen?: boolean;
  username: string;
  role?: string;
  onVerify: (pin: string) => Promise<void>;
  onCancel: () => void;
  errorMsg?: string;
}

export const DialPad2FA: React.FC<DialPad2FAProps> = ({
  isOpen = true,
  username,
  role = 'Administrator',
  onVerify,
  onCancel,
  errorMsg,
}) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) setPin('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 6) {
        submitPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const submitPin = async (targetPin: string) => {
    setIsVerifying(true);
    try {
      await onVerify(targetPin);
    } catch {
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-150 font-mono text-xs">
      <div className="relative w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
        <div>
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">2FA Security PIN</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Account: <strong className="text-white">{username}</strong> ({role})
          </p>
        </div>

        {/* 6 Dots Indicator */}
        <div className="flex items-center justify-center space-x-2 py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                i < pin.length
                  ? 'bg-cyan-400 border-cyan-300 scale-110 shadow-sm'
                  : 'bg-slate-950 border-slate-800'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-[11px] font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Dial Pad Buttons Grid */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-lg hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={onCancel}
            className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition flex items-center justify-center text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-lg hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-rose-400 hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {isVerifying && (
          <div className="text-cyan-400 text-xs font-semibold animate-pulse">
            Verifying 2FA Security PIN...
          </div>
        )}
      </div>
    </div>
  );
};
