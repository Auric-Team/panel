"use client";

import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, RotateCcw, Trash2, FileImage, ShieldCheck, Clock, Sparkles, Download, Filter } from 'lucide-react';
import { KeyItem } from '@/types/key';

interface KeysTableProps {
  keys: KeyItem[];
  onResetHwid: (id: string) => void;
  onDeleteKey: (id: string) => void;
  onOpenProofModal: (key: KeyItem) => void;
}

export const KeysTable: React.FC<KeysTableProps> = ({
  keys,
  onResetHwid,
  onDeleteKey,
  onOpenProofModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked' | 'master'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        k.key.toLowerCase().includes(q) ||
        (k.createdByUsername && k.createdByUsername.toLowerCase().includes(q)) ||
        (k.note && k.note.toLowerCase().includes(q)) ||
        (k.hwid && k.hwid.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = k.status === 'active';
      else if (statusFilter === 'expired') matchesStatus = k.status === 'expired';
      else if (statusFilter === 'revoked') matchesStatus = k.status === 'revoked';
      else if (statusFilter === 'master') matchesStatus = Boolean(k.isMasterKey);

      return matchesSearch && matchesStatus;
    });
  }, [keys, searchQuery, statusFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToCSV = () => {
    if (filteredKeys.length === 0) return;
    const headers = ['Key', 'Creator', 'Status', 'Duration', 'ExpiresAt', 'BoundHWID', 'CostTokens', 'Note'];
    const rows = filteredKeys.map((k) => [
      k.key,
      k.createdByUsername || 'System',
      k.status,
      k.duration || 'Custom',
      k.expiresAt || 'Never',
      k.hwid || 'Unbound',
      k.costTokens || 0,
      `"${(k.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `axios-keys-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4 font-mono text-xs backdrop-blur-md">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-bold text-white tracking-wide">License Keys Registry</h3>
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800 font-bold text-xs">
            {filteredKeys.length} Keys
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            {(['all', 'active', 'expired', 'revoked', 'master'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-bold transition ${
                  statusFilter === st
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search key, HWID, creator, note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono outline-none focus:border-slate-700 transition"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportToCSV}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
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
              filteredKeys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-800/40 transition">
                  {/* Key String & Copy */}
                  <td className="p-3.5 font-bold text-white">
                    <div className="flex items-center space-x-2">
                      {k.isMasterKey ? (
                        <span className="p-1 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/60" title="Master Key">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                      <span className="truncate max-w-[200px]" title={k.key}>{k.key}</span>
                      <button
                        onClick={() => copyToClipboard(k.key, k.id)}
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

                  {/* Status */}
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                        k.status === 'active'
                          ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800/80'
                          : k.status === 'expired'
                          ? 'bg-amber-950/90 text-amber-400 border border-amber-800/80'
                          : 'bg-rose-950/90 text-rose-400 border border-rose-800/80'
                      }`}
                    >
                      {k.status}
                    </span>
                  </td>

                  {/* Payment Proof */}
                  <td className="p-3.5">
                    {k.paymentScreenshot ? (
                      <button
                        onClick={() => onOpenProofModal(k)}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
