"use client";

import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Key,
  Upload,
  Coins,
  AlertCircle,
  Check,
  Copy,
  Sparkles,
  Search,
  RotateCcw,
  Trash2,
  FileImage,
  Download,
  CheckCircle2,
  Eye,
  X,
  Calculator,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { UserItem, KeyItem } from '@/types/key';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';

interface KeyManagementProps {
  user: UserItem | null;
  keys: KeyItem[];
  onGenerate: (
    duration: string,
    count: number,
    note: string,
    paymentScreenshot: string | null,
    isMasterKey: boolean
  ) => Promise<void>;
  isGenerating: boolean;
  generatedKeys: string[];
  onResetHwid: (id: string) => void;
  onDeleteKey: (id: string) => void;
  onOpenProofModal?: (key: KeyItem) => void;
}

export const KeyManagement: React.FC<KeyManagementProps> = ({
  user,
  keys,
  onGenerate,
  isGenerating,
  generatedKeys,
  onResetHwid,
  onDeleteKey,
  onOpenProofModal,
}) => {
  // Generator State
  const [durationOption, setDurationOption] = useState<string>('7 Days');
  const [customDays, setCustomDays] = useState<string>('4');
  const [genCount, setGenCount] = useState<number>(1);
  const [genNote, setGenNote] = useState<string>('');
  const [isMasterKey, setIsMasterKey] = useState<boolean>(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Table & Tool State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'claimed' | 'revoked' | 'master'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Lightbox Preview Modal State
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    keyItem?: KeyItem | null;
    imageSrc?: string | null;
    imageTitle?: string;
  }>({ isOpen: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const durationPresets = ['1 Day', '7 Days', '30 Days', 'Lifetime', 'Custom'];

  // Token Cost Breakdown Calculations
  // Base token rules: 1D = 10 tokens, 7D = 70 tokens, 30D = 250 tokens, Lifetime = 300 tokens; Custom = days * 10
  const baseTokensPerKey = useMemo(() => {
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
  }, [durationOption, customDays]);

  const masterMultiplier = isMasterKey ? 1.5 : 1.0;
  const costPerKey = useMemo(() => {
    return Math.round(baseTokensPerKey * masterMultiplier * 10) / 10;
  }, [baseTokensPerKey, masterMultiplier]);

  const totalCost = useMemo(() => {
    return Math.round(costPerKey * genCount * 10) / 10;
  }, [costPerKey, genCount]);

  const isUnlimited = user?.role === 'owner' || user?.role === 'manager';
  const userTokens = user?.tokens ?? 0;
  const isInsufficientTokens = !isUnlimited && userTokens < totalCost;

  // File Upload Handlers
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds 5MB limit.');
      return;
    }
    setFileName(file.name);
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

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentScreenshot(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Submit Key Generation Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInsufficientTokens) return;
    const parsedCustom = parseInt(customDays, 10);
    const validCustom = isNaN(parsedCustom) || parsedCustom < 1 ? 1 : parsedCustom;
    const targetDuration = durationOption === 'Custom' ? `${validCustom} Days` : durationOption;
    await onGenerate(targetDuration, genCount, genNote, paymentScreenshot, isMasterKey);
    setGenNote('');
    setPaymentScreenshot(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast(`Successfully generated ${genCount} key(s)!`);
  };

  // Copy All Listed Keys Tool
  const copyAllKeysToClipboard = () => {
    const keysToCopy = filteredKeys.length > 0 ? filteredKeys.map((k) => k.key) : generatedKeys;
    if (keysToCopy.length === 0) {
      showToast('No keys available to copy.');
      return;
    }
    const text = keysToCopy.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedId('all_keys');
    setTimeout(() => setCopiedId(null), 2500);
    showToast(`Copied ${keysToCopy.length} key(s) to clipboard!`);
  };

  // CSV Export Tool - Generates axios_license_keys.csv
  const exportToCSV = () => {
    const dataToExport = filteredKeys.length > 0 ? filteredKeys : keys;
    if (dataToExport.length === 0) {
      showToast('No keys to export.');
      return;
    }

    const headers = ['Key', 'Duration', 'Master', 'CreatedAt', 'Expiry', 'Status'];
    const rows = dataToExport.map((k) => {
      const isMaster = k.isMasterKey ? 'Yes' : 'No';
      const createdStr = k.createdAt ? new Date(k.createdAt).toISOString() : 'N/A';
      const expiryStr = k.expiresAt && k.expiresAt !== 'never' ? new Date(k.expiresAt).toISOString() : 'Lifetime';
      const statusStr = k.hwid ? 'Claimed' : k.status;
      return [
        k.key,
        k.duration || 'Custom',
        isMaster,
        createdStr,
        expiryStr,
        statusStr,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'axios_license_keys.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported axios_license_keys.csv successfully!');
  };

  // Filter keys for table display
  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        k.key.toLowerCase().includes(q) ||
        (k.createdByUsername && k.createdByUsername.toLowerCase().includes(q)) ||
        (k.note && k.note.toLowerCase().includes(q)) ||
        (k.hwid && k.hwid.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = k.status === 'active' && !k.hwid;
      else if (statusFilter === 'claimed') matchesStatus = Boolean(k.hwid);
      else if (statusFilter === 'revoked') matchesStatus = k.status === 'revoked' || k.status === 'banned';
      else if (statusFilter === 'master') matchesStatus = Boolean(k.isMasterKey);

      return matchesSearch && matchesStatus;
    });
  }, [keys, searchQuery, statusFilter]);

  const handleCopySingleKey = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenProof = (keyItem: KeyItem) => {
    if (onOpenProofModal) {
      onOpenProofModal(keyItem);
    } else {
      setLightboxState({
        isOpen: true,
        keyItem,
      });
    }
  };

  const handlePreviewUploadedProof = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!paymentScreenshot) return;
    setLightboxState({
      isOpen: true,
      imageSrc: paymentScreenshot,
      imageTitle: `Payment Proof - ${fileName || 'Uploaded Screenshot'}`,
    });
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/80 text-cyan-300 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center space-x-3 animate-in slide-in-from-bottom-4 duration-300">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-bold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Generator & Estimator Card */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-6 backdrop-blur-md">
        {/* Generator Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-md">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide flex items-center space-x-2">
                <span>Interactive License Key Generator</span>
              </h2>
              <p className="text-[11px] text-slate-400">Configure duration presets, master keys, and payment verification</p>
            </div>
          </div>

          {/* Master Key Toggle Switch */}
          <div className="flex items-center space-x-3">
            {isMasterKey && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)] animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>MASTER KEY ACTIVE</span>
              </span>
            )}

            <label
              className={`flex items-center space-x-3 cursor-pointer px-4 py-2.5 rounded-2xl transition duration-300 border ${
                isMasterKey
                  ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-purple-950/80 border-cyan-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] ring-2 ring-purple-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isMasterKey}
                onChange={(e) => setIsMasterKey(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  isMasterKey ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isMasterKey ? 'translate-x-5 shadow-md' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className={`font-bold text-xs ${isMasterKey ? 'text-cyan-300' : 'text-slate-400'}`}>
                Master Key
              </span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preset Duration Pills */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-2 tracking-wider">
              Select License Duration Preset
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {durationPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDurationOption(preset)}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition border ${
                    durationOption === preset
                      ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Custom Days Input */}
            {durationOption === 'Custom' && (
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                  Custom Days Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white font-mono outline-none focus:border-cyan-500/80 transition"
                  placeholder="Enter number of days"
                />
              </div>
            )}

            {/* Key Quantity Counter */}
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                Key Quantity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={genCount}
                onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white font-mono outline-none focus:border-cyan-500/80 transition font-bold"
              />
            </div>

            {/* Customer Note / Discord */}
            <div className={durationOption === 'Custom' ? 'sm:col-span-1' : 'sm:col-span-2'}>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1.5">
                Customer Note / Order Ref
              </label>
              <input
                type="text"
                placeholder="e.g. @discord_tag or Invoice #8841"
                value={genNote}
                onChange={(e) => setGenNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-white font-mono outline-none focus:border-cyan-500/80 transition"
              />
            </div>
          </div>

          {/* Dynamic Live Token Cost Breakdown Estimator Card */}
          <div className="bg-slate-950/80 border border-cyan-900/40 rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span>Token Cost Breakdown Estimator</span>
              </span>

              <span className="text-[11px] text-slate-400">
                Rate: <strong className="text-white">{baseTokensPerKey} Tokens/key</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] border-t border-slate-800/60">
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Base Duration</span>
                <span className="text-slate-200 font-semibold">{durationOption === 'Custom' ? `${customDays} Days` : durationOption}</span>
              </div>

              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Quantity</span>
                <span className="text-slate-200 font-semibold">{genCount} Key(s)</span>
              </div>

              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Master Multiplier</span>
                <span className={isMasterKey ? "text-purple-400 font-bold" : "text-slate-400"}>
                  {isMasterKey ? '+50% (1.5x)' : '1.0x (Standard)'}
                </span>
              </div>

              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Estimated Cost</span>
                <span className="text-amber-400 font-extrabold text-sm">{totalCost} Tokens</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span>
                Calculation: {baseTokensPerKey} Base Tokens × {genCount} Key(s) {isMasterKey ? '× 1.5 Master Multiplier' : ''} = <strong className="text-amber-300">{totalCost} Tokens</strong>
              </span>

              {!isUnlimited && (
                <span className="text-slate-300">
                  Balance: <strong className="text-white font-bold">{userTokens} Tokens</strong>
                </span>
              )}
            </div>
          </div>

          {/* Drag & Drop Payment Proof Uploader Zone */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-2 tracking-wider">
              Payment Proof Receipt Uploader (Optional)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {paymentScreenshot ? (
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center space-x-4">
                  {/* Live Thumbnail Preview with click-to-preview */}
                  <div
                    onClick={handlePreviewUploadedProof}
                    className="relative group cursor-pointer"
                    title="Click to view full lightbox preview"
                  >
                    <img
                      src={paymentScreenshot}
                      alt="Payment Proof Thumbnail"
                      className="w-14 h-14 rounded-2xl object-cover border border-cyan-800/80 shadow-md group-hover:opacity-80 transition"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-cyan-300">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-white font-bold block truncate max-w-xs">
                      {fileName || 'payment_proof_receipt.png'}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-medium block">
                      Live thumbnail preview • Click thumbnail to inspect
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handlePreviewUploadedProof}
                    className="text-cyan-300 hover:text-cyan-200 text-xs font-semibold px-3.5 py-2 rounded-xl bg-cyan-950/60 border border-cyan-800/50 transition flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-800/50 transition flex items-center space-x-1"
                    title="Clear payment proof"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                  isDragging
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 scale-[0.99]'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div className="p-3 rounded-2xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-200">
                  Drag & drop payment receipt proof here or click to browse
                </span>
                <span className="text-[10px] text-slate-500">Supports PNG, JPG, JPEG up to 5MB</span>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 text-slate-300">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Total Token Cost: <strong className="text-amber-400 font-extrabold text-sm">{totalCost} Tokens</strong>
              </span>
            </div>

            {isInsufficientTokens ? (
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold bg-rose-950/50 border border-rose-900/60 px-5 py-3 rounded-2xl">
                <AlertCircle className="w-4 h-4" />
                <span>Insufficient Tokens ({userTokens} Available)</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold px-7 py-3 rounded-2xl transition shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
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

        {/* Recently Generated Keys Box */}
        {generatedKeys.length > 0 && (
          <div className="mt-4 p-4.5 bg-slate-950 border border-emerald-900/60 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Successfully Generated {generatedKeys.length} Key(s)</span>
              </span>

              <button
                type="button"
                onClick={copyAllKeysToClipboard}
                className="flex items-center space-x-1.5 text-xs text-slate-200 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl transition"
              >
                {copiedId === 'all_keys' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied All!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy All Generated Keys</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl max-h-40 overflow-y-auto space-y-1.5 font-mono text-xs text-slate-200 selection:bg-cyan-500">
              {generatedKeys.map((k, i) => (
                <div key={i} className="select-all font-bold tracking-wide">{k}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generated Keys Registry Table & Tools */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md">
        {/* Table Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-bold text-white tracking-wide">License Keys Registry</h3>
            <span className="px-3 py-1 rounded-xl bg-slate-950 text-cyan-400 border border-slate-800 font-bold text-xs">
              {filteredKeys.length} Keys
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              {(['all', 'active', 'claimed', 'revoked', 'master'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-bold transition ${
                    statusFilter === st
                      ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search key, HWID, note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono outline-none focus:border-cyan-500/80 transition"
              />
            </div>

            {/* Copy All Keys Tool Button */}
            <button
              onClick={copyAllKeysToClipboard}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5"
              title="Copy All Listed Keys"
            >
              <Copy className="w-4 h-4 text-cyan-400" />
              <span>Copy All</span>
            </button>

            {/* CSV Export Tool Button (generates axios_license_keys.csv) */}
            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1.5"
              title="Export to axios_license_keys.csv"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>CSV Export</span>
            </button>
          </div>
        </div>

        {/* Keys Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">License Key</th>
                <th className="p-3.5">Creator / Owner</th>
                <th className="p-3.5">Duration & Expiry</th>
                <th className="p-3.5">Cost Tokens</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Payment Proof</th>
                <th className="p-3.5">Bound HWID Device</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 font-sans">
                    No license keys match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredKeys.map((k) => {
                  const isClaimed = Boolean(k.hwid);
                  const isRevoked = k.status === 'revoked' || k.status === 'banned';

                  return (
                    <tr key={k.id} className="hover:bg-slate-800/40 transition">
                      {/* Key String & Copy & Note */}
                      <td className="p-3.5 font-bold text-white">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {k.isMasterKey ? (
                              <span className="p-1 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-800/60" title="Master Key">
                                <Sparkles className="w-3.5 h-3.5" />
                              </span>
                            ) : null}
                            <span className="truncate max-w-[200px]" title={k.key}>{k.key}</span>
                            <button
                              onClick={() => handleCopySingleKey(k.key, k.id)}
                              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                              title="Copy Key"
                            >
                              {copiedId === k.id ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          {k.note ? (
                            <div className="text-[10px] font-normal text-cyan-400/90 flex items-center space-x-1">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50 text-[10px] text-cyan-300 font-semibold truncate max-w-[220px]" title={k.note}>
                                Note: {k.note}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Creator */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 text-[11px] font-semibold border border-slate-800">
                          {k.createdByUsername || 'System'}
                        </span>
                      </td>

                      {/* Duration & Expiry */}
                      <td className="p-3.5">
                        <span className="text-white font-medium block">{k.duration || 'Custom'}</span>
                        {!k.expiresAt || k.expiresAt === 'never' ? (
                          <span className="text-[10px] text-emerald-400 font-bold block">Lifetime / Never</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(k.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      {/* Cost Tokens */}
                      <td className="p-3.5 font-extrabold text-amber-400 text-sm">
                        {k.costTokens || 0}
                      </td>

                      {/* Status Badges */}
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                            isRevoked
                              ? 'bg-rose-950/90 text-rose-400 border border-rose-800/80'
                              : isClaimed
                              ? 'bg-cyan-950/90 text-cyan-400 border border-cyan-800/80'
                              : k.status === 'expired'
                              ? 'bg-amber-950/90 text-amber-400 border border-amber-800/80'
                              : 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/80'
                          }`}
                        >
                          {isRevoked ? 'Revoked' : isClaimed ? 'Claimed' : k.status}
                        </span>
                      </td>

                      {/* Payment Proof Button */}
                      <td className="p-3.5">
                        {k.paymentScreenshot ? (
                          <button
                            onClick={() => handleOpenProof(k)}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-slate-900 text-cyan-300 border border-slate-800 hover:bg-slate-800 transition flex items-center space-x-1.5 shadow-sm"
                          >
                            <FileImage className="w-3.5 h-3.5 text-cyan-400" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      {/* Bound HWID */}
                      <td className="p-3.5 text-slate-400 max-w-[130px] truncate" title={k.hwid || 'Unbound'}>
                        {k.hwid || 'Unbound'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {k.hwid && (
                            <button
                              onClick={() => onResetHwid(k.id)}
                              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                              title="Reset Hardware Binding (HWID)"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onDeleteKey(k.id)}
                            className="p-2 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-400 hover:text-rose-200 hover:bg-rose-900/80 transition"
                            title="Delete / Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lightbox Modal fallback for uploaded image or table row */}
      {lightboxState.isOpen && (
        <PaymentScreenshotModal
          isOpen={lightboxState.isOpen}
          keyItem={lightboxState.keyItem || null}
          imageSrc={lightboxState.imageSrc || null}
          imageTitle={lightboxState.imageTitle}
          onClose={() => setLightboxState({ isOpen: false })}
        />
      )}
    </div>
  );
};
