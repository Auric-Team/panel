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
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
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

  // 4 Mini KPI Stats
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
    if (!text) return;
    const handleSuccess = () => {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(handleSuccess)
        .catch(() => fallbackCopy(text, handleSuccess));
    } else {
      fallbackCopy(text, handleSuccess);
    }
  };

  const fallbackCopy = (text: string, callback?: () => void) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful && callback) callback();
    } catch (err) {
      console.error('Copy fallback failed:', err);
    }
  };

  const formattedJoinedDate = new Date(reseller.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
        <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 z-10 text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Clean Profile Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-zinc-800/80">
            <div className="flex items-center space-x-3.5">
              {/* Avatar Box */}
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 font-mono text-lg font-bold">
                {reseller.username.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
                    {reseller.username}
                  </h2>

                  {/* Role Badge */}
                  <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md uppercase">
                    {reseller.role}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md uppercase ${
                      reseller.isBlocked === 1
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                    }`}
                  >
                    {reseller.isBlocked === 1 ? 'Blocked' : 'Active'}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono mt-1 flex-wrap gap-y-1">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Created by: <strong className="text-zinc-200">{reseller.createdBy || 'System'}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Joined: {formattedJoinedDate}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Token Balance Pill & Actions */}
            <div className="flex items-center space-x-3 self-end md:self-auto">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 flex items-center space-x-2.5 font-mono">
                <Coins className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Balance</span>
                  <span className="text-sm font-bold text-amber-400">
                    {reseller.tokens ?? 0} <span className="text-xs font-normal text-zinc-400">Tokens</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManageTokens(reseller);
                }}
                className="flex items-center space-x-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Manage Tokens</span>
              </button>
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
              {/* Card 1: Total Keys */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Total Keys
                  </span>
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <p className="text-xl font-bold text-zinc-100">{totalKeysCount}</p>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Lifetime generated</span>
              </div>

              {/* Card 2: Active Keys */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Active Keys
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-emerald-400">{activeKeysCount}</p>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  {totalKeysCount > 0
                    ? `${Math.round((activeKeysCount / totalKeysCount) * 100)}% active`
                    : '0% active'}
                </span>
              </div>

              {/* Card 3: Expired Keys */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Expired Keys
                  </span>
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <p className="text-xl font-bold text-rose-400">{expiredKeysCount}</p>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Inactive keys</span>
              </div>

              {/* Card 4: Tokens Spent */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Tokens Spent
                  </span>
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xl font-bold text-amber-400">
                  {totalTokensSpent.toLocaleString()}
                </p>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">Total consumed</span>
              </div>
            </div>

            {/* Sales Chart Section */}
            <div>
              <SalesChart
                data={salesChartData}
                totalRevenue={totalTokensSpent}
                totalKeysSold={totalKeysCount}
                title="Reseller Activity"
                subtitle="Historical key issuance & token usage"
              />
            </div>

            {/* Key History Table Container */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">Issued Keys History</h4>
                  <p className="text-xs text-zinc-400 font-mono">
                    Showing {filteredKeys.length} license keys
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </select>

                  <div className="relative w-48 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search key, note, HWID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-mono text-zinc-100 outline-none focus:border-zinc-700 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] font-mono tracking-wider">
                    <tr>
                      <th className="p-3">License Key</th>
                      <th className="p-3">Duration & Expiry</th>
                      <th className="p-3">Cost Tokens</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payment Proof</th>
                      <th className="p-3">Bound HWID</th>
                      <th className="p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {paginatedKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-zinc-500 font-sans">
                          No license keys found.
                        </td>
                      </tr>
                    ) : (
                      paginatedKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-zinc-800/30 transition">
                          <td className="p-3 font-semibold text-zinc-200">
                            <div className="flex items-center space-x-1.5">
                              <span className="truncate max-w-[140px] sm:max-w-[180px]" title={k.key}>
                                {k.key}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(k.key, k.id)}
                                className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded transition"
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

                          <td className="p-3">
                            <span className="text-zinc-200 font-medium block">{k.duration || 'Custom'}</span>
                            {!k.expiresAt || k.expiresAt === 'never' ? (
                              <span className="text-[10px] text-emerald-400 block">Never</span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 block">
                                {new Date(k.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </td>

                          <td className="p-3 font-bold text-amber-400">
                            {k.costTokens || 0}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                k.status === 'active'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                  : k.status === 'expired'
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                              }`}
                            >
                              {k.status}
                            </span>
                          </td>

                          <td className="p-3">
                            {k.paymentScreenshot ? (
                              <button
                                type="button"
                                onClick={() => setSelectedScreenshotKey(k)}
                                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition flex items-center space-x-1"
                              >
                                <FileImage className="w-3 h-3 text-zinc-400" />
                                <span>Proof</span>
                              </button>
                            ) : (
                              <span className="text-zinc-600 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          <td className="p-3 text-zinc-400 max-w-[100px] truncate" title={k.hwid || 'Unbound'}>
                            {k.hwid || 'Unbound'}
                          </td>

                          <td className="p-3 text-zinc-400">
                            {new Date(k.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredKeys.length > 0 && (
                <div className="flex items-center justify-between pt-1 font-mono text-xs text-zinc-400">
                  <div>
                    Showing <span className="text-zinc-200 font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                    <span className="text-zinc-200 font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredKeys.length)}</span> of{' '}
                    <span className="text-zinc-200 font-semibold">{filteredKeys.length}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Screenshot Lightbox */}
      <PaymentScreenshotModal
        isOpen={!!selectedScreenshotKey}
        keyItem={selectedScreenshotKey}
        onClose={() => setSelectedScreenshotKey(null)}
      />
    </>
  );
};
