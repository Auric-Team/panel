"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, ArrowLeft, Delete, KeyRound, Sparkles } from 'lucide-react';

interface DialPad2FAProps {
  isOpen?: boolean;
  username: string;
  role?: string;
  onVerify: (pin: string) => Promise<void>;
  onCancel: () => void;
  errorMsg?: string | null;
}

export const DialPad2FA: React.FC<DialPad2FAProps> = ({
  username,
  role = 'Administrator',
  onVerify,
  onCancel,
  errorMsg,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Handle multiple characters (e.g. pasted code)
    if (value.length > 1) {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      if (clean.length > 0) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = clean[i] || '';
        }
        setDigits(newDigits);
        if (clean.length === 6) {
          triggerVerify(clean);
        } else {
          inputRefs.current[clean.length]?.focus();
        }
      }
      return;
    }

    const singleDigit = value.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullPin = newDigits.join('');
    if (fullPin.length === 6) {
      triggerVerify(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      if (pasted.length === 6) {
        triggerVerify(pasted);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const handleKeypadDigit = (digit: string) => {
    const emptyIndex = digits.findIndex((d) => d === '');
    if (emptyIndex !== -1) {
      const newDigits = [...digits];
      newDigits[emptyIndex] = digit;
      setDigits(newDigits);

      if (emptyIndex < 5) {
        inputRefs.current[emptyIndex + 1]?.focus();
      }

      const fullPin = newDigits.join('');
      if (fullPin.length === 6) {
        triggerVerify(fullPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    const lastFilledIndex = digits.reduce((last, curr, idx) => (curr !== '' ? idx : last), -1);
    if (lastFilledIndex !== -1) {
      const newDigits = [...digits];
      newDigits[lastFilledIndex] = '';
      setDigits(newDigits);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const triggerVerify = async (pinStr: string) => {
    setIsVerifying(true);
    try {
      await onVerify(pinStr);
    } catch {
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Brand / Security Icon */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Two-Factor Authentication</h2>
        <p className="text-xs text-slate-400 font-mono">
          Enter 6-digit security PIN for <strong className="text-white">@{username}</strong> ({role})
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs text-center font-semibold font-mono animate-shake">
          {errorMsg}
        </div>
      )}

      {/* 6 OTP Boxes */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-4" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isVerifying}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-2xl border transition-all outline-none bg-slate-950 ${
              digit
                ? 'border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'border-slate-800 text-white focus:border-cyan-500/70 focus:bg-slate-900'
            }`}
          />
        ))}
      </div>

      {/* Verifying Status */}
      {isVerifying && (
        <div className="text-center text-xs font-mono text-cyan-400 animate-pulse font-semibold">
          Verifying security PIN...
        </div>
      )}

      {/* Toggle Numeric Keypad on Mobile */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowKeypad(!showKeypad)}
          className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition underline tracking-wider"
        >
          {showKeypad ? 'Hide On-Screen Keypad' : 'Show On-Screen Keypad'}
        </button>
      </div>

      {/* Optional Touch Numpad */}
      {showKeypad && (
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-2 animate-in fade-in duration-150">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadDigit(num)}
              className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-lg hover:bg-slate-800 active:scale-95 transition flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setDigits(['', '', '', '', '', ''])}
            className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-mono font-semibold transition flex items-center justify-center"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeypadDigit('0')}
            className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-lg hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleKeypadBackspace}
            className="w-16 h-12 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 hover:bg-slate-800 active:scale-95 transition flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Back to Login */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs border border-slate-800 transition flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Credentials Login</span>
        </button>
      </div>
    </div>
  );
};
