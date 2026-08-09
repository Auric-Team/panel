"use client";

import React, { useState, useMemo } from 'react';
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
  Key
} from 'lucide-react';
import { UserItem, KeyItem } from '@/types/key';
import { TokenAdjustmentModal } from '@/components/TokenAdjustmentModal';
import { ResellerAnalyticsModal } from '@/components/ResellerAnalyticsModal';

interface ResellerManagementProps {
  currentUser: UserItem | null;
  resellers: UserItem[];
  keys?: KeyItem[];
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
  onCreateReseller,
  onToggleBlockUser,
  onDeleteUser,
  onUpdateTokens,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'reseller' | 'manager'>('reseller');
  const [newTokens, setNewTokens] = useState<number>(100);
  const [isCreating, setIsCreating] = useState(false);

  // Modal States
  const [tokenModalUser, setTokenModalUser] = useState<UserItem | null>(null);
  const [analyticsModalUser, setAnalyticsModalUser] = useState<UserItem | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Derive status badge for reseller (Active, Suspended, Pending)
  const getResellerStatus = (user: UserItem): 'active' | 'suspended' | 'pending' => {
    if (user.isBlocked === 1) return 'suspended';
    if (user.status === 'pending' || (user.tokens === 0 && !user.createdBy)) return 'pending';
    return 'active';
  };

  // Map keys counts to resellers
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

  // Filter logic
  const filteredResellers = useMemo(() => {
    return resellers.filter((u) => {
      const q = searchQuery.toLowerCase();
      const status = getResellerStatus(u);

      const matchesSearch =
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.createdBy && u.createdBy.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [resellers, searchQuery, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setIsCreating(true);
    try {
      await onCreateReseller({
        username: newUsername,
        password: newPassword,
        role: newRole,
        tokens: newTokens,
        email: newEmail || `${newUsername}@axios-network.internal`,
      });
      showToast(`Successfully created reseller @${newUsername} with ${newTokens} initial tokens!`);
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewTokens(100);
      setShowCreateForm(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to create reseller account.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Glassmorphism Reseller Management Container */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header & Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>AXIOS Reseller Network & Token Allocation</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage distribution partner accounts, status lifecycle, token balance adjustments, and key telemetry.
            </p>
          </div>

          {(currentUser?.role === 'owner' || currentUser?.role === 'manager') && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold px-5 py-2.5 rounded-2xl transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20 text-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showCreateForm ? 'Close Form' : 'Add New Reseller'}</span>
            </button>
          )}
        </div>

        {/* Account Creation Form Drawer (Collapsible) */}
        {showCreateForm && (
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 shadow-inner space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Create Reseller / Manager Partner Account</h3>
            </div>

            <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Partner username..."
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/80 transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Partner password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/80 transition"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="partner@axios.internal"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/80 transition"
                />
              </div>

              {currentUser?.role === 'owner' ? (
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                    Role Tier
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/80 transition cursor-pointer"
                  >
                    <option value="reseller">Reseller</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                    Initial Tokens
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTokens}
                    onChange={(e) => setNewTokens(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/80 transition"
                  />
                </div>
              )}

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isCreating ? 'Creating...' : 'Provision Partner'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Executive Filter Bar (Search by Name/ID & Status Filter Badges) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Filter Badges */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 mr-1 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Status Filter:</span>
            </span>

            {/* All */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center space-x-1.5 border ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200'
              }`}
            >
              <span>All ({resellers.length})</span>
            </button>

            {/* Active Badge */}
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center space-x-1.5 border ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-emerald-400'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active</span>
            </button>

            {/* Suspended Badge */}
            <button
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center space-x-1.5 border ${
                statusFilter === 'suspended'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-rose-400'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Suspended</span>
            </button>

            {/* Pending Badge */}
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center space-x-1.5 border ${
                statusFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-amber-400'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Pending</span>
            </button>
          </div>

          {/* Search by Name/ID */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search partner name, ID, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-xs text-white font-mono outline-none focus:border-cyan-500/80 transition"
            />
          </div>
        </div>

        {/* Executive Reseller Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/40 shadow-inner">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">Reseller Partner</th>
                <th className="p-3.5">Role Tier</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Token Balance</th>
                <th className="p-3.5">Keys Issued</th>
                <th className="p-3.5">Total Revenue</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredResellers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    No reseller partners match the active filters.
                  </td>
                </tr>
              ) : (
                filteredResellers.map((u) => {
                  const status = getResellerStatus(u);
                  const stats = resellerKeyStats[u.username.toLowerCase()] || { totalKeys: 0, totalSpent: 0 };
                  const tokens = (u.tokens !== undefined ? u.tokens : u.credits) ?? 0;
                  const displayEmail = u.email || `${u.username}@axios-network.internal`;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      {/* Avatar, Username & Email/ID */}
                      <td className="p-3.5 font-bold text-white">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 font-extrabold text-xs shadow-md">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-xs flex items-center space-x-1.5">
                              <span>@{u.username}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal truncate max-w-[160px]">
                              {displayEmail} • #{u.id.slice(0, 6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Tier */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-extrabold uppercase border border-slate-700">
                          {u.role}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        {status === 'active' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center space-x-1.5 w-max">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active</span>
                          </span>
                        )}

                        {status === 'suspended' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)] flex items-center space-x-1.5 w-max">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>Suspended</span>
                          </span>
                        )}

                        {status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)] flex items-center space-x-1.5 w-max">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Token Balance */}
                      <td className="p-3.5 font-extrabold text-amber-400">
                        <div className="flex items-center space-x-1.5">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <span className="text-sm">{tokens.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Total Keys Issued */}
                      <td className="p-3.5 font-bold text-white">
                        <div className="flex items-center space-x-1.5">
                          <Key className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{stats.totalKeys}</span>
                        </div>
                      </td>

                      {/* Revenue / Tokens Spent */}
                      <td className="p-3.5 font-bold text-purple-400">
                        <span>{stats.totalSpent.toLocaleString()} Tokens</span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Token Adjustment Button */}
                          <button
                            onClick={() => setTokenModalUser(u)}
                            className="px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-300 hover:bg-amber-900/80 transition flex items-center space-x-1.5 shadow-sm font-bold"
                            title="Adjust Token Balance"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Tokens</span>
                          </button>

                          {/* Analytics Drilldown Modal Button */}
                          <button
                            onClick={() => setAnalyticsModalUser(u)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition flex items-center space-x-1.5 font-bold"
                            title="Open Reseller Analytics Drilldown"
                          >
                            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Analytics</span>
                          </button>

                          {/* Toggle Status / Block */}
                          <button
                            onClick={() => {
                              const newStatus = u.isBlocked === 0;
                              onToggleBlockUser(u.id, newStatus);
                              showToast(`Reseller @${u.username} status updated to ${newStatus ? 'Suspended' : 'Active'}.`);
                            }}
                            className={`p-2 rounded-xl border transition ${
                              u.isBlocked === 1
                                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/80'
                                : 'bg-amber-950/50 text-amber-400 border-amber-800/60 hover:bg-amber-900/80'
                            }`}
                            title={u.isBlocked === 1 ? 'Activate Reseller' : 'Suspend Reseller'}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Reseller (Owner / Manager only, non-owner target) */}
                          {onDeleteUser && u.role !== 'owner' && u.id !== currentUser?.id && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete reseller @${u.username}?`)) {
                                  onDeleteUser(u.id);
                                  showToast(`Reseller @${u.username} has been deleted.`);
                                }
                              }}
                              className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/60 hover:bg-rose-900/80 transition"
                              title="Delete Partner Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Token Adjustment Modal */}
      <TokenAdjustmentModal
        isOpen={!!tokenModalUser}
        reseller={tokenModalUser}
        onClose={() => setTokenModalUser(null)}
        onUpdateTokens={onUpdateTokens}
        onSuccessToast={showToast}
      />

      {/* Reseller Deep Analytics Modal */}
      <ResellerAnalyticsModal
        isOpen={!!analyticsModalUser}
        reseller={analyticsModalUser}
        keys={keys}
        onClose={() => setAnalyticsModalUser(null)}
        onOpenManageTokens={(reseller) => setTokenModalUser(reseller)}
      />
    </div>
  );
};
