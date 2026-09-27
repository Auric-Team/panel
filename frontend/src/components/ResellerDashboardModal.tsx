"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { X, Coins, Key, Search, Check, Copy, User, Calendar, FileImage } from 'lucide-react';
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
  const currentTokens = (reseller?.tokens !== undefined ? reseller.tokens : reseller?.credits) ?? 0;

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="ref-card relative w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden p-6 shadow-2xl space-y-4">
          {/* Header */}
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
                    {reseller.isBlocked === 1 ? 'Blocked' : 'Active'}
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
                    <span>Joined: {new Date(reseller.createdAt).toLocaleDateString()}</span>
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

              <button
                onClick={() => {
                  onClose();
                  onOpenManageTokens(reseller);
                }}
                className="ref-btn ref-btn-primary ref-btn-sm flex items-center space-x-1.5"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Adjust Tokens</span>
              </button>

              <button
                onClick={onClose}
                className="ref-btn-icon text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Dashboard Body */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="ref-card-subtle p-4">
                <span className="text-[10px] text-muted uppercase font-semibold tracking-wider block mb-1">Total Issued Keys</span>
                <span className="font-display text-2xl font-normal text-ink">{totalKeys}</span>
              </div>

              <div className="ref-card-subtle p-4">
                <span className="text-[10px] text-muted uppercase font-semibold tracking-wider block mb-1">Active Licenses</span>
                <span className="font-display text-2xl font-normal text-success">{activeKeys}</span>
              </div>

              <div className="ref-card-subtle p-4">
                <span className="text-[10px] text-muted uppercase font-semibold tracking-wider block mb-1">Expired Licenses</span>
                <span className="font-display text-2xl font-normal text-danger">{expiredKeys}</span>
              </div>

              <div className="ref-card-subtle p-4">
                <span className="text-[10px] text-muted uppercase font-semibold tracking-wider block mb-1">Tokens Consumed</span>
                <span className="font-display text-2xl font-normal text-ink">{totalTokensSpent.toLocaleString()}</span>
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
            <div className="ref-card-subtle p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="font-display text-sm font-normal text-ink">Issued License Keys ({filteredKeys.length})</h4>

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

                  <div className="relative w-48 sm:w-56">
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
                      <th className="p-3">Key</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Tokens</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payment Proof</th>
                      <th className="p-3">HWID Device</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft font-sans text-ink">
                    {filteredKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted">
                          No issued keys found.
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
                          <td className="p-3 font-mono font-semibold text-ink">{k.costTokens || 0}</td>

                          <td className="p-3">
                            <span className={`ref-badge uppercase ${
                              k.status === 'active' ? 'success' : 'danger'
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
                              <span className="text-muted">-</span>
                            )}
                          </td>

                          <td className="p-3 font-mono text-muted text-xs max-w-[110px] truncate">{k.hwid || 'Unbound'}</td>
                          <td className="p-3 font-mono text-muted text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
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
