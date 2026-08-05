"use client";

import React, { useState, useMemo } from 'react';
import { X, Coins, Key, Search, Check, Copy, UserCheck } from 'lucide-react';
import { UserItem, KeyItem } from '@/types/key';
import { SalesChart } from '@/components/SalesChart';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';

export interface ResellerDashboardModalProps {
  isOpen: boolean;
  reseller: UserItem | null;
  keys: KeyItem[];
  onClose: () => void;
  onOpenManageTokens: (reseller: UserItem) => void;
}

export const ResellerDashboardModal: React.FC<ResellerDashboardModalProps> = ({
  isOpen,
  reseller,
  keys,
  onClose,
  onOpenManageTokens,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [selectedScreenshotKey, setSelectedScreenshotKey] = useState<KeyItem | null>(null);

  const resellerKeys = useMemo(() => {
    if (!reseller) return [];
    return keys.filter(
      (k) => k.createdByUsername?.toLowerCase() === reseller.username.toLowerCase()
    );
  }, [keys, reseller]);

  const filteredKeys = useMemo(() => {
    return resellerKeys.filter(
      (k) =>
        k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (k.note && k.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (k.hwid && k.hwid.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [resellerKeys, searchQuery]);

  if (!isOpen || !reseller) return null;

  const totalTokensSpent = resellerKeys.reduce((acc, k) => acc + (k.costTokens || 0), 0);
  const activeKeysCount = resellerKeys.filter((k) => k.status === 'active').length;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl glass-card rounded-3xl p-6 sm:p-8 border border-purple-500/40 shadow-2xl glow-purple max-h-[90vh] flex flex-col overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-10 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-900 border border-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Reseller Profile Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shadow-glow-purple">
                {reseller.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-extrabold text-white">{reseller.username}</h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800 rounded-md uppercase font-mono">
                    {reseller.role}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-md uppercase font-mono ${
                      reseller.isBlocked === 1
                        ? 'badge-rose'
                        : 'badge-emerald'
                    }`}
                  >
                    {reseller.isBlocked === 1 ? 'BLOCKED' : 'ACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Created by: <span className="text-purple-300 font-bold">{reseller.createdBy || 'System / Owner'}</span> • Joined: {new Date(reseller.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  onClose();
                  onOpenManageTokens(reseller);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow-glow-amber transition"
              >
                <Coins className="w-4 h-4" />
                <span>Manage Tokens</span>
              </button>
            </div>
          </div>

          {/* Reseller Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 glow-amber">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Token Balance</span>
              <p className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{reseller.tokens ?? 0}</p>
            </div>

            <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 glow-purple">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Keys Issued</span>
              <p className="text-2xl font-extrabold text-purple-300 font-mono mt-1">{resellerKeys.length}</p>
            </div>

            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 glow-emerald">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Active Valid Licenses</span>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{activeKeysCount}</p>
            </div>

            <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 glow-cyan">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Tokens Spent</span>
              <p className="text-2xl font-extrabold text-cyan-300 font-mono mt-1">{totalTokensSpent}</p>
            </div>
          </div>

          {/* Sales chart for this reseller */}
          <div className="mb-6">
            <SalesChart totalRevenue={totalTokensSpent} totalKeysSold={resellerKeys.length} />
          </div>

          {/* Keys Table for this Reseller */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <Key className="w-4 h-4 text-purple-400" />
                <span>Keys Issued by {reseller.username}</span>
              </h4>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search reseller's keys..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/50">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono sticky top-0">
                  <tr>
                    <th className="p-3">License Key</th>
                    <th className="p-3">Duration & Expiry</th>
                    <th className="p-3">Tokens Spent</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Bound HWID</th>
                    <th className="p-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                        No keys generated by this reseller match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-purple-300 flex items-center space-x-2">
                          <span>{k.key}</span>
                          <button
                            onClick={() => copyToClipboard(k.key, k.id)}
                            className="text-slate-500 hover:text-white"
                          >
                            {copiedKeyId === k.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-200 font-bold block">{k.duration || 'Custom'}</span>
                          {!k.expiresAt || k.expiresAt === 'never' ? (
                            <span className="text-[10px] text-emerald-400 font-semibold block">Never Expires</span>
                          ) : (
                            <span className="text-[10px] text-cyan-300/80 block font-mono">
                              Exp: {new Date(k.expiresAt).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-amber-400 font-bold">{k.costTokens || 0} Tokens</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              k.status === 'active'
                                ? 'badge-emerald'
                                : 'badge-rose'
                            }`}
                          >
                            {k.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{k.hwid || 'Unbound'}</td>
                        <td className="p-3 text-slate-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <PaymentScreenshotModal
        isOpen={!!selectedScreenshotKey}
        keyItem={selectedScreenshotKey}
        onClose={() => setSelectedScreenshotKey(null)}
      />
    </>
  );
};
