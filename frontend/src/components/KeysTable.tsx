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
  Share2,
  Edit3,
  CheckSquare,
  Square,
  Smartphone,
  UploadCloud,
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
  onUpdateReceipt?: (keyId: string, base64: string) => Promise<void>;
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
  onUpdateReceipt,
}) => {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'receipts' | 'expired' | 'unbound' | 'master'>('all');
  const [resellerFilter, setResellerFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set());
  const [selectedKeyForUpload, setSelectedKeyForUpload] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState<boolean>(false);

  const tableFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTableFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedKeyForUpload || !onUpdateReceipt) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setIsUploadingReceipt(true);
        try {
          await onUpdateReceipt(selectedKeyForUpload, base64);
        } finally {
          setIsUploadingReceipt(false);
          setSelectedKeyForUpload(null);
          if (tableFileInputRef.current) tableFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

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
    <div className="ref-card p-4 sm:p-6 space-y-4 font-sans text-xs">
      {/* Hidden File Input for Key-Level Upload */}
      <input
        ref={tableFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleTableFileChange}
        className="hidden"
      />

      {/* Controls & Multi-Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-soft">
        <div className="flex items-center space-x-3">
          <h3 className="font-display text-base sm:text-lg font-normal text-ink tracking-tight">License Keys Registry</h3>
          <span className="ref-badge text-[10px] font-mono">
            {filteredKeys.length} {filteredKeys.length === 1 ? 'Key' : 'Keys'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="ref-tab-list overflow-x-auto">
            {(['all', 'active', 'receipts', 'expired', 'unbound', 'master'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`ref-tab-btn shrink-0 py-1 px-2.5 text-[10px] uppercase font-mono ${
                  statusFilter === st ? 'active' : ''
                }`}
              >
                <span>{st === 'unbound' ? 'Fresh/Unbound' : st === 'receipts' ? 'With Receipts' : st}</span>
                {st === 'receipts' && keysWithReceiptsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-success/20 text-success text-[9px]">
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
              className="ref-input text-xs font-mono h-8 px-2 cursor-pointer"
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
            className="ref-btn ref-btn-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Key, HWID, Reseller @Username, or Customer Note..."
          className="ref-input w-full pl-10 text-xs font-mono"
        />
      </div>

      {/* Floating Batch Actions Toolbar */}
      {selectedKeyIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-surface border border-border rounded-md shadow-sm">
          <div className="flex items-center space-x-2 font-mono">
            <span className="ref-badge info font-bold text-xs">
              {selectedKeyIds.size} Selected
            </span>
            <button
              onClick={() => setSelectedKeyIds(new Set())}
              className="text-muted hover:text-ink text-xs underline font-sans"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono">
            <button
              onClick={copySelectedKeys}
              className="ref-btn ref-btn-sm"
            >
              <Copy className="w-3 h-3 text-muted" />
              <span>Copy</span>
            </button>

            {onBulkResetHwid && (
              <button
                onClick={() => onBulkResetHwid(Array.from(selectedKeyIds))}
                className="ref-btn ref-btn-sm text-warning"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset HWID</span>
              </button>
            )}

            {onBulkExtendKeys && (
              <button
                onClick={() => onBulkExtendKeys(Array.from(selectedKeyIds), 7)}
                className="ref-btn ref-btn-sm"
              >
                <Clock className="w-3 h-3 text-muted" />
                <span>+7 Days</span>
              </button>
            )}

            {onBulkDeleteKeys && (
              <button
                onClick={() => onBulkDeleteKeys(Array.from(selectedKeyIds))}
                className="ref-btn ref-btn-sm ref-btn-danger"
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
          <div className="text-center py-12 text-muted font-sans">
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
                className={`p-3.5 bg-surface rounded-md border transition-colors space-y-3 ${
                  isSelected ? 'border-accent bg-surface-hover' : 'border-border-soft hover:border-border'
                }`}
              >
                {/* Top Row: Key & Selection Checkbox */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <button
                      onClick={() => toggleSelectKey(k.id)}
                      className="text-muted hover:text-ink"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-muted" />
                      )}
                    </button>
                    <span className="font-mono font-bold text-ink text-xs select-all truncate">
                      {k.key}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span
                      className={`ref-badge text-[9px] font-mono ${
                        isExpired
                          ? 'danger'
                          : isUnbound
                          ? 'success'
                          : 'info'
                      }`}
                    >
                      {isExpired ? 'Expired' : isUnbound ? 'Fresh' : 'Bound'}
                    </span>
                  </div>
                </div>

                {/* Expiration Progress Bar */}
                <ExpirationProgressBar createdAt={k.createdAt} expiresAt={k.expiresAt} />

                {/* Metadata details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted pt-1">
                  <div>
                    <span className="text-[9px] uppercase block font-sans text-muted">Duration</span>
                    <span className="text-ink">{k.duration || 'Custom'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase block font-sans text-muted">Creator</span>
                    <span className="text-ink">@{k.createdByUsername || 'System'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] uppercase block font-sans text-muted">Bound Device HWID</span>
                    <span className="text-ink truncate block">
                      {k.hwid ? k.hwid : <span className="text-muted italic">No Device Bound (Fresh)</span>}
                    </span>
                  </div>
                  {k.note && (
                    <div className="col-span-2 bg-surface-solid p-2 rounded-sm border border-border-soft">
                      <span className="text-[9px] text-muted uppercase block font-sans">Customer Note:</span>
                      <span className="text-ink font-sans">{k.note}</span>
                    </div>
                  )}
                </div>

                {/* Payment Receipt Proof Card (Mobile) */}
                {k.paymentScreenshot && (
                  <div
                    onClick={() => onOpenProofModal(k)}
                    className="flex items-center justify-between p-2.5 bg-surface-solid hover:bg-surface-hover border border-success/30 rounded-sm cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={getReceiptImageUrl(k.paymentScreenshot)}
                        alt="Payment Receipt"
                        className="w-10 h-10 object-cover rounded-sm border border-border-soft shrink-0 bg-surface"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.triedFallback && k.paymentScreenshot) {
                            target.dataset.triedFallback = 'true';
                            target.src = `https://api.axioshacks.com${k.paymentScreenshot.startsWith('/') ? k.paymentScreenshot : `/${k.paymentScreenshot}`}`;
                          }
                        }}
                      />
                      <div className="min-w-0">
                        <span className="text-success font-medium text-xs flex items-center space-x-1 font-sans">
                          <FileImage className="w-3.5 h-3.5" />
                          <span>Payment Receipt Attached</span>
                        </span>
                        <span className="text-[10px] text-muted block truncate font-sans">Tap to inspect &amp; zoom receipt</span>
                      </div>
                    </div>
                    <span className="text-accent text-xs font-mono font-medium shrink-0">Open &rarr;</span>
                  </div>
                )}

                {/* Mobile Action Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border-soft">
                  <button
                    onClick={() => copyToClipboard(k.key, k.id)}
                    className="ref-btn ref-btn-sm flex-1"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {onOpenShareModal && (
                    <button
                      onClick={() => onOpenShareModal(k)}
                      className="ref-btn-icon w-8 h-8"
                      title="Share Key"
                    >
                      <Share2 className="w-4 h-4 text-muted" />
                    </button>
                  )}

                  {onOpenExtendModal && (
                    <button
                      onClick={() => onOpenExtendModal(k)}
                      className="ref-btn-icon w-8 h-8"
                      title="Extend / Edit Note"
                    >
                      <Edit3 className="w-4 h-4 text-muted" />
                    </button>
                  )}

                  {k.paymentScreenshot && (
                    <button
                      onClick={() => onOpenProofModal(k)}
                      className="ref-btn-icon w-8 h-8 text-success"
                      title="View Receipt Screenshot"
                    >
                      <FileImage className="w-4 h-4" />
                    </button>
                  )}

                  {k.hwid && (
                    <button
                      onClick={() => onResetHwid(k.id)}
                      className="ref-btn-icon w-8 h-8 text-warning"
                      title="Reset HWID"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteKey(k.id)}
                    className="ref-btn-icon w-8 h-8 text-danger hover:border-danger/30"
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
      <div className="hidden md:block overflow-x-auto rounded-md border border-border-soft">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-surface border-b border-border-soft text-[10px] text-muted font-sans font-medium uppercase tracking-wider">
              <th className="p-3 w-10 text-center">
                <button onClick={toggleSelectAll} className="text-muted hover:text-ink">
                  {selectedKeyIds.size === filteredKeys.length && filteredKeys.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-accent" />
                  ) : (
                    <Square className="w-4 h-4 text-muted" />
                  )}
                </button>
              </th>
              <th className="p-3">License Key</th>
              <th className="p-3">Receipt Proof</th>
              <th className="p-3">Status &amp; Life</th>
              <th className="p-3">Creator</th>
              <th className="p-3">Device HWID</th>
              <th className="p-3">Note</th>
              <th className="p-3 text-right font-sans">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft bg-surface-solid">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted font-sans">
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
                    className={`hover:bg-surface-hover transition-colors ${
                      isSelected ? 'bg-surface-hover' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <button onClick={() => toggleSelectKey(k.id)} className="text-muted hover:text-ink">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-accent" />
                        ) : (
                          <Square className="w-4 h-4 text-muted" />
                        )}
                      </button>
                    </td>

                    {/* Key String */}
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(k.key, k.id)}
                          className="ref-btn-icon w-6 h-6"
                          title="Click to copy key"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-muted" />}
                        </button>
                        <span className="font-bold text-ink font-mono select-all">
                          {k.key}
                        </span>
                        {Boolean(k.isMasterKey) && (
                          <span className="ref-badge warning text-[9px]">
                            MASTER
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Prominent Payment Proof / Receipt Column */}
                    <td className="p-3">
                      {k.paymentScreenshot ? (
                        <button
                          onClick={() => onOpenProofModal(k)}
                          className="flex items-center space-x-2 group px-2 py-1 bg-surface hover:bg-surface-hover border border-success/30 rounded-sm transition shadow-sm cursor-pointer"
                          title="Click to view full receipt screenshot or replace"
                        >
                          <div className="w-7 h-7 rounded-sm overflow-hidden border border-border-soft bg-surface shrink-0 flex items-center justify-center">
                            <img
                              src={getReceiptImageUrl(k.paymentScreenshot)}
                              alt="Receipt"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-150"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.triedFallback && k.paymentScreenshot) {
                                  target.dataset.triedFallback = 'true';
                                  target.src = `https://api.axioshacks.com${k.paymentScreenshot.startsWith('/') ? k.paymentScreenshot : `/${k.paymentScreenshot}`}`;
                                }
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-success font-sans flex items-center space-x-1 pr-1">
                            <FileImage className="w-3.5 h-3.5" />
                            <span>Proof</span>
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedKeyForUpload(k.id);
                            tableFileInputRef.current?.click();
                          }}
                          disabled={isUploadingReceipt}
                          className="flex items-center space-x-1 px-2 py-1 bg-surface hover:bg-surface-hover border border-dashed border-border-soft rounded-sm text-[10px] text-muted hover:text-ink transition cursor-pointer disabled:opacity-50"
                          title="Click to upload proof for this key"
                        >
                          <UploadCloud className="w-3 h-3 text-muted" />
                          <span>+ Add Proof</span>
                        </button>
                      )}
                    </td>

                    {/* Status & Expiry Bar */}
                    <td className="p-3 min-w-[130px]">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isExpired ? 'bg-danger' : isUnbound ? 'bg-success' : 'bg-info'
                            }`}
                          />
                          <span className="text-[11px] font-medium text-ink font-sans">
                            {isExpired ? 'Expired' : k.duration || 'Active'}
                          </span>
                        </div>
                        <ExpirationProgressBar createdAt={k.createdAt} expiresAt={k.expiresAt} />
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="p-3 text-ink">
                      <span className="px-2 py-0.5 rounded-sm bg-surface border border-border-soft text-[11px]">
                        @{k.createdByUsername || 'System'}
                      </span>
                    </td>

                    {/* HWID */}
                    <td className="p-3">
                      {k.hwid ? (
                        <div className="flex items-center space-x-1 text-ink max-w-[150px] truncate" title={k.hwid}>
                          <Smartphone className="w-3 h-3 text-muted shrink-0" />
                          <span className="truncate">{k.hwid}</span>
                        </div>
                      ) : (
                        <span className="text-muted italic text-[11px] font-sans">Unbound</span>
                      )}
                    </td>

                    {/* Note */}
                    <td className="p-3 text-muted max-w-[130px] truncate font-sans">
                      {k.note ? (
                        <span title={k.note}>{k.note}</span>
                      ) : (
                        <span className="text-muted/60">-</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {onOpenShareModal && (
                          <button
                            onClick={() => onOpenShareModal(k)}
                            className="ref-btn-icon w-7 h-7 text-muted hover:text-ink"
                            title="Share formatted card"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onOpenExtendModal && (
                          <button
                            onClick={() => onOpenExtendModal(k)}
                            className="ref-btn-icon w-7 h-7 text-muted hover:text-ink"
                            title="Extend / Edit Note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {k.paymentScreenshot && (
                          <button
                            onClick={() => onOpenProofModal(k)}
                            className="ref-btn-icon w-7 h-7 text-success"
                            title="View Payment Proof"
                          >
                            <FileImage className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {k.hwid && (
                          <button
                            onClick={() => onResetHwid(k.id)}
                            className="ref-btn-icon w-7 h-7 text-warning"
                            title="Reset HWID"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteKey(k.id)}
                          className="ref-btn-icon w-7 h-7 text-danger hover:border-danger/30"
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
