"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Coins,
  Shield,
  Trash2,
  BarChart2,
  Lock,
  History,
} from 'lucide-react';
import { UserItem, KeyItem, TokenTransactionItem } from '@/types/key';
import { TokenBalanceModal } from '@/components/TokenBalanceModal';
import { ResellerAnalyticsModal } from '@/components/ResellerAnalyticsModal';
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

  const resellerKeyStats = useMemo(() => {
    const map: Record<string, { totalKeys: number; totalSpent: number }> = {};
    keys.forEach((k) => {
      const u = (k.createdByUsername || '').toLowerCase();
      if (!map[u]) map[u] = { totalKeys: 0, totalSpent: 0 };
      map[u].totalKeys += 1;
      map[u].totalSpent += k.costTokens || 0;
    });
    return map;
  }, [keys]);

  const filteredResellers = useMemo(() => {
    return resellers.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        r.username.toLowerCase().includes(q) ||
        (r.createdByUsername && r.createdByUsername.toLowerCase().includes(q));

      const isBlocked = r.isBlocked === 1;
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = !isBlocked;
      else if (statusFilter === 'suspended') matchesStatus = isBlocked;

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="ref-tab-list">
          <button
            onClick={() => setActiveSubTab('partners')}
            className={`ref-tab-btn ${activeSubTab === 'partners' ? 'active' : ''}`}
          >
            <Shield className="w-4 h-4 text-muted" />
            <span>Reseller Directory</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-surface border border-border-soft font-mono">
              {filteredResellers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`ref-tab-btn ${activeSubTab === 'transactions' ? 'active' : ''}`}
          >
            <History className="w-4 h-4 text-muted" />
            <span>Token Transaction Ledger</span>
          </button>
        </div>

        {activeSubTab === 'partners' && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="ref-btn ref-btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showCreateForm ? 'Close Form' : 'Provision Reseller'}</span>
          </button>
        )}
      </div>

      {/* Tab 1: Partners Directory */}
      {activeSubTab === 'partners' && (
        <div className="space-y-6">
          {/* Create Reseller Form */}
          {showCreateForm && (
            <div className="ref-card p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center space-x-2 text-ink font-display text-base border-b border-border-soft pb-3">
                <UserPlus className="w-5 h-5 text-accent" />
                <span>Provision New Partner Account</span>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIPReseller99"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="ref-input w-full font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1.5">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Access password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="ref-input w-full font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1.5">
                      Partner Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e: any) => setNewRole(e.target.value)}
                      className="ref-input w-full font-mono text-xs cursor-pointer"
                    >
                      <option value="reseller">Reseller (Key Issuer)</option>
                      {currentUser?.role === 'owner' && <option value="manager">Manager (Admin)</option>}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1.5">
                      Initial Tokens
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTokens}
                      onChange={(e) => setNewTokens(parseInt(e.target.value, 10) || 0)}
                      className="ref-input w-full font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="ref-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="ref-btn ref-btn-primary"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isCreating ? 'Provisioning...' : 'Confirm Account Creation'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory Filter & Search */}
          <div className="ref-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <h3 className="font-display text-base font-normal text-ink tracking-tight">Active Partners Network</h3>
                <span className="ref-badge text-[10px] font-mono">
                  {filteredResellers.length} Accounts
                </span>
              </div>

              <div className="ref-tab-list">
                {(['all', 'active', 'suspended'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`ref-tab-btn py-1 px-2.5 text-[10px] uppercase font-mono ${
                      statusFilter === st ? 'active' : ''
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Partner @Username or Manager..."
                className="ref-input w-full pl-10 text-xs font-mono"
              />
            </div>

            {/* Resellers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {filteredResellers.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted font-sans">
                  No partners found matching criteria.
                </div>
              ) : (
                filteredResellers.map((u) => {
                  const stats = resellerKeyStats[u.username.toLowerCase()] || { totalKeys: 0, totalSpent: 0 };
                  const isBlocked = u.isBlocked === 1;

                  return (
                    <div
                      key={u.id}
                      className="p-4 bg-surface rounded-md border border-border-soft hover:border-border space-y-3 transition-colors shadow-sm"
                    >
                      {/* Top Row: User & Role */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 rounded-sm bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent font-mono">
                            {u.username.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-ink block truncate text-xs font-sans">
                              @{u.username}
                            </span>
                            <span className="text-[10px] text-muted font-mono">
                              By {u.createdByUsername || 'System'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`ref-badge text-[9px] font-mono ${
                            isBlocked
                              ? 'danger'
                              : 'success'
                          }`}
                        >
                          {isBlocked ? 'Suspended' : 'Active'}
                        </span>
                      </div>

                      {/* Token Balance & Keys Issued */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-surface-solid rounded-sm border border-border-soft font-mono text-[11px]">
                        <div>
                          <span className="text-[9px] text-muted uppercase block font-sans">Token Balance</span>
                          <span className="text-warning font-bold">
                            {(u.tokens !== undefined ? u.tokens : (u.credits || 0)).toLocaleString()} T
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-muted uppercase block font-sans">Keys Issued</span>
                          <span className="text-ink font-bold">{stats.totalKeys} Keys</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border-soft">
                        <button
                          onClick={() => setTokenModalUser(u)}
                          className="ref-btn ref-btn-sm flex-1 text-warning"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Tokens</span>
                        </button>

                        <button
                          onClick={() => setAnalyticsModalUser(u)}
                          className="ref-btn-icon w-8 h-8 text-accent"
                          title="Deep Analytics"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onToggleBlockUser(u.id, !isBlocked)}
                          className={`ref-btn-icon w-8 h-8 ${
                            isBlocked
                              ? 'text-success hover:border-success/30'
                              : 'text-warning hover:border-warning/30'
                          }`}
                          title={isBlocked ? 'Activate Account' : 'Suspend Account'}
                        >
                          <Lock className="w-4 h-4" />
                        </button>

                        {onDeleteUser && (
                          <button
                            onClick={() => handlePromptDeleteUser(u)}
                            className="ref-btn-icon w-8 h-8 text-danger hover:border-danger/30"
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
        <div className="ref-card p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border-soft">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-accent" />
              <h3 className="font-display text-base font-normal text-ink">Token Balance Ledger Audit</h3>
            </div>
            <span className="text-muted text-[11px] font-sans">{transactions.length} Transactions Logged</span>
          </div>

          {loadingTx ? (
            <div className="text-center py-12 text-muted animate-pulse font-sans">Loading transaction records...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted font-sans">No token transaction records found yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-soft">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-surface text-muted text-[10px] uppercase font-sans font-medium border-b border-border-soft">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Reseller</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Balance After</th>
                    <th className="p-3">Note / Issuer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft bg-surface-solid">
                  {transactions.map((tx) => {
                    const isAdd = tx.type === 'add' || tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-surface-hover transition-colors">
                        <td className="p-3 text-muted text-[11px]">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-ink">@{tx.username}</td>
                        <td className="p-3">
                          <span
                            className={`ref-badge text-[9px] ${
                              tx.type === 'add'
                                ? 'success'
                                : tx.type === 'key_generation'
                                ? 'info'
                                : 'danger'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono">
                          <span className={tx.type === 'add' ? 'text-success' : 'text-danger'}>
                            {tx.type === 'add' ? `+${tx.amount}` : `-${tx.amount}`} T
                          </span>
                        </td>
                        <td className="p-3 text-warning font-bold font-mono">
                          {tx.balanceAfter.toLocaleString()} T
                        </td>
                        <td className="p-3 text-muted text-[11px] font-sans">{tx.note || '-'}</td>
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
      <ResellerAnalyticsModal
        isOpen={!!analyticsModalUser}
        reseller={analyticsModalUser}
        keys={keys || []}
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
