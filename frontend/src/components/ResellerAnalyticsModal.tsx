"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Coins,
  Key,
  Search,
  Check,
  Copy,
  User,
  ShieldCheck,
  Clock,
  FileImage,
  Sparkles,
  Calendar,
  TrendingUp,
  Activity,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { UserItem, KeyItem, SalesDataPoint } from '@/types/key';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';

interface ResellerAnalyticsModalProps {
  isOpen: boolean;
  reseller: UserItem | null;
  keys: KeyItem[];
  onClose: () => void;
  onOpenManageTokens?: (reseller: UserItem) => void;
}

export const ResellerAnalyticsModal: React.FC<ResellerAnalyticsModalProps> = ({
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
  const currentTokens = (reseller?.tokens !== undefined ? reseller.tokens : reseller?.credits) ?? 0;

  // Generate 14-day telemetry series for Recharts
  const chartData = useMemo(() => {
    const last14Days: { date: string; salesCount: number; revenueTokens: number }[] = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last14Days.push({ date: dateStr, salesCount: 0, revenueTokens: 0 });
    }

    resellerKeys.forEach((k) => {
      if (!k.createdAt) return;
      const d = new Date(k.createdAt);
      if (isNaN(d.getTime())) return;
      const dateStr = d.toISOString().split('T')[0];
      const match = last14Days.find((item) => item.date === dateStr);
      if (match) {
        match.salesCount += 1;
        match.revenueTokens += k.costTokens || 0;
      }
    });

    return last14Days;
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
        <div className="relative w-full max-w-5xl bg-slate-900/95 border border-slate-800/90 rounded-3xl p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden space-y-5 backdrop-blur-2xl">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 bg-slate-950/60 -mx-6 -mt-6 p-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-cyan-400 font-extrabold text-xl">
                  {reseller.username.slice(0, 2).toUpperCase()}
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">{reseller.username}</h2>
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                    {reseller.role}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-bold ${
                    reseller.isBlocked === 1
                      ? 'bg-rose-950/90 text-rose-400 border border-rose-800 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                      : 'bg-emerald-950/90 text-emerald-400 border border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  }`}>
                    {reseller.isBlocked === 1 ? 'Suspended' : 'Active'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Created by: <strong className="text-cyan-300">@{reseller.createdByUsername || reseller.createdBy || 'System'}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Member Since: {new Date(reseller.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl flex items-center space-x-2 shadow-inner">
                <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-amber-400 font-extrabold text-base">
                  {currentTokens.toLocaleString()} Tokens
                </span>
              </div>

              {onOpenManageTokens && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenManageTokens(reseller);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-2xl transition flex items-center space-x-2 shadow-lg shadow-amber-600/20 text-xs"
                >
                  <Coins className="w-4 h-4" />
                  <span>Token Manager</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Reseller Summary Stats Header (4 Glowing KPI Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tokens Allocated */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 relative overflow-hidden group hover:border-amber-500/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Tokens Allocated</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-400">{currentTokens.toLocaleString()}</div>
                <p className="text-[10px] text-slate-500">Available reserve balance</p>
              </div>

              {/* Keys Generated */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 relative overflow-hidden group hover:border-cyan-500/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Keys Generated</span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-cyan-400">{totalKeys}</div>
                <p className="text-[10px] text-slate-500">Total licenses created</p>
              </div>

              {/* Active Licenses */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 relative overflow-hidden group hover:border-emerald-500/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Active Licenses</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-400">{activeKeys}</div>
                <p className="text-[10px] text-slate-500">{expiredKeys} expired licenses</p>
              </div>

              {/* Total Spend */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 relative overflow-hidden group hover:border-purple-500/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Total Spend</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-purple-400">{totalTokensSpent.toLocaleString()}</div>
                <p className="text-[10px] text-slate-500">Tokens consumed for keys</p>
              </div>
            </div>

            {/* 14-Day Sales & Token Usage Chart powered by Recharts with Cyan & Purple Glowing Gradients */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 shadow-inner space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      14-Day Sales & Token Usage Analytics
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Performance timeline for @{reseller.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 rounded-md bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                    <span className="text-slate-300">Keys Issued</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 rounded-md bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                    <span className="text-slate-300">Token Volume</span>
                  </div>
                </div>
              </div>

              {/* Recharts Area Chart Container */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cyanGlowingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="purpleGlowingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={10}
                      tickFormatter={(val) => val.slice(5)}
                      tickLine={false}
                    />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-xl shadow-xl font-mono text-[11px] space-y-1">
                              <div className="text-slate-400 font-semibold">{label}</div>
                              <div className="text-cyan-400 font-extrabold flex items-center space-x-1">
                                <span>Keys Issued:</span>
                                <span>{payload[0]?.value}</span>
                              </div>
                              <div className="text-purple-400 font-extrabold flex items-center space-x-1">
                                <span>Token Volume:</span>
                                <span>{payload[1]?.value} Tokens</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="salesCount"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#cyanGlowingGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenueTokens"
                      stroke="#a855f7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#purpleGlowingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Table of Issued Keys by this Reseller */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Issued License Key Telemetry ({filteredKeys.length})
                  </h4>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-cyan-500/80 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </select>

                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search key, note, HWID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500/80"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-semibold tracking-wider">
                    <tr>
                      <th className="p-3">License Key</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Tokens</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Proof Lightbox</th>
                      <th className="p-3">Bound HWID</th>
                      <th className="p-3">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {filteredKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                          No license keys match the specified filters.
                        </td>
                      </tr>
                    ) : (
                      filteredKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-900/70 transition">
                          <td className="p-3 font-bold text-white">
                            <div className="space-y-1">
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
                              {k.note ? (
                                <div className="text-[10px] text-cyan-400 truncate max-w-[160px]" title={k.note}>
                                  Note: {k.note}
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-semibold">
                              {k.duration || 'Custom'}
                            </span>
                          </td>

                          <td className="p-3 font-bold text-amber-400">
                            <div className="flex items-center space-x-1">
                              <Coins className="w-3 h-3 text-amber-400" />
                              <span>{k.costTokens || 0}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                              k.status === 'active'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : k.status === 'expired'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-purple-950 text-purple-400 border border-purple-800'
                            }`}>
                              {k.status}
                            </span>
                          </td>

                          <td className="p-3">
                            {k.paymentScreenshot ? (
                              <button
                                onClick={() => setSelectedProofKey(k)}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/80 flex items-center space-x-1.5 shadow-sm transition"
                              >
                                <FileImage className="w-3 h-3 text-cyan-400" />
                                <span>Proof</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-[11px]">-</span>
                            )}
                          </td>

                          <td className="p-3 text-slate-400 max-w-[120px] truncate" title={k.hwid || 'Unbound'}>
                            {k.hwid ? (
                              <span className="font-mono text-slate-300">{k.hwid}</span>
                            ) : (
                              <span className="text-slate-500 italic">Unbound</span>
                            )}
                          </td>

                          <td className="p-3 text-slate-400 text-[11px]">
                            {new Date(k.createdAt).toLocaleDateString()} {new Date(k.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
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
