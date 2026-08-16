"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Coins,
  Shield,
  ShieldAlert,
  Trash2,
  Eye,
  User,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BarChart2,
  Lock,
  Mail,
  Key,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';
import { UserItem, KeyItem, TokenTransactionItem } from '@/types/key';
import { TokenBalanceModal } from '@/components/TokenBalanceModal';
import { ResellerDashboardModal } from '@/components/ResellerDashboardModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastContext';
import { api } from '@/lib/api';

interface ResellerManagementProps {
  currentUser: UserItem | null;
  resellers: UserItem[];
  keys?: KeyItem[];
  token?: string;
  onCreateReseller: (resellerData: {
    username: string;
    password?: string;
    role?: 'reseller' | 'manager';
    tokens?: number;
    email?: string;
  }) => Promise<void>;
  onToggleBlockUser: (userId: string, isBlocked: boolean) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  onUpdateTokens: (
    userId: string,
    amount: number,
    action: 'add' | 'deduct',
    note?: string
  ) => Promise<void>;
}

export const ResellerManagement: React.FC<ResellerManagementProps> = ({
  currentUser,
  resellers,
  keys = [],
  token,
  onCreateReseller,
  onToggleBlockUser,
  onDeleteUser,
  onUpdateTokens,
}) => {
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'partners' | 'transactions'>('partners');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'reseller' | 'manager'>('reseller');
  const [newTokens, setNewTokens] = useState<number>(100);
  const [isCreating, setIsCreating] = useState(false);

  // Modal States
  const [tokenModalUser, setTokenModalUser] = useState<UserItem | null>(null);
  const [analyticsModalUser, setAnalyticsModalUser] = useState<UserItem | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<TokenTransactionItem[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'danger',
    confirmText: 'Confirm',
    onConfirm: async () => {},
  });

  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Fetch token transactions if tab active
  useEffect(() => {
    if (activeSubTab === 'transactions' && token) {
      setLoadingTx(true);
      api
        .getTokenTransactions(token)
        .then((data) => setTransactions(Array.isArray(data) ? data : []))
        .catch(() => setTransactions([]))
        .finally(() => setLoadingTx(false));
    }
  }, [activeSubTab, token]);

  // Keys breakdown per reseller
  const resellerKeyStats = useMemo(() => {
    const map: { [username: string]: { totalKeys: number; totalSpent: number } } = {};
    keys.forEach((k) => {
      const u = k.createdByUsername?.toLowerCase();
      if (!u) return;
      if (!map[u]) map[u] = { totalKeys: 0, totalSpent: 0 };
      map[u].totalKeys += 1;
      map[u].totalSpent += k.costTokens || 0;
    });
    return map;
  }, [keys]);

  // Filtered Resellers
  const filteredResellers = useMemo(() => {
    return resellers
      .filter((u) => u.role === 'reseller' || u.role === 'manager')
      .filter((u) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          u.username.toLowerCase().includes(q) ||
          (u.createdByUsername && u.createdByUsername.toLowerCase().includes(q));

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = u.isBlocked === 0;
        else if (statusFilter === 'suspended') matchesStatus = u.isBlocked === 1;

        return matchesSearch && matchesStatus;
      });
  }, [resellers, searchQuery, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error('Username and password are required.');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateReseller({
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        tokens: newTokens,
      });
      toast.success(`Partner @${newUsername.trim()} created successfully!`);
      setNewUsername('');
      setNewPassword('');
      setNewTokens(100);
      setShowCreateForm(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create partner account.');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePromptDeleteUser = (u: UserItem) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Partner @${u.username}`,
      description: `Are you sure you want to permanently delete partner account @${u.username}? This will remove all their access permissions.`,
      variant: 'danger',
      confirmText: 'Delete Account',
      onConfirm: async () => {
        if (!onDeleteUser) return;
        setIsProcessingAction(true);
        try {
          await onDeleteUser(u.id);
          toast.success(`Partner @${u.username} deleted.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete partner.');
        } finally {
          setIsProcessingAction(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Sub Tab Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('partners')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'partners'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Reseller Directory</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-950 font-mono">
              {filteredResellers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'transactions'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Token Transaction Ledger</span>
          </button>
        </div>

        {activeSubTab === 'partners' && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center space-x-1.5 shadow-lg shadow-cyan-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showCreateForm ? 'Close Form' : 'Provision Reseller'}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Partners Directory */}
      {activeSubTab === 'partners' && (
        <div className="space-y-6">
          {/* Create Reseller Form Accordion */}
          {showCreateForm && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center space-x-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <span>Provision New Partner Account</span>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIPReseller99"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1.5">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Access password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1.5">
                      Partner Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e: any) => setNewRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none"
                    >
                      <option value="reseller">Reseller (Key Issuer)</option>
                      {currentUser?.role === 'owner' && <option value="manager">Manager (Admin)</option>}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1.5">
                      Initial Tokens
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTokens}
                      onChange={(e) => setNewTokens(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isCreating ? 'Provisioning...' : 'Confirm Account Creation'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory Filter & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-bold text-white tracking-tight">Active Partners Network</h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800 font-mono font-bold text-xs">
                  {filteredResellers.length} Accounts
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  {(['all', 'active', 'suspended'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-mono font-bold transition ${
                        statusFilter === st
                          ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Partner @Username or Manager..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl pl-10 pr-4 py-2.5 text-white font-mono text-xs outline-none transition"
              />
            </div>

            {/* Mobile & Desktop Resellers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {filteredResellers.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 font-mono">
                  No partners found matching criteria.
                </div>
              ) : (
                filteredResellers.map((u) => {
                  const stats = resellerKeyStats[u.username.toLowerCase()] || { totalKeys: 0, totalSpent: 0 };
                  const isBlocked = u.isBlocked === 1;

                  return (
                    <div
                      key={u.id}
                      className="p-4 bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-2xl space-y-3 transition"
                    >
                      {/* Top Row: User & Role */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-cyan-400 font-mono">
                            {u.username.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate text-xs">
                              @{u.username}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              By {u.createdByUsername || 'System'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                              isBlocked
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {isBlocked ? 'Suspended' : 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Token Balance & Keys Issued */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-sans">Token Balance</span>
                          <span className="text-amber-400 font-bold">
                            {(u.tokens !== undefined ? u.tokens : (u.credits || 0)).toLocaleString()} T
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block font-sans">Keys Issued</span>
                          <span className="text-cyan-300 font-bold">{stats.totalKeys} Keys</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
                        <button
                          onClick={() => setTokenModalUser(u)}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 rounded-xl font-mono text-xs font-semibold flex items-center justify-center space-x-1"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Tokens</span>
                        </button>

                        <button
                          onClick={() => setAnalyticsModalUser(u)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 rounded-xl"
                          title="Deep Analytics"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onToggleBlockUser(u.id, !isBlocked)}
                          className={`p-1.5 rounded-xl border transition ${
                            isBlocked
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900'
                              : 'bg-amber-950/60 border-amber-800 text-amber-400 hover:bg-amber-900'
                          }`}
                          title={isBlocked ? 'Activate Account' : 'Suspend Account'}
                        >
                          <Lock className="w-4 h-4" />
                        </button>

                        {onDeleteUser && (
                          <button
                            onClick={() => handlePromptDeleteUser(u)}
                            className="p-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900 text-rose-400 rounded-xl"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Token Transaction Ledger */}
      {activeSubTab === 'transactions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-sans">Token Balance Ledger Audit</h3>
            </div>
            <span className="text-slate-400 text-[11px]">{transactions.length} Transactions Logged</span>
          </div>

          {loadingTx ? (
            <div className="text-center py-12 text-slate-500 animate-pulse">Loading transaction records...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No token transaction records found yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Reseller</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Balance After</th>
                    <th className="p-3">Note / Issuer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {transactions.map((tx) => {
                    const isAdd = tx.type === 'add' || tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-400 text-[11px]">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-white">@{tx.username}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              tx.type === 'add'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : tx.type === 'key_generation'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono">
                          <span className={tx.type === 'add' ? 'text-emerald-400' : 'text-rose-400'}>
                            {tx.type === 'add' ? `+${tx.amount}` : `-${tx.amount}`} T
                          </span>
                        </td>
                        <td className="p-3 text-amber-400 font-bold font-mono">
                          {tx.balanceAfter.toLocaleString()} T
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">{tx.note || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Token Balance Modal */}
      <TokenBalanceModal
        isOpen={!!tokenModalUser}
        reseller={tokenModalUser}
        onClose={() => setTokenModalUser(null)}
        onUpdateTokens={async (id, amt, act, note) => {
          await onUpdateTokens(id, amt, act, note);
          toast.success(`Tokens updated successfully.`);
          setTokenModalUser(null);
        }}
      />

      {/* Analytics Modal */}
      <ResellerDashboardModal
        isOpen={!!analyticsModalUser}
        reseller={analyticsModalUser}
        keys={keys}
        onClose={() => setAnalyticsModalUser(null)}
        onOpenManageTokens={(r) => {
          setAnalyticsModalUser(null);
          setTokenModalUser(r);
        }}
      />

      {/* Custom Global Action Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={isProcessingAction}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
