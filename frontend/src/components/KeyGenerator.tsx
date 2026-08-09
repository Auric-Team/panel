"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Plus, Key, Upload, FileImage, Coins, AlertCircle, Check, Copy, Sparkles, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { UserItem } from '@/types/key';

interface KeyGeneratorProps {
  user: UserItem | null;
  onGenerate: (
    duration: string,
    count: number,
    note: string,
    paymentScreenshot: string | null,
    isMasterKey: boolean
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
  const [durationOption, setDurationOption] = useState<string>('7 Days');
  const [customDays, setCustomDays] = useState<string>('4');
  const [genCount, setGenCount] = useState<number>(1);
  const [genNote, setGenNote] = useState<string>('');
  const [isMasterKey, setIsMasterKey] = useState<boolean>(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const durationPresets = ['1 Day', '7 Days', '30 Days', 'Lifetime', 'Custom'];

  const costPerKey = useMemo(() => {
    if (isMasterKey) return 0;
    if (durationOption === '1 Day') return 10;
    if (durationOption === '7 Days') return 70;
    if (durationOption === '30 Days') return 250;
    if (durationOption === 'Lifetime') return 300;
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
      alert('Please upload a valid image file (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentScreenshot(reader.result as string);
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
    if (isInsufficientTokens) return;
    const targetDuration = durationOption === 'Custom' ? `${customDays} Days` : durationOption;
    await onGenerate(targetDuration, genCount, genNote, paymentScreenshot, isMasterKey);
    setGenNote('');
    setPaymentScreenshot(null);
  };

  const copyGeneratedKeys = () => {
    if (generatedKeys.length === 0) return;
    const text = generatedKeys.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-5 font-mono text-xs backdrop-blur-md">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">License Key Generation Engine</h2>
            <p className="text-[11px] text-slate-400">Issue hardware-bound or master keys instantly</p>
          </div>
        </div>

        {/* Master Key Mode Toggle */}
        {(user?.role === 'owner' || user?.role === 'manager') && (
          <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition">
            <input
              type="checkbox"
              checked={isMasterKey}
              onChange={(e) => setIsMasterKey(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-900 cursor-pointer"
            />
            <span className="text-amber-400 font-bold flex items-center space-x-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Master Key Mode</span>
            </span>
          </label>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Preset Duration Buttons */}
        <div>
          <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">
            Select Duration Preset
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {durationPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDurationOption(preset)}
                className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition border ${
                  durationOption === preset
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Custom Days Input */}
          {durationOption === 'Custom' && (
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Custom Days Count
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-slate-700 transition"
              />
            </div>
          )}

          {/* Key Quantity Counter */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Key Quantity
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={genCount}
              onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-slate-700 transition font-bold"
            />
          </div>

          {/* Customer Note / Discord */}
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
              Customer Note / Reference
            </label>
            <input
              type="text"
              placeholder="e.g. @discord_user or Order #1234"
              value={genNote}
              onChange={(e) => setGenNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-slate-700 transition"
            />
          </div>
        </div>

        {/* Drag & Drop Payment Screenshot Upload */}
        <div>
          <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
            Payment Screenshot Proof (Optional)
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {paymentScreenshot ? (
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-3">
              <div className="flex items-center space-x-3">
                <img
                  src={paymentScreenshot}
                  alt="Proof Thumbnail"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                />
                <div>
                  <span className="text-xs text-slate-200 font-bold block">
                    Payment Proof Uploaded
                  </span>
                  <span className="text-[10px] text-slate-500 block">Ready to attach to key</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPaymentScreenshot(null)}
                className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/50 transition"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex items-center justify-center space-x-3 ${
                isDragging
                  ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <Upload className="w-5 h-5 text-cyan-400" />
              <span>Drag & drop payment receipt screenshot or click to browse image</span>
            </div>
          )}
        </div>

        {/* Live Token Cost Summary Bar & Submit Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center space-x-3 text-slate-300">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Total Cost: <strong className="text-amber-400 font-extrabold text-sm">{totalCost} Tokens</strong> ({costPerKey} Tokens / key)
            </span>
            {!isUnlimited && (
              <span className="text-slate-500 border-l border-slate-800 pl-3">
                Your Balance: <strong className="text-white font-bold">{userTokens} Tokens</strong>
              </span>
            )}
          </div>

          {isInsufficientTokens ? (
            <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-semibold bg-rose-950/50 border border-rose-900/60 px-4 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4" />
              <span>Insufficient Token Balance</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-6 py-3 rounded-2xl transition shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <span>Generating License Keys...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Generate {genCount} License Key{genCount > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Generated Keys Display Box */}
      {generatedKeys.length > 0 && (
        <div className="mt-4 p-4 bg-slate-950 border border-emerald-900/60 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Successfully Generated {generatedKeys.length} Key(s)</span>
            </span>

            <button
              type="button"
              onClick={copyGeneratedKeys}
              className="flex items-center space-x-1.5 text-xs text-slate-200 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl transition"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied All!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All Keys</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl max-h-36 overflow-y-auto space-y-1 font-mono text-xs text-slate-200 selection:bg-cyan-500">
            {generatedKeys.map((k, i) => (
              <div key={i} className="select-all font-bold">{k}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
