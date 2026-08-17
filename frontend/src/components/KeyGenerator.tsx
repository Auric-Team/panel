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
  Download,
  Share2,
  Crown,
  FileText,
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
  const userTokens = user?.tokens !== undefined ? user.tokens : (user?.credits || 0);
  const isInsufficientTokens = !isUnlimited && userTokens < totalCost;

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentScreenshot(reader.result as string);
      toast.info('Payment receipt proof attached.');
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

  const handleRemoveImage = () => {
    setPaymentScreenshot(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInsufficientTokens) {
      toast.error(`Insufficient balance. Required: ${totalCost} tokens.`);
      return;
    }

    const durationVal =
      durationOption === 'Custom'
        ? `${Math.max(1, parseInt(customDays, 10) || 1)} Days`
        : durationOption;

    await onGenerate(
      durationVal,
      genCount,
      genNote,
      paymentScreenshot,
      isMasterKey,
      customPrefix,
      keyFormat
    );
  };

  const handleCopyAll = () => {
    if (generatedKeys.length === 0) return;
    navigator.clipboard.writeText(generatedKeys.join('\n'));
    setCopiedSuccess(true);
    toast.success(`Copied ${generatedKeys.length} license key(s) to clipboard!`);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleExportTxt = () => {
    if (generatedKeys.length === 0) return;
    const blob = new Blob([generatedKeys.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AXIOS_Keys_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Keys exported as .txt file!');
  };

  const handleExportJson = () => {
    if (generatedKeys.length === 0) return;
    const jsonStr = JSON.stringify(
      generatedKeys.map((k) => ({
        key: k,
        duration: durationOption === 'Custom' ? `${customDays} Days` : durationOption,
        createdAt: new Date().toISOString(),
        note: genNote,
      })),
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AXIOS_Keys_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Keys exported as JSON!');
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-7 font-sans backdrop-blur-2xl">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Key className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-mono tracking-tight flex items-center gap-2">
              KEY GENERATION STUDIO
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 rounded-full">
                CRYPTOGRAPHIC RNG
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Issue tamper-proof hardware license keys with custom prefixes and durations
            </p>
          </div>
        </div>

        {/* Live Token Wallet Gauge */}
        <div className="flex items-center space-x-3 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl font-mono text-xs shadow-inner">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Available:</span>
          <span className="font-extrabold text-amber-300 text-sm">
            {isUnlimited ? '∞ UNLIMITED' : `${userTokens.toLocaleString()} T`}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Duration Presets */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Select License Validity Period
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {durationPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDurationOption(preset.label)}
                className={`py-3 px-2 rounded-2xl border text-center transition-all duration-200 font-mono text-xs flex flex-col items-center justify-center space-y-1 ${
                  durationOption === preset.label
                    ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="font-bold">{preset.label}</span>
                <span className="text-[10px] text-amber-400/90 font-semibold">
                  {preset.cost > 0 ? `${preset.cost}T` : preset.days === -1 ? 'Custom' : 'Free'}
                </span>
              </button>
            ))}
          </div>

          {durationOption === 'Custom' && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <label className="text-[11px] font-mono text-cyan-400 block mb-1">
                Custom Duration (in Days):
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/50 rounded-2xl px-4 py-2.5 text-white font-mono outline-none focus:ring-1 focus:ring-cyan-400 text-xs"
                />
                <span className="absolute right-4 top-2.5 text-slate-400 font-mono text-xs">Days</span>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Customization Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Key Prefix */}
          <div>
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Custom Key Prefix
            </label>
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. AXIOS, VIP, PRO"
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-cyan-500/80 text-xs"
            />
          </div>

          {/* Key Format */}
          <div>
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Key Format
            </label>
            <select
              value={keyFormat}
              onChange={(e) => setKeyFormat(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-cyan-500/80 text-xs cursor-pointer"
            >
              <option value="hyphenated">Formatted (XXXX-XXXX-XXXX)</option>
              <option value="raw16">Raw 16 (XXXXXXXXXXXXXXXX)</option>
              <option value="uuid">UUID (Standard GUID)</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Quantity ({genCount} Keys)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={genCount}
              onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-cyan-500/80 text-xs"
            />
          </div>

          {/* Note / Customer Tag */}
          <div>
            <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Customer Note / Tag
            </label>
            <input
              type="text"
              placeholder="e.g. VIP Customer @telegram"
              value={genNote}
              onChange={(e) => setGenNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-cyan-500/80 text-xs"
            />
          </div>
        </div>

        {/* Executive Master Key Toggle (Only Owner / Manager) */}
        {isUnlimited && (
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-950 to-slate-950 border border-purple-900/60 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Crown className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-black text-white font-mono">
                    Executive Master Key Mode (@Axiosofficial)
                  </h4>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 rounded-full uppercase">
                    UNLIMITED HWID
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Allows multiple concurrent devices on a single master license key with zero token cost.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMasterKey(!isMasterKey)}
              className={`px-4 py-2.5 rounded-2xl font-mono font-bold text-xs transition-all shadow-md ${
                isMasterKey
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {isMasterKey ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        )}

        {/* Drag & Drop Payment Screenshot Area */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Payment Screenshot Proof (Optional)
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-2.5 ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20'
                : paymentScreenshot
                ? 'border-emerald-500/60 bg-emerald-950/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {paymentScreenshot ? (
              <div className="flex items-center space-x-3 text-xs font-mono text-emerald-400">
                <FileImage className="w-5 h-5 text-emerald-400" />
                <span className="font-bold">{fileName || 'Payment receipt proof attached'}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="p-1 rounded-full bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-white transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-cyan-400" />
                <div className="text-xs text-slate-300 font-mono">
                  <strong className="text-cyan-400">Click to upload</strong> or drag & drop payment proof
                </div>
                <div className="text-[10px] text-slate-500 font-mono">PNG, JPG, WEBP up to 10MB</div>
              </>
            )}
          </div>
        </div>

        {/* Generate Button & Cost Indicator */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-slate-400">Total Transaction Cost:</span>
            <span className="font-black text-base text-amber-400">
              {isMasterKey ? '0 Tokens (Master Key)' : `${totalCost.toLocaleString()} Tokens`}
            </span>
          </div>

          <button
            type="submit"
            disabled={isGenerating || isInsufficientTokens}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-cyan-600/25 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95"
          >
            {isGenerating ? (
              <span>Issuing Cryptographic Keys...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate {genCount} License Key{genCount > 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Keys Display Box */}
      {generatedKeys.length > 0 && (
        <div className="bg-slate-950 border border-cyan-500/50 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-black text-white font-mono">
                {generatedKeys.length} License Key{generatedKeys.length > 1 ? 's' : ''} Issued Successfully
              </h4>
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs">
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 font-bold transition flex items-center gap-1.5"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? 'Copied!' : 'Copy All'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportTxt}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5"
                title="Export as Text"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.TXT</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5"
                title="Export as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {generatedKeys.map((k, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 font-mono text-xs text-cyan-300 select-all"
              >
                <span className="font-bold">{k}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(k);
                    toast.success(`Copied key: ${k}`);
                  }}
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-300 transition"
                  title="Copy Key"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
