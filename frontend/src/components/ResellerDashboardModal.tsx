"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { X, Coins, Key, Search, Check, Copy, User, ShieldCheck, Clock, FileImage, Sparkles, Calendar } from 'lucide-react';
import { UserItem, KeyItem, SalesDataPoint } from '@/types/key';
import { SalesChart } from '@/components/SalesChart';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';

interface ResellerDashboardModalProps {
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedProofKey, setSelectedProofKey] = useState<KeyItem | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const resellerKeys = useMemo(() => {
    if (!reseller) return [];
    return keys.filter(
      (k) => k.createdByUsername?.toLowerCase() === reseller.username.toLowerCase()
    );
  }, [keys, reseller]);

  const filteredKeys = useMemo(() => {
    return resellerKeys.filter((k) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        k.key.toLowerCase().includes(q) ||
        (k.note && k.note.toLowerCase().includes(q)) ||
        (k.hwid && k.hwid.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [resellerKeys, searchQuery, statusFilter]);

  const totalKeys = resellerKeys.length;
  const activeKeys = resellerKeys.filter((k) => k.status === 'active').length;
  const expiredKeys = resellerKeys.filter((k) => k.status === 'expired').length;
  const totalTokensSpent = resellerKeys.reduce((acc, k) => acc + (k.costTokens || 0), 0);

  const salesChartData = useMemo<SalesDataPoint[]>(() => {
    if (resellerKeys.length === 0) return [];
    const grouped: { [dateStr: string]: { salesCount: number; revenueTokens: number } } = {};

    resellerKeys.forEach((k) => {
      const d = new Date(k.createdAt);
      if (isNaN(d.getTime())) return;
      const dateStr = d.toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = { salesCount: 0, revenueTokens: 0 };
      }
      grouped[dateStr].salesCount += 1;
      grouped[dateStr].revenueTokens += k.costTokens || 0;
    });

    return Object.entries(grouped).map(([date, val]) => ({
      date,
      salesCount: val.salesCount,
      revenueTokens: val.revenueTokens,
    }));
  }, [resellerKeys]);

  if (!isOpen || !reseller) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200 font-mono text-xs">
        <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800/90 rounded-3xl p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 bg-slate-950/50 -mx-6 -mt-6 p-6">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-cyan-400 font-extrabold text-xl shadow-md">
                {reseller.username.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h2 className="text-xl font-bold text-white tracking-tight">{reseller.username}</h2>
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {reseller.role}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-bold ${
                    reseller.isBlocked === 1 ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {reseller.isBlocked === 1 ? 'Blocked' : 'Active'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Created by: <strong className="text-slate-200">{reseller.createdBy || 'System'}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Joined: {new Date(reseller.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-2xl flex items-center space-x-2.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-extrabold text-base">
                  {(reseller.tokens !== undefined ? reseller.tokens : reseller.credits) ?? 0} Tokens
                </span>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenManageTokens(reseller);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-2xl transition flex items-center space-x-1.5 shadow-md"
              >
                <Coins className="w-4 h-4" />
                <span>Adjust Tokens</span>
              </button>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Dashboard Body */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Total Issued Keys</span>
                <span className="text-2xl font-extrabold text-white">{totalKeys}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Active Licenses</span>
                <span className="text-2xl font-extrabold text-emerald-400">{activeKeys}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Expired Licenses</span>
                <span className="text-2xl font-extrabold text-rose-400">{expiredKeys}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Total Tokens Consumed</span>
                <span className="text-2xl font-extrabold text-amber-400">{totalTokensSpent.toLocaleString()}</span>
              </div>
            </div>

            {/* Sales Chart */}
            <SalesChart
              data={salesChartData}
              totalRevenue={totalTokensSpent}
              totalKeysSold={totalKeys}
              title={`Reseller Sales Trajectory: ${reseller.username}`}
              subtitle="14-Day key issuance & token usage"
            />

            {/* Issued Keys History Table */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-xs font-bold text-white">Issued License Keys ({filteredKeys.length})</h4>

                <div className="flex items-center space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </select>

                  <div className="relative w-48 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search key, note, HWID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Key</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Tokens</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payment Proof</th>
                      <th className="p-3">HWID Device</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                          No issued keys found.
                        </td>
                      </tr>
                    ) : (
                      filteredKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-900/60 transition">
                          <td className="p-3 font-bold text-white">
                            <div className="flex items-center space-x-1.5">
                              <span className="truncate max-w-[160px]" title={k.key}>{k.key}</span>
                              <button
                                onClick={() => copyToClipboard(k.key, k.id)}
                                className="text-slate-400 hover:text-white p-0.5 rounded transition"
                              >
                                {copiedId === k.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="p-3">{k.duration || 'Custom'}</td>
                          <td className="p-3 font-bold text-amber-400">{k.costTokens || 0}</td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              k.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {k.status}
                            </span>
                          </td>

                          <td className="p-3">
                            {k.paymentScreenshot ? (
                              <button
                                onClick={() => setSelectedProofKey(k)}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-800 text-cyan-300 border border-slate-700 hover:bg-slate-700 flex items-center space-x-1 shadow-sm"
                              >
                                <FileImage className="w-3 h-3 text-cyan-400" />
                                <span>Proof</span>
                              </button>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>

                          <td className="p-3 text-slate-400 max-w-[110px] truncate">{k.hwid || 'Unbound'}</td>
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
      </div>

      <PaymentScreenshotModal
        isOpen={!!selectedProofKey}
        keyItem={selectedProofKey}
        onClose={() => setSelectedProofKey(null)}
      />
    </>
  );
};
