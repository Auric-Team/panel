"use client";

import React, { useState, useMemo } from 'react';
import {
  Search,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  FileImage,
  Clock,
  Download,
  Filter,
  Share2,
  Edit3,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
  Smartphone,
  ExternalLink,
  ChevronDown,
  Layers,
  MoreVertical,
  Eye,
} from 'lucide-react';
import { KeyItem } from '@/types/key';
import { useToast } from '@/components/ui/ToastContext';
import { ExpirationProgressBar } from '@/components/ExpirationProgressBar';
import { getReceiptImageUrl } from '@/lib/api';

interface KeysTableProps {
  keys: KeyItem[];
  onResetHwid: (id: string) => void;
  onDeleteKey: (id: string) => void;
  onDeleteExpiredKeys?: () => void;
  onOpenProofModal: (key: KeyItem) => void;
  onOpenExtendModal?: (key: KeyItem) => void;
  onOpenShareModal?: (key: KeyItem) => void;
  onBulkResetHwid?: (ids: string[]) => Promise<void>;
  onBulkDeleteKeys?: (ids: string[]) => Promise<void>;
  onBulkExtendKeys?: (ids: string[], days: number) => Promise<void>;
}

export const KeysTable: React.FC<KeysTableProps> = ({
  keys,
  onResetHwid,
  onDeleteKey,
  onDeleteExpiredKeys,
  onOpenProofModal,
  onOpenExtendModal,
  onOpenShareModal,
  onBulkResetHwid,
  onBulkDeleteKeys,
  onBulkExtendKeys,
}) => {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'unbound' | 'master' | 'receipts'>('all');
  const [resellerFilter, setResellerFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set());

  // Unique list of resellers
  const uniqueResellers = useMemo(() => {
    const set = new Set<string>();
    keys.forEach((k) => {
      if (k.createdByUsername) set.add(k.createdByUsername);
    });
    return Array.from(set).sort();
  }, [keys]);

  // Filtered keys
  const filteredKeys = useMemo(() => {
    const now = new Date();
    return keys.filter((k) => {
      const q = searchQuery.trim().toLowerCase();
      const keyStr = k.key || '';
      const creatorStr = k.createdByUsername || '';
      const noteStr = k.note || '';
      const hwidStr = k.hwid || '';

      const matchesSearch =
        !q ||
        keyStr.toLowerCase().includes(q) ||
        creatorStr.toLowerCase().includes(q) ||
        noteStr.toLowerCase().includes(q) ||
        hwidStr.toLowerCase().includes(q);

      const isExpired = k.status === 'expired' || Boolean(k.expiresAt && k.expiresAt !== 'never' && new Date(k.expiresAt) <= now);
      const isUnbound = !k.hwid && (k.deviceCount === undefined || k.deviceCount === 0);

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = k.status === 'active' && !isExpired;
      else if (statusFilter === 'expired') matchesStatus = isExpired;
      else if (statusFilter === 'unbound') matchesStatus = isUnbound && !isExpired;
      else if (statusFilter === 'master') matchesStatus = Boolean(k.isMasterKey);
      else if (statusFilter === 'receipts') matchesStatus = Boolean(k.paymentScreenshot);

      let matchesReseller = true;
      if (resellerFilter !== 'all') {
        matchesReseller = creatorStr.toLowerCase() === resellerFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus && matchesReseller;
    });
  }, [keys, searchQuery, statusFilter, resellerFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied key: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedKeyIds.size === filteredKeys.length && filteredKeys.length > 0) {
      setSelectedKeyIds(new Set());
    } else {
      setSelectedKeyIds(new Set(filteredKeys.map((k) => k.id)));
    }
  };

  const toggleSelectKey = (id: string) => {
    setSelectedKeyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Export handlers
  const exportToCSV = () => {
    if (filteredKeys.length === 0) return;
    const headers = ['Key', 'Creator', 'Status', 'Duration', 'ExpiresAt', 'BoundHWID', 'Devices', 'CostTokens', 'Note', 'ReceiptUrl'];
    const rows = filteredKeys.map((k) => [
      k.key,
      k.createdByUsername || 'System',
      k.status,
      k.duration || 'Custom',
      k.expiresAt || 'Never',
      k.hwid || 'Unbound',
      k.deviceCount || (k.hwid ? 1 : 0),
      k.costTokens || 0,
      `"${(k.note || '').replace(/"/g, '""')}"`,
      `"${(k.paymentScreenshot || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `axios-keys-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredKeys.length} keys to CSV file!`);
  };

  const copySelectedKeys = () => {
    const selectedList = filteredKeys.filter((k) => selectedKeyIds.has(k.id));
    if (selectedList.length === 0) return;
    const text = selectedList.map((k) => k.key).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${selectedList.length} selected key(s) to clipboard!`);
  };

  const keysWithReceiptsCount = useMemo(() => keys.filter((k) => Boolean(k.paymentScreenshot)).length, [keys]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 font-sans text-xs">
      {/* Controls & Multi-Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-bold text-white tracking-tight">License Keys Registry</h3>
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800 font-mono font-bold text-xs">
            {filteredKeys.length} {filteredKeys.length === 1 ? 'Key' : 'Keys'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
            {(['all', 'active', 'receipts', 'expired', 'unbound', 'master'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-mono font-bold transition whitespace-nowrap flex items-center space-x-1 ${
                  statusFilter === st
                    ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{st === 'unbound' ? 'Fresh/Unbound' : st === 'receipts' ? 'With Receipts' : st}</span>
                {st === 'receipts' && keysWithReceiptsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px]">
                    {keysWithReceiptsCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Reseller Filter Dropdown */}
          {uniqueResellers.length > 1 && (
            <select
              value={resellerFilter}
              onChange={(e) => setResellerFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-500"
            >
              <option value="all">All Resellers</option>
              {uniqueResellers.map((r) => (
                <option key={r} value={r}>
                  @{r}
                </option>
              ))}
            </select>
          )}

          {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-mono font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Key, HWID, Reseller @Username, or Customer Note..."
          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl pl-10 pr-4 py-2.5 text-white font-mono text-xs outline-none transition"
        />
      </div>

      {/* Floating Batch Actions Toolbar */}
      {selectedKeyIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 border border-cyan-500/40 rounded-2xl animate-in fade-in duration-150 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <div className="flex items-center space-x-2 font-mono">
            <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 rounded-lg font-bold text-xs border border-cyan-800">
              {selectedKeyIds.size} Selected
            </span>
            <button
              onClick={() => setSelectedKeyIds(new Set())}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono">
            {/* Copy selected keys */}
            <button
              onClick={copySelectedKeys}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-slate-800 transition text-xs"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>

            {/* Bulk HWID Reset */}
            {onBulkResetHwid && (
              <button
                onClick={() => onBulkResetHwid(Array.from(selectedKeyIds))}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 hover:bg-amber-900/60 transition text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset HWID</span>
              </button>
            )}

            {/* Bulk Extend */}
            {onBulkExtendKeys && (
              <button
                onClick={() => onBulkExtendKeys(Array.from(selectedKeyIds), 7)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 transition text-xs"
              >
                <Clock className="w-3 h-3" />
                <span>+7 Days</span>
              </button>
            )}

            {/* Bulk Delete */}
            {onBulkDeleteKeys && (
              <button
                onClick={() => onBulkDeleteKeys(Array.from(selectedKeyIds))}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 transition text-xs"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MOBILE VIEW: Card List */}
      <div className="block md:hidden space-y-3">
        {filteredKeys.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono">
            No matching license keys found.
          </div>
        ) : (
          filteredKeys.map((k) => {
            const isCopied = copiedId === k.id;
            const isSelected = selectedKeyIds.has(k.id);
            const isExpired = k.status === 'expired' || Boolean(k.expiresAt && k.expiresAt !== 'never' && new Date(k.expiresAt) <= new Date());
            const isUnbound = !k.hwid && (k.deviceCount === undefined || k.deviceCount === 0);

            return (
              <div
                key={k.id}
                className={`p-4 bg-slate-950 rounded-2xl border transition-all space-y-3 ${
                  isSelected ? 'border-cyan-500/60 bg-slate-950/90' : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Key & Selection Checkbox */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <button
                      onClick={() => toggleSelectKey(k.id)}
                      className="text-slate-400 hover:text-white"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <span className="font-mono font-bold text-white text-xs select-all truncate">
                      {k.key}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                        isExpired
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : isUnbound
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      }`}
                    >
                      {isExpired ? 'Expired' : isUnbound ? 'Fresh' : 'Bound'}
                    </span>
                  </div>
                </div>

                {/* Expiration Progress Bar */}
                <ExpirationProgressBar createdAt={k.createdAt} expiresAt={k.expiresAt} />

                {/* Metadata details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Duration</span>
                    <span className="text-slate-200">{k.duration || 'Custom'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block">Creator</span>
                    <span className="text-slate-200">@{k.createdByUsername || 'System'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] text-slate-500 uppercase block">Bound Device HWID</span>
                    <span className="text-slate-300 truncate block">
                      {k.hwid ? k.hwid : <span className="text-slate-500 italic">No Device Bound (Fresh)</span>}
                    </span>
                  </div>
                  {k.note && (
                    <div className="col-span-2 text-slate-400 bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] text-slate-500 uppercase block font-sans">Customer Note:</span>
                      <span className="text-slate-200">{k.note}</span>
                    </div>
                  )}
                </div>

                {/* Prominent Payment Receipt Proof Card (Mobile) */}
                {k.paymentScreenshot && (
                  <div
                    onClick={() => onOpenProofModal(k)}
                    className="flex items-center justify-between p-2.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-800/60 rounded-xl cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={getReceiptImageUrl(k.paymentScreenshot)}
                        alt="Payment Receipt"
                        className="w-10 h-10 object-cover rounded-lg border border-emerald-700/60 shadow-md shrink-0 bg-slate-900"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = k.paymentScreenshot || '';
                        }}
                      />
                      <div className="min-w-0">
                        <span className="text-emerald-300 font-bold text-xs flex items-center space-x-1 font-mono">
                          <FileImage className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Payment Receipt Attached</span>
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">Tap to inspect & zoom receipt</span>
                      </div>
                    </div>
                    <span className="text-emerald-400 text-xs font-mono font-bold shrink-0">Open →</span>
                  </div>
                )}

                {/* Mobile Action Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => copyToClipboard(k.key, k.id)}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-mono text-xs font-semibold flex items-center justify-center space-x-1"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {onOpenShareModal && (
                    <button
                      onClick={() => onOpenShareModal(k)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl"
                      title="Share Key"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}

                  {onOpenExtendModal && (
                    <button
                      onClick={() => onOpenExtendModal(k)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 rounded-xl"
                      title="Extend / Edit Note"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {k.paymentScreenshot && (
                    <button
                      onClick={() => onOpenProofModal(k)}
                      className="p-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 rounded-xl"
                      title="View Receipt Screenshot"
                    >
                      <FileImage className="w-4 h-4" />
                    </button>
                  )}

                  {k.hwid && (
                    <button
                      onClick={() => onResetHwid(k.id)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 rounded-xl"
                      title="Reset HWID"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteKey(k.id)}
                    className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-400 rounded-xl"
                    title="Delete Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW: High-Density Table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="p-3.5 w-10 text-center">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                  {selectedKeyIds.size === filteredKeys.length && filteredKeys.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              </th>
              <th className="p-3.5">License Key</th>
              <th className="p-3.5">Receipt Proof</th>
              <th className="p-3.5">Status & Life</th>
              <th className="p-3.5">Creator</th>
              <th className="p-3.5">Device HWID</th>
              <th className="p-3.5">Note</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  No matching license keys found.
                </td>
              </tr>
            ) : (
              filteredKeys.map((k) => {
                const isCopied = copiedId === k.id;
                const isSelected = selectedKeyIds.has(k.id);
                const isExpired = k.status === 'expired' || Boolean(k.expiresAt && k.expiresAt !== 'never' && new Date(k.expiresAt) <= new Date());
                const isUnbound = !k.hwid && (k.deviceCount === undefined || k.deviceCount === 0);

                return (
                  <tr
                    key={k.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3.5 text-center">
                      <button onClick={() => toggleSelectKey(k.id)} className="text-slate-400 hover:text-white">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* Key String */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(k.key, k.id)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                          title="Click to copy key"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span className="font-bold text-white font-mono select-all">
                          {k.key}
                        </span>
                        {Boolean(k.isMasterKey) && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                            MASTER
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Prominent Payment Proof / Receipt Column */}
                    <td className="p-3.5">
                      {k.paymentScreenshot ? (
                        <button
                          onClick={() => onOpenProofModal(k)}
                          className="flex items-center space-x-2 group p-1.5 bg-slate-950 hover:bg-slate-800/90 border border-emerald-800/60 rounded-xl transition shadow-sm"
                          title="Click to view full receipt screenshot"
                        >
                          <img
                            src={getReceiptImageUrl(k.paymentScreenshot)}
                            alt="Receipt"
                            className="w-8 h-8 object-cover rounded-lg border border-slate-700 group-hover:scale-105 transition bg-slate-900"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = k.paymentScreenshot || '';
                            }}
                          />
                          <span className="text-[10px] font-bold text-emerald-400 font-mono flex items-center space-x-1 pr-1">
                            <FileImage className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Proof</span>
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px] italic">No Proof</span>
                      )}
                    </td>

                    {/* Status & Expiry Bar */}
                    <td className="p-3.5 min-w-[140px]">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isExpired ? 'bg-rose-400' : isUnbound ? 'bg-emerald-400' : 'bg-cyan-400'
                            }`}
                          />
                          <span className="text-[11px] font-bold text-slate-300 font-mono">
                            {isExpired ? 'Expired' : k.duration || 'Active'}
                          </span>
                        </div>
                        <ExpirationProgressBar createdAt={k.createdAt} expiresAt={k.expiresAt} />
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="p-3.5 text-slate-300">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                        @{k.createdByUsername || 'System'}
                      </span>
                    </td>

                    {/* HWID */}
                    <td className="p-3.5">
                      {k.hwid ? (
                        <div className="flex items-center space-x-1 text-slate-300 max-w-[160px] truncate" title={k.hwid}>
                          <Smartphone className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{k.hwid}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unbound</span>
                      )}
                    </td>

                    {/* Note */}
                    <td className="p-3.5 text-slate-400 max-w-[140px] truncate">
                      {k.note ? (
                        <span title={k.note}>{k.note}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {onOpenShareModal && (
                          <button
                            onClick={() => onOpenShareModal(k)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                            title="Share formatted card"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onOpenExtendModal && (
                          <button
                            onClick={() => onOpenExtendModal(k)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                            title="Extend / Edit Note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {k.paymentScreenshot && (
                          <button
                            onClick={() => onOpenProofModal(k)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-slate-800 transition"
                            title="View Payment Proof"
                          >
                            <FileImage className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {k.hwid && (
                          <button
                            onClick={() => onResetHwid(k.id)}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-slate-800 transition"
                            title="Reset HWID"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteKey(k.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-slate-800 transition"
                          title="Delete Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
  );
};
