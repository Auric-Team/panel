"use client";

import React, { useState, useMemo, useRef } from 'react';
import {
  Key,
  Upload,
  Coins,
  Sparkles,
  Check,
  Copy,
  FileImage,
  X,
  Layers,
  HelpCircle,
  Hash,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { UserItem } from '@/types/key';
import { useToast } from '@/components/ui/ToastContext';

interface KeyGeneratorProps {
  user: UserItem | null;
  onGenerate: (
    duration: string,
    count: number,
    note: string,
    paymentScreenshot: string | null,
    isMasterKey: boolean,
    prefix?: string,
    format?: 'hyphenated' | 'raw16' | 'uuid'
  ) => Promise<void>;
  isGenerating: boolean;
  generatedKeys: string[];
}

export const KeyGenerator: React.FC<KeyGeneratorProps> = ({
  user,
  onGenerate,
  isGenerating,
  generatedKeys,
}) => {
  const { toast } = useToast();

  const [durationOption, setDurationOption] = useState<string>('7 Days');
  const [customDays, setCustomDays] = useState<string>('7');
  const [genCount, setGenCount] = useState<number>(1);
  const [genNote, setGenNote] = useState<string>('');
  const [customPrefix, setCustomPrefix] = useState<string>('AXIOS');
  const [keyFormat, setKeyFormat] = useState<'hyphenated' | 'raw16' | 'uuid'>('hyphenated');
  const [isMasterKey, setIsMasterKey] = useState<boolean>(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const durationPresets = [
    { label: '1 Day', days: 1, cost: 10 },
    { label: '3 Days', days: 3, cost: 30 },
    { label: '7 Days', days: 7, cost: 70 },
    { label: '14 Days', days: 14, cost: 140 },
    { label: '30 Days', days: 30, cost: 250 },
    { label: '90 Days', days: 90, cost: 650 },
    { label: '1 Year', days: 365, cost: 1500 },
    { label: 'Lifetime', days: 0, cost: 300 },
    { label: 'Custom', days: -1, cost: 0 },
  ];

  const costPerKey = useMemo(() => {
    if (isMasterKey) return 0;
    const found = durationPresets.find((p) => p.label === durationOption);
    if (found && found.days !== -1) return found.cost;
    if (durationOption === 'Custom') {
      const parsed = parseInt(customDays, 10);
      const days = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      return days * 10;
    }
    return 70;
  }, [durationOption, customDays, isMasterKey]);

  const totalCost = useMemo(() => costPerKey * genCount, [costPerKey, genCount]);
  const isUnlimited = user?.role === 'owner' || user?.role === 'manager';
  const userTokens = user?.tokens ?? 0;
  const isInsufficientTokens = !isUnlimited && userTokens < totalCost;

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentScreenshot(reader.result as string);
      toast.info('Payment screenshot attached.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInsufficientTokens) {
      toast.error(`Insufficient tokens. Required: ${totalCost}, Current: ${userTokens}`);
      return;
    }
    const targetDuration = durationOption === 'Custom' ? `${customDays} Days` : durationOption;
    await onGenerate(targetDuration, genCount, genNote, paymentScreenshot, isMasterKey, customPrefix, keyFormat);
    setGenNote('');
    setPaymentScreenshot(null);
    setFileName(null);
  };

  const copyGeneratedKeys = () => {
    if (generatedKeys.length === 0) return;
    const text = generatedKeys.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    toast.success(`Copied ${generatedKeys.length} generated key(s) to clipboard!`);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6 font-sans text-xs">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">License Key Generation Studio</h2>
            <p className="text-xs text-slate-400 font-mono">
              Issue secure activation keys with custom prefixes & duration presets
            </p>
          </div>
        </div>

        {/* Master Key Toggle (Admin only) */}
        {isUnlimited && (
          <label className="inline-flex items-center space-x-2 cursor-pointer bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-2xl transition">
            <input
              type="checkbox"
              checked={isMasterKey}
              onChange={(e) => setIsMasterKey(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-cyan-300">
              Master Key (@Axiosofficial)
            </span>
          </label>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Duration Presets */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
            1. Select License Duration
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {durationPresets.map((p) => {
              const isSelected = durationOption === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDurationOption(p.label)}
                  className={`py-2 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">{p.label}</span>
                  {!isMasterKey && p.days !== -1 && (
                    <span className="text-[10px] text-amber-400 font-mono mt-0.5">{p.cost}T</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Days Input if Custom selected */}
        {durationOption === 'Custom' && (
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl animate-in fade-in duration-150">
            <label className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
              Custom Days (10 Tokens / Day)
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none"
              placeholder="e.g. 45"
            />
          </div>
        )}

        {/* 2. Format & Prefix Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Key Prefix */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
              Key Prefix
            </label>
            <input
              type="text"
              maxLength={8}
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
              placeholder="AXIOS"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl px-3.5 py-2.5 text-white font-mono text-xs outline-none transition uppercase"
            />
          </div>

          {/* Key Pattern */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
              Format Pattern
            </label>
            <select
              value={keyFormat}
              onChange={(e: any) => setKeyFormat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl px-3.5 py-2.5 text-white font-mono text-xs outline-none transition"
            >
              <option value="hyphenated">Hyphenated (XXXX-XXXX-XXXX)</option>
              <option value="raw16">Alphanumeric 16-Char</option>
              <option value="uuid">Standard UUID</option>
            </select>
          </div>

          {/* Batch Count */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
              Quantity to Issue
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={genCount}
              onChange={(e) => setGenCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl px-3.5 py-2.5 text-white font-mono text-xs outline-none transition"
            />
          </div>
        </div>

        {/* 3. Customer Note */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
            Customer Reference / Note (Optional)
          </label>
          <input
            type="text"
            value={genNote}
            onChange={(e) => setGenNote(e.target.value)}
            placeholder="e.g. Discord VIP @Alex #382"
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl px-3.5 py-2.5 text-white font-mono text-xs outline-none transition"
          />
        </div>

        {/* 4. Payment Proof Drag-and-Drop */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
            Payment Screenshot Attachment (Optional)
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1.5 ${
              isDragging
                ? 'border-cyan-500 bg-cyan-950/20'
                : paymentScreenshot
                ? 'border-emerald-500/50 bg-emerald-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {paymentScreenshot ? (
              <div className="flex items-center space-x-3">
                <img
                  src={paymentScreenshot}
                  alt="Proof Preview"
                  className="w-12 h-12 object-cover rounded-xl border border-slate-700"
                />
                <div className="text-left">
                  <div className="text-emerald-400 font-semibold text-xs flex items-center space-x-1 font-mono">
                    <Check className="w-3.5 h-3.5" />
                    <span>Proof Image Attached</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                    {fileName || 'screenshot.png'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaymentScreenshot(null);
                    setFileName(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-300 font-mono">
                  Drag & Drop or <span className="text-cyan-400 underline">Browse File</span>
                </span>
                <span className="text-[10px] text-slate-500">PNG, JPG, WEBP up to 5MB</span>
              </>
            )}
          </div>
        </div>

        {/* 5. Summary & Action Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
          {/* Cost breakdown */}
          <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-start font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Total Cost</span>
              <span className="text-base font-bold text-amber-400">
                {isMasterKey ? '0 Tokens (Admin)' : `${totalCost.toLocaleString()} Tokens`}
              </span>
            </div>

            {!isUnlimited && (
              <div className="border-l border-slate-800 pl-4">
                <span className="text-[10px] text-slate-500 uppercase block">Your Balance</span>
                <span className={`text-base font-bold ${isInsufficientTokens ? 'text-rose-400' : 'text-slate-200'}`}>
                  {userTokens.toLocaleString()} Tokens
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isGenerating || isInsufficientTokens}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition text-xs flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-cyan-600/20"
          >
            {isGenerating ? (
              <span className="animate-pulse">Issuing {genCount} Key(s)...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate {genCount} License Key{genCount > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Keys Live Output Bar */}
      {generatedKeys.length > 0 && (
        <div className="p-4 bg-slate-950 border border-cyan-500/40 rounded-2xl space-y-2.5 animate-in fade-in duration-200 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 font-mono flex items-center space-x-1.5">
              <Check className="w-4 h-4" />
              <span>Successfully Generated {generatedKeys.length} Key(s)</span>
            </span>

            <button
              onClick={copyGeneratedKeys}
              className="flex items-center space-x-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-semibold transition"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSuccess ? 'Copied All!' : 'Copy All Keys'}</span>
            </button>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl max-h-36 overflow-y-auto font-mono text-xs text-white space-y-1">
            {generatedKeys.map((k, i) => (
              <div key={i} className="select-all hover:text-cyan-300">
                {k}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
