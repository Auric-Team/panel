"use client";

import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, ArrowLeft, Delete } from 'lucide-react';

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
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
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
    const lastFilledIndex = digits.map((d) => d !== '').lastIndexOf(true);
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
    <div className="w-full max-w-md ref-card p-6 sm:p-8 space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Security Icon & Header */}
      <div className="text-center space-y-2">
        <div className="ref-dialog-icon">
          <KeyRound className="w-6 h-6 text-accent" />
        </div>
        <h2 className="font-display text-xl font-normal text-ink tracking-tight">Two-Factor Authentication</h2>
        <p className="text-xs text-muted font-sans">
          Enter 6-digit security PIN for <strong className="text-ink">@{username}</strong> ({role})
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-danger/10 border border-danger/25 text-danger text-xs text-center font-medium">
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
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            name={`security_pin_digit_${i}`}
            className={`w-11 h-12 sm:w-12 sm:h-12 text-center text-lg font-bold font-mono rounded-sm border transition-colors outline-none bg-surface text-ink ${
              digit
                ? 'border-accent shadow-sm'
                : 'border-border focus:border-focus'
            }`}
          />
        ))}
      </div>

      {/* Verifying Status */}
      {isVerifying && (
        <div className="text-center text-xs font-mono text-accent animate-pulse font-medium">
          Verifying security PIN...
        </div>
      )}

      {/* Toggle Numeric Keypad on Mobile */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => setShowKeypad(!showKeypad)}
          className="text-[11px] font-sans text-muted hover:text-ink transition underline tracking-wider"
        >
          {showKeypad ? 'Hide On-Screen Keypad' : 'Show On-Screen Keypad'}
        </button>
      </div>

      {/* Touch Numpad */}
      {showKeypad && (
        <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-2 animate-in fade-in duration-150">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadDigit(num)}
              className="ref-btn h-11 text-base font-mono font-bold"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setDigits(['', '', '', '', '', ''])}
            className="ref-btn h-11 text-[11px] font-sans"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeypadDigit('0')}
            className="ref-btn h-11 text-base font-mono font-bold"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleKeypadBackspace}
            className="ref-btn h-11 text-danger"
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
          className="ref-btn w-full py-2.5 text-xs font-medium flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Credentials Login</span>
        </button>
      </div>
    </div>
  );
};
