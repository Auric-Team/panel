"use client";

import React, { useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';

interface DialPad2FAProps {
  isOpen: boolean;
  username: string;
  role: string;
  onVerify: (pin: string) => void;
  onCancel: () => void;
  errorMsg?: string;
}

export function DialPad2FA({ isOpen, username, role, onVerify, onCancel, errorMsg }: DialPad2FAProps) {
  const [pin, setPin] = useState<string>('');

  if (!isOpen) return null;

  const handleKeyPress = (val: string) => {
    if (pin.length < 6) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 6) {
        onVerify(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-zinc-900 to-black border border-purple-500/40 rounded-3xl p-6 shadow-2xl text-center">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-glow-purple">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-white tracking-wide">2FA Security Authentication</h3>
        <p className="text-xs text-purple-300/80 mt-1 uppercase font-mono">
          {role} Access • {username}
        </p>

        {/* PIN Display Slots */}
        <div className="flex justify-center items-center space-x-2 my-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-10 h-12 rounded-xl border flex items-center justify-center text-xl font-bold transition-all ${
                pin[idx]
                  ? 'border-purple-500 bg-purple-950/60 text-purple-200 shadow-glow-purple scale-105'
                  : 'border-slate-700 bg-slate-900/50 text-transparent'
              }`}
            >
              {pin[idx] ? '●' : ''}
            </div>
          ))}
        </div>

        {errorMsg && (
          <p className="text-red-400 text-xs mb-4 font-semibold animate-pulse">{errorMsg}</p>
        )}

        {/* Dial Pad Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-purple-600/30 active:scale-95 border border-slate-700/50 hover:border-purple-500/50 text-white text-xl font-bold transition-all shadow-md flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-red-950/40 hover:bg-red-900/60 active:scale-95 border border-red-800/40 text-red-300 text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-purple-600/30 active:scale-95 border border-slate-700/50 hover:border-purple-500/50 text-white text-xl font-bold transition-all shadow-md flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700/50 text-gray-300 flex items-center justify-center transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
