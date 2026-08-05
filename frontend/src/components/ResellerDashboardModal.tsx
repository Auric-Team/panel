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
  Ban,
  FileImage,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { UserItem, KeyItem, SalesDataPoint } from '@/types/key';
import { SalesChart } from '@/components/SalesChart';
import { PaymentScreenshotModal } from '@/components/PaymentScreenshotModal';

export interface ResellerDashboardModalProps {
  isOpen: boolean;
  reseller: UserItem | null;
  keys: KeyItem[];
  onClose: () => void;
  onOpenManageTokens: (reseller: UserItem) => void;
}

const ITEMS_PER_PAGE = 5;

export const ResellerDashboardModal: React.FC<ResellerDashboardModalProps> = ({
  isOpen,
  reseller,
  keys,
  onClose,
  onOpenManageTokens,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [selectedScreenshotKey, setSelectedScreenshotKey] = useState<KeyItem | null>(null);

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset filter & page on modal open or reseller change
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setStatusFilter('all');
      setCurrentPage(1);
    }
  }, [isOpen, reseller]);

  const resellerKeys = useMemo(() => {
    if (!reseller) return [];
    return keys.filter(
      (k) => k.createdByUsername?.toLowerCase() === reseller.username.toLowerCase()
    );
  }, [keys, reseller]);

  // Filter keys by search query & status filter
  const filteredKeys = useMemo(() => {
    return resellerKeys.filter((k) => {
      const matchesSearch =
        k.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (k.note && k.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (k.hwid && k.hwid.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || k.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [resellerKeys, searchQuery, statusFilter]);

  // Reset pagination when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / ITEMS_PER_PAGE));
  const paginatedKeys = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredKeys.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredKeys, currentPage]);

  // Calculate 4 Mini KPI Stats
  const totalKeysCount = resellerKeys.length;
  const activeKeysCount = resellerKeys.filter((k) => k.status === 'active').length;
  const expiredKeysCount = resellerKeys.filter((k) => k.status === 'expired').length;
  const totalTokensSpent = resellerKeys.reduce((acc, k) => acc + (k.costTokens || 0), 0);

  // Compute Sales Trajectory Data for Chart
  const salesChartData = useMemo<SalesDataPoint[]>(() => {
    if (resellerKeys.length === 0) return [];

    const grouped: { [dateKey: string]: { salesCount: number; revenueTokens: number } } = {};

    resellerKeys.forEach((k) => {
      const d = new Date(k.createdAt);
      if (isNaN(d.getTime())) return;

      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
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
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const formattedJoinedDate = new Date(reseller.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
        <div className="relative w-full max-w-5xl glass-card rounded-3xl p-5 sm:p-8 border border-purple-500/30 shadow-2xl glow-purple max-h-[92vh] flex flex-col overflow-hidden">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 z-10 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* High-End Reseller Profile Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6 pb-6 border-b border-slate-800/80">
            <div className="flex items-center space-x-4">
              {/* Avatar Ring */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-black shadow-glow-purple border border-purple-400/40">
                  {reseller.username.slice(0, 2).toUpperCase()}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${
                    reseller.isBlocked === 1 ? 'bg-rose-500' : 'bg-emerald-400 shadow-glow-emerald'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h2 className="text-2xl font-black text-white tracking-wide">
                    {reseller.username}
                  </h2>

                  {/* Role Badge */}
                  <span className="px-2.5 py-0.5 text-xs font-extrabold bg-purple-950/80 text-purple-300 border border-purple-700/60 rounded-lg uppercase font-mono shadow-sm">
                    {reseller.role}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-lg uppercase font-mono ${
                      reseller.isBlocked === 1 ? 'badge-rose' : 'badge-emerald'
                    }`}
                  >
                    {reseller.isBlocked === 1 ? 'Blocked' : 'Active'}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono mt-1.5 flex-wrap gap-y-1">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>Created by:</span>
                    <strong className="text-slate-200">{reseller.createdBy || 'System / Owner'}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Joined: {formattedJoinedDate}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Balance Pill */}
            <div className="flex items-center space-x-3 self-end md:self-auto w-full md:w-auto">
              <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl px-4 py-2.5 flex items-center space-x-3 shadow-glow-amber">
                <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Balance</span>
                  <span className="text-base font-extrabold text-amber-400 font-mono">
                    {reseller.tokens ?? 0} <span className="text-xs">Tokens</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManageTokens(reseller);
                }}
                className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs font-extrabold px-5 py-3 rounded-2xl shadow-glow-amber transition-all transform hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                <span>Manage Tokens</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-6">
            {/* 4 Mini KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Keys */}
              <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 shadow-lg glow-cyan hover:border-cyan-400/60 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                    Total Keys
                  </span>
                  <div className="p-2 bg-cyan-950 rounded-xl text-cyan-400 border border-cyan-800/50">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-cyan-300 font-mono">{totalKeysCount}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  Lifetime keys generated
                </span>
              </div>

              {/* Card 2: Active Keys */}
              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 shadow-lg glow-emerald hover:border-emerald-400/60 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                    Active Keys
                  </span>
                  <div className="p-2 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800/50">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-emerald-400 font-mono">{activeKeysCount}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  {totalKeysCount > 0
                    ? `${Math.round((activeKeysCount / totalKeysCount) * 100)}% of total keys`
                    : '0% active'}
                </span>
              </div>

              {/* Card 3: Expired Keys */}
              <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-4 shadow-lg glow-red hover:border-rose-400/60 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                    Expired Keys
                  </span>
                  <div className="p-2 bg-rose-950 rounded-xl text-rose-400 border border-rose-800/50">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-rose-400 font-mono">{expiredKeysCount}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  Inactive / elapsed keys
                </span>
              </div>

              {/* Card 4: Tokens Spent */}
              <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 shadow-lg glow-purple hover:border-purple-400/60 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                    Tokens Spent
                  </span>
                  <div className="p-2 bg-purple-950 rounded-xl text-purple-300 border border-purple-800/50">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-purple-300 font-mono">
                  {totalTokensSpent.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                  Total revenue consumed
                </span>
              </div>
            </div>

            {/* Integrated Sales Trajectory Chart */}
            <div>
              <SalesChart
                data={salesChartData}
                totalRevenue={totalTokensSpent}
                totalKeysSold={totalKeysCount}
              />
            </div>

            {/* Searchable, Paginated Key Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white tracking-wide">
                      Issued Keys History
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">
                      Showing {filteredKeys.length} matching license keys
                    </p>
                  </div>
                </div>

                {/* Controls: Search & Status Filter */}
                <div className="flex items-center space-x-3 flex-wrap sm:flex-nowrap gap-y-2">
                  {/* Status filter dropdown */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>

                  {/* Search box */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search key, note, HWID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                    <tr>
                      <th className="p-3.5">License Key</th>
                      <th className="p-3.5">Duration & Expiry</th>
                      <th className="p-3.5">Cost Tokens</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Payment Proof</th>
                      <th className="p-3.5">Bound HWID</th>
                      <th className="p-3.5">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {paginatedKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                          No license keys match your current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/40 transition">
                          {/* Key String */}
                          <td className="p-3.5 font-bold text-purple-300">
                            <div className="flex items-center space-x-2">
                              <span className="truncate max-w-[150px] sm:max-w-[200px]" title={k.key}>
                                {k.key}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(k.key, k.id)}
                                className="text-slate-500 hover:text-white p-1 rounded transition"
                                title="Copy Key"
                              >
                                {copiedKeyId === k.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Duration & Expiry */}
                          <td className="p-3.5">
                            <span className="text-slate-200 font-bold block">{k.duration || 'Custom'}</span>
                            {!k.expiresAt || k.expiresAt === 'never' ? (
                              <span className="text-[10px] text-emerald-400 font-semibold block">
                                Never Expires
                              </span>
                            ) : (
                              <span className="text-[10px] text-cyan-300/80 block">
                                Exp: {new Date(k.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </td>

                          {/* Cost Tokens */}
                          <td className="p-3.5 font-extrabold text-amber-400">
                            {k.costTokens || 0} Tokens
                          </td>

                          {/* Status Indicator */}
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase inline-flex items-center space-x-1 ${
                                k.status === 'active'
                                  ? 'badge-emerald'
                                  : k.status === 'expired'
                                  ? 'badge-amber'
                                  : 'badge-rose'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  k.status === 'active'
                                    ? 'bg-emerald-400'
                                    : k.status === 'expired'
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                }`}
                              />
                              <span>{k.status}</span>
                            </span>
                          </td>

                          {/* Payment Proof Badge */}
                          <td className="p-3.5">
                            {k.paymentScreenshot ? (
                              <button
                                type="button"
                                onClick={() => setSelectedScreenshotKey(k)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/80 hover:border-cyan-400 shadow-glow-cyan transition flex items-center space-x-1.5"
                              >
                                <FileImage className="w-3.5 h-3.5 text-cyan-400" />
                                <span>View Proof</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          {/* HWID */}
                          <td className="p-3.5 text-slate-400 max-w-[120px] truncate" title={k.hwid || 'Unbound'}>
                            {k.hwid || 'Unbound'}
                          </td>

                          {/* Created Date */}
                          <td className="p-3.5 text-slate-400">
                            {new Date(k.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredKeys.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 font-mono text-xs text-slate-400">
                  <div>
                    Showing{' '}
                    <span className="text-white font-bold">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    to{' '}
                    <span className="text-white font-bold">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredKeys.length)}
                    </span>{' '}
                    of <span className="text-white font-bold">{filteredKeys.length}</span> keys
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>

                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-purple-300 font-bold">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Payment Screenshot */}
      <PaymentScreenshotModal
        isOpen={!!selectedScreenshotKey}
        keyItem={selectedScreenshotKey}
        onClose={() => setSelectedScreenshotKey(null)}
      />
    </>
  );
};
