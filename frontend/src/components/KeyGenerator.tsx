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
  Crown,
  FileText,
  Download,
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
    <div className="ref-card p-6 sm:p-8 space-y-6 font-sans">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-soft">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-md bg-surface border border-border-soft flex items-center justify-center text-accent shadow-sm">
            <Key className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display text-lg sm:text-xl font-normal text-ink tracking-tight">
                Key Generation Studio
              </h2>
              <span className="ref-badge info text-[10px]">
                Cryptographic RNG
              </span>
            </div>
            <p className="text-xs text-muted font-sans mt-0.5">
              Issue tamper-proof hardware license keys with custom parameters
            </p>
          </div>
        </div>

        {/* Live Token Wallet Gauge */}
        <div className="flex items-center space-x-2 bg-surface border border-border-soft px-3 py-1.5 rounded-md font-mono text-xs shadow-sm">
          <Coins className="w-4 h-4 text-warning" />
          <span className="text-muted">Available:</span>
          <span className="font-bold text-ink">
            {isUnlimited ? 'Unlimited' : `${userTokens.toLocaleString()} T`}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Duration Presets */}
        <div className="space-y-2">
          <label className="text-[11px] font-sans font-medium text-muted uppercase tracking-wider block">
            Select License Validity Period
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {durationPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDurationOption(preset.label)}
                className={`py-2 px-2 rounded-sm border text-center transition-colors font-sans text-xs flex flex-col items-center justify-center space-y-0.5 ${
                  durationOption === preset.label
                    ? 'ref-btn-primary border-accent'
                    : 'bg-surface border-border-soft text-muted hover:text-ink hover:bg-surface-hover'
                }`}
              >
                <span className="font-medium text-xs">{preset.label}</span>
                <span className="text-[10px] opacity-80 font-mono">
                  {preset.cost > 0 ? `${preset.cost}T` : preset.days === -1 ? 'Custom' : 'Free'}
                </span>
              </button>
            ))}
          </div>

          {durationOption === 'Custom' && (
            <div className="pt-2 animate-in fade-in duration-150">
              <label className="text-[11px] font-sans text-muted block mb-1">
                Custom Duration (Days):
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="ref-input w-full font-mono text-xs"
                />
                <span className="absolute right-3 top-2.5 text-muted font-mono text-xs">Days</span>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Customization Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Key Prefix */}
          <div>
            <label className="text-[11px] font-sans font-medium text-muted uppercase tracking-wider block mb-1.5">
              Custom Key Prefix
            </label>
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. AXIOS, VIP, PRO"
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
              className="ref-input w-full font-mono text-xs"
            />
          </div>

          {/* Key Format */}
          <div>
            <label className="text-[11px] font-sans font-medium text-muted uppercase tracking-wider block mb-1.5">
              Key Format
            </label>
            <select
              value={keyFormat}
              onChange={(e) => setKeyFormat(e.target.value as any)}
              className="ref-input w-full font-mono text-xs cursor-pointer"
            >
              <option value="hyphenated">Formatted (XXXX-XXXX-XXXX)</option>
              <option value="raw16">Raw 16 (XXXXXXXXXXXXXXXX)</option>
              <option value="uuid">UUID (Standard GUID)</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[11px] font-sans font-medium text-muted uppercase tracking-wider block mb-1.5">
              Quantity ({genCount} Keys)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={genCount}
              onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="ref-input w-full font-mono text-xs"
            />
          </div>

          {/* Note / Customer Tag */}
          <div>
            <label className="text-[11px] font-sans font-medium text-muted uppercase tracking-wider block mb-1.5">
              Customer Note / Tag
            </label>
            <input
              type="text"
              placeholder="e.g. VIP Customer @telegram"
              value={genNote}
              onChange={(e) => setGenNote(e.target.value)}
              className="ref-input w-full font-sans text-xs"
            />
          </div>
        </div>

        {/* Executive Master Key Toggle (Only Owner / Manager) */}
        {isUnlimited && (
          <div className="ref-card-subtle p-4 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-md bg-surface border border-border-soft flex items-center justify-center text-accent shadow-sm">
                <Crown className="w-4 h-4 text-accent" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-sans font-semibold text-ink text-xs">
                    Executive Master Key Mode
                  </h4>
                  <span className="ref-badge warning text-[9px]">
                    Unlimited HWID
                  </span>
                </div>
                <p className="text-[11px] text-muted font-sans mt-0.5">
                  Allows multiple concurrent devices on a single master license key with zero token cost.
                </p>
              </div>
            </div>

            {/* Reference Switch control */}
            <button
              type="button"
              role="switch"
              aria-checked={isMasterKey}
              onClick={() => setIsMasterKey(!isMasterKey)}
              className="ref-switch"
            >
              <i />
            </button>
          </div>
        )}

        {/* Drag & Drop Payment Screenshot Area */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-sans font-medium text-muted uppercase tracking-wider block">
            Payment Screenshot Proof (Optional)
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-md p-4 sm:p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center space-y-2 ${
              isDragging
                ? 'border-accent bg-accent/5'
                : paymentScreenshot
                ? 'border-success/60 bg-success/5'
                : 'border-border-soft hover:border-border bg-surface'
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
              <div className="flex items-center space-x-3 text-xs font-sans text-success">
                <FileImage className="w-4 h-4 text-success" />
                <span className="font-medium">{fileName || 'Payment receipt proof attached'}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="p-1 rounded bg-surface hover:bg-danger/10 text-muted hover:text-danger transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-muted" />
                <div className="text-xs text-ink font-sans">
                  <span className="text-accent font-medium">Click to upload</span> or drag &amp; drop payment proof
                </div>
                <div className="text-[10px] text-muted font-sans">PNG, JPG, WEBP up to 10MB</div>
              </>
            )}
          </div>
        </div>

        {/* Generate Button & Cost Indicator */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border-soft">
          <div className="flex items-center space-x-2 font-sans text-xs">
            <span className="text-muted">Total Transaction Cost:</span>
            <span className="font-mono font-bold text-sm text-warning">
              {isMasterKey ? '0 Tokens (Master Key)' : `${totalCost.toLocaleString()} Tokens`}
            </span>
          </div>

          <button
            type="submit"
            disabled={isGenerating || isInsufficientTokens}
            className="ref-btn ref-btn-primary w-full sm:w-auto px-7 py-2.5 text-xs font-semibold uppercase tracking-wider"
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
        <div className="ref-card-subtle p-5 space-y-4 shadow-sm animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-soft">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-success" />
              <h4 className="font-sans font-semibold text-xs text-ink">
                {generatedKeys.length} License Key{generatedKeys.length > 1 ? 's' : ''} Issued Successfully
              </h4>
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs">
              <button
                type="button"
                onClick={handleCopyAll}
                className="ref-btn ref-btn-sm"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? 'Copied' : 'Copy All'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportTxt}
                className="ref-btn ref-btn-sm"
                title="Export as Text"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>.TXT</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="ref-btn ref-btn-sm"
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
                className="flex items-center justify-between bg-surface border border-border-soft rounded-sm px-3.5 py-2 font-mono text-xs text-ink select-all"
              >
                <span className="font-semibold">{k}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(k);
                    toast.success(`Copied key: ${k}`);
                  }}
                  className="ref-btn-icon w-7 h-7"
                  title="Copy Key"
                >
                  <Copy className="w-3 h-3 text-muted" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
