"use client";

import React, { useState, useMemo } from 'react';
import { KeyItem } from '@/types/key';
import { Search, Filter, Copy, RotateCcw, Trash2, Check, Shield, Cpu, Clock, Calendar, AlertCircle } from 'lucide-react';

interface KeysTableProps {
  keys: KeyItem[];
  onResetHwid: (keyId: string) => Promise<void>;
  onDeleteKey: (keyId: string) => Promise<void>;
}

export const KeysTable: React.FC<KeysTableProps> = ({
  keys,
  onResetHwid,
  onDeleteKey,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Filter keys
  const filteredKeys = useMemo(() => {
    return keys.filter((k) => {
      const matchesSearch =
        k.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (k.hwid && k.hwid.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (k.note && k.note.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || k.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [keys, searchTerm, statusFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleResetHwid = async (id: string) => {
    if (!confirm('Are you sure you want to reset HWID for this key?')) return;
    setLoadingActionId(id + '-reset');
    try {
      await onResetHwid(id);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this key? This action cannot be undone.')) return;
    setLoadingActionId(id + '-delete');
    try {
      await onDeleteKey(id);
    } finally {
      setLoadingActionId(null);
    }
  };

  const getStatusBadge = (status: KeyItem['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Active
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
            Expired
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5" />
            Revoked
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-purple-800/40 bg-axios-card shadow-2xl">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/70" />
          <input
            type="text"
            placeholder="Search key, HWID, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-axios-dark border border-purple-900/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-purple-100 placeholder-purple-900/80 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-purple-400 hidden sm:block" />
          <div className="flex rounded-xl bg-axios-dark p-1 border border-purple-900/60 w-full sm:w-auto">
            {['all', 'active', 'expired', 'revoked'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all flex-1 sm:flex-none ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white shadow-glow-purple'
                    : 'text-purple-300/70 hover:text-purple-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto rounded-xl border border-purple-900/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-axios-dark/80 text-purple-200/70 text-[11px] uppercase tracking-wider font-semibold border-b border-purple-900/50">
              <th className="py-3.5 px-4">Key</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Bound HWID</th>
              <th className="py-3.5 px-4">Expires At</th>
              <th className="py-3.5 px-4">Created</th>
              <th className="py-3.5 px-4">Note / Tag</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-950/60 text-xs font-mono">
            {filteredKeys.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-purple-300/50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-purple-500/40" />
                    <p className="text-sm font-sans">No keys match your criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredKeys.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-purple-950/30 transition-colors duration-150 group"
                >
                  {/* Key */}
                  <td className="py-3.5 px-4 font-semibold text-purple-100">
                    <div className="flex items-center space-x-2">
                      <span className="truncate max-w-[180px] sm:max-w-[240px] text-purple-200">
                        {item.key}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>

                  {/* HWID */}
                  <td className="py-3.5 px-4">
                    {item.hwid ? (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded bg-axios-dark border border-cyan-900/40 text-cyan-300 text-[11px]"
                        title={item.hwid}
                      >
                        <Cpu className="w-3 h-3 mr-1 text-cyan-400" />
                        {item.hwid.length > 12
                          ? `${item.hwid.slice(0, 6)}...${item.hwid.slice(-6)}`
                          : item.hwid}
                      </span>
                    ) : (
                      <span className="text-purple-400/50 italic text-[11px]">Unbound</span>
                    )}
                  </td>

                  {/* Expires At */}
                  <td className="py-3.5 px-4 text-purple-300/80">
                    {item.expiresAt ? (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>{new Date(item.expiresAt).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Never (Lifetime)</span>
                    )}
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-purple-300/60">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-purple-500/60" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </span>
                  </td>

                  {/* Note */}
                  <td className="py-3.5 px-4 font-sans text-purple-300/90 max-w-[140px] truncate">
                    {item.note || <span className="text-purple-700/60 italic">-</span>}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Copy Key */}
                      <button
                        onClick={() => copyToClipboard(item.key, item.id)}
                        className="p-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-700/60 text-purple-300 hover:text-white transition-all"
                        title="Copy Key"
                      >
                        {copiedKeyId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Reset HWID */}
                      <button
                        onClick={() => handleResetHwid(item.id)}
                        disabled={!item.hwid || loadingActionId === item.id + '-reset'}
                        className="p-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-800/60 text-cyan-300 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-cyan-950/50"
                        title="Reset HWID"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${
                            loadingActionId === item.id + '-reset' ? 'animate-spin' : ''
                          }`}
                        />
                      </button>

                      {/* Delete Key */}
                      <button
                        onClick={() => handleDeleteKey(item.id)}
                        disabled={loadingActionId === item.id + '-delete'}
                        className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-800/60 text-rose-300 hover:text-white transition-all disabled:opacity-30"
                        title="Delete Key"
                      >
                        <Trash2
                          className={`w-3.5 h-3.5 ${
                            loadingActionId === item.id + '-delete' ? 'animate-spin' : ''
                          }`}
                        />
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
