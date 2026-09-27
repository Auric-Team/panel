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
  FileImage,
  Calendar,
  TrendingUp,
  Activity
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
import { UserItem, KeyItem } from '@/types/key';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';
import { useTheme } from '@/components/ui/ThemeContext';

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
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedProofKey, setSelectedProofKey] = useState<KeyItem | null>(null);

  const isDark = theme === 'dark';
  const chartColors = useMemo(() => ({
    accent: isDark ? '#4373ff' : '#243733',
    muted: isDark ? '#a4a8ae' : '#74716c',
    grid: isDark ? 'rgba(155, 177, 198, 0.15)' : 'rgba(90, 83, 75, 0.15)',
  }), [isDark]);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="ref-card relative w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden p-6 shadow-2xl space-y-5">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-soft bg-surface -mx-6 -mt-6 p-6">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-md bg-accent/10 text-accent border border-border-soft flex items-center justify-center font-display font-normal text-lg shrink-0">
                {reseller.username.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h2 className="font-display text-xl font-normal text-ink leading-tight">{reseller.username}</h2>
                  <span className="ref-badge uppercase info">
                    {reseller.role}
                  </span>
                  <span className={`ref-badge uppercase ${
                    reseller.isBlocked === 1 ? 'danger' : 'success'
                  }`}>
                    {reseller.isBlocked === 1 ? 'Suspended' : 'Active'}
                  </span>
                </div>

                <div className="text-xs text-muted mt-1 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-muted" />
                    <span>Created by: <strong className="text-ink font-medium">@{reseller.createdByUsername || reseller.createdBy || 'System'}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-muted" />
                    <span>Member Since: {new Date(reseller.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="ref-card-subtle px-3 py-1.5 flex items-center space-x-2">
                <Coins className="w-4 h-4 text-warning" />
                <span className="font-mono font-semibold text-ink text-sm">
                  {currentTokens.toLocaleString()} Tokens
                </span>
              </div>

              {onOpenManageTokens && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenManageTokens(reseller);
                  }}
                  className="ref-btn ref-btn-primary ref-btn-sm flex items-center space-x-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Token Manager</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="ref-btn-icon text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Reseller Summary Stats Header (4 KPI Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tokens Allocated */}
              <div className="ref-card-subtle p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted uppercase font-semibold tracking-wider">Tokens Allocated</span>
                  <Coins className="w-4 h-4 text-warning" />
                </div>
                <div className="font-display text-2xl font-normal text-ink">{currentTokens.toLocaleString()}</div>
                <p className="text-[10px] text-muted">Available reserve balance</p>
              </div>

              {/* Keys Generated */}
              <div className="ref-card-subtle p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted uppercase font-semibold tracking-wider">Keys Generated</span>
                  <Key className="w-4 h-4 text-accent" />
                </div>
                <div className="font-display text-2xl font-normal text-ink">{totalKeys}</div>
                <p className="text-[10px] text-muted">Total licenses created</p>
              </div>

              {/* Active Licenses */}
              <div className="ref-card-subtle p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted uppercase font-semibold tracking-wider">Active Licenses</span>
                  <ShieldCheck className="w-4 h-4 text-success" />
                </div>
                <div className="font-display text-2xl font-normal text-success">{activeKeys}</div>
                <p className="text-[10px] text-muted">{expiredKeys} expired licenses</p>
              </div>

              {/* Total Spend */}
              <div className="ref-card-subtle p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted uppercase font-semibold tracking-wider">Total Spend</span>
                  <TrendingUp className="w-4 h-4 text-muted" />
                </div>
                <div className="font-display text-2xl font-normal text-ink">{totalTokensSpent.toLocaleString()}</div>
                <p className="text-[10px] text-muted">Tokens consumed for keys</p>
              </div>
            </div>

            {/* 14-Day Sales & Token Usage Chart */}
            <div className="ref-card-subtle p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-soft">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-accent" />
                  <div>
                    <h3 className="font-display text-sm font-normal text-ink">
                      14-Day Sales & Token Usage Analytics
                    </h3>
                    <p className="text-xs text-muted">
                      Telemetry for @{reseller.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                    <span className="text-muted">Keys Issued</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                    <span className="text-muted">Token Volume</span>
                  </div>
                </div>
              </div>

              {/* Recharts Area Chart Container */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsKeyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.accent} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={chartColors.accent} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="analyticsTokenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.muted} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={chartColors.muted} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      stroke={chartColors.muted}
                      fontSize={10}
                      tickFormatter={(val) => val.slice(5)}
                      tickLine={false}
                    />
                    <YAxis stroke={chartColors.muted} fontSize={10} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="ref-card p-3 shadow-lg font-mono text-xs space-y-1">
                              <div className="text-muted font-medium">{label}</div>
                              <div className="text-ink font-semibold flex items-center justify-between gap-3">
                                <span className="text-accent">Keys Issued:</span>
                                <span>{payload[0]?.value}</span>
                              </div>
                              <div className="text-ink font-semibold flex items-center justify-between gap-3">
                                <span className="text-muted">Token Volume:</span>
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
                      stroke={chartColors.accent}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#analyticsKeyGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenueTokens"
                      stroke={chartColors.muted}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#analyticsTokenGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Table of Issued Keys by this Reseller */}
            <div className="ref-card-subtle p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-accent" />
                  <h4 className="font-display text-sm font-normal text-ink">
                    Issued License Key Telemetry ({filteredKeys.length})
                  </h4>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="ref-input text-xs py-1.5 px-2.5"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </select>

                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search key, note, HWID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ref-input pl-8 pr-3 py-1.5 text-xs w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border border-border-soft">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-muted uppercase text-[10px] tracking-wider border-b border-border-soft font-semibold">
                    <tr>
                      <th className="p-3">License Key</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Tokens</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Proof</th>
                      <th className="p-3">Bound HWID</th>
                      <th className="p-3">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft font-sans text-ink">
                    {filteredKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted">
                          No license keys match the specified filters.
                        </td>
                      </tr>
                    ) : (
                      filteredKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-surface-hover transition">
                          <td className="p-3 font-mono font-medium text-ink">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="truncate max-w-[160px]" title={k.key}>{k.key}</span>
                                <button
                                  onClick={() => copyToClipboard(k.key, k.id)}
                                  className="ref-btn-icon w-5 h-5 text-muted hover:text-ink"
                                >
                                  {copiedId === k.id ? (
                                    <Check className="w-3 h-3 text-success" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              {k.note ? (
                                <div className="text-[10px] text-muted truncate max-w-[160px]" title={k.note}>
                                  Note: {k.note}
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td className="p-3 text-muted">{k.duration || 'Custom'}</td>

                          <td className="p-3 font-mono font-semibold text-ink">
                            <div className="flex items-center space-x-1">
                              <Coins className="w-3 h-3 text-warning" />
                              <span>{k.costTokens || 0}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className={`ref-badge uppercase ${
                              k.status === 'active'
                                ? 'success'
                                : k.status === 'expired'
                                ? 'danger'
                                : 'warning'
                            }`}>
                              {k.status}
                            </span>
                          </td>

                          <td className="p-3">
                            {k.paymentScreenshot ? (
                              <button
                                onClick={() => setSelectedProofKey(k)}
                                className="ref-btn ref-btn-ghost ref-btn-sm flex items-center space-x-1 py-0.5 px-2 text-[11px]"
                              >
                                <FileImage className="w-3 h-3 text-accent" />
                                <span>Proof</span>
                              </button>
                            ) : (
                              <span className="text-muted text-xs">-</span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-muted text-xs max-w-[120px] truncate" title={k.hwid || 'Unbound'}>
                            {k.hwid ? (
                              <span className="text-ink">{k.hwid}</span>
                            ) : (
                              <span className="text-muted italic">Unbound</span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-muted text-xs">
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
