"use client";

import React, { useState, useMemo } from 'react';
import { UserPlus, Search, Coins, ShieldAlert, Trash2, Eye } from 'lucide-react';
import { UserItem } from '@/types/key';

interface ResellersTableProps {
  currentUser?: UserItem | null;
  userRole?: string;
  resellers?: UserItem[];
  users?: UserItem[];
  onCreateReseller?: (resellerData: any) => Promise<void>;
  onCreateUser?: (username: string, password?: string, role?: 'reseller' | 'manager', tokens?: number) => Promise<void>;
  onToggleBlock: (userId: string, isBlocked: boolean) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  onOpenTokensModal?: (reseller: UserItem) => void;
  onOpenManageTokens?: (reseller: UserItem) => void;
  onOpenDashboardModal?: (reseller: UserItem) => void;
  onOpenDashboard?: (reseller: UserItem) => void;
}

export const ResellersTable: React.FC<ResellersTableProps> = ({
  currentUser,
  userRole,
  resellers,
  users,
  onCreateReseller,
  onCreateUser,
  onToggleBlock,
  onDeleteUser,
  onOpenTokensModal,
  onOpenManageTokens,
  onOpenDashboardModal,
  onOpenDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'reseller' | 'manager'>('reseller');
  const [newTokens, setNewTokens] = useState<number>(100);
  const [isCreating, setIsCreating] = useState(false);

  const effectiveUsers = useMemo(() => {
    return resellers || users || [];
  }, [resellers, users]);

  const roleString = userRole || currentUser?.role || 'reseller';

  const filteredUsers = useMemo(() => {
    return effectiveUsers.filter((u) => {
      const q = searchQuery.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.createdBy && u.createdBy.toLowerCase().includes(q))
      );
    });
  }, [effectiveUsers, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setIsCreating(true);
    try {
      if (onCreateReseller) {
        await onCreateReseller({
          username: newUsername,
          password: newPassword,
          role: newRole,
          tokens: newTokens,
        });
      } else if (onCreateUser) {
        await onCreateUser(newUsername, newPassword, newRole, newTokens);
      }
      setNewUsername('');
      setNewPassword('');
      setNewTokens(100);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenTokens = (u: UserItem) => {
    if (onOpenTokensModal) onOpenTokensModal(u);
    else if (onOpenManageTokens) onOpenManageTokens(u);
  };

  const handleOpenDashboard = (u: UserItem) => {
    if (onOpenDashboardModal) onOpenDashboardModal(u);
    else if (onOpenDashboard) onOpenDashboard(u);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Create Account Form Card (Owner & Manager) */}
      {(roleString === 'owner' || roleString === 'manager') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <UserPlus className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Create New Reseller / Manager Account</h3>
          </div>

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="Username..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-slate-700 transition"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-slate-700 transition"
              />
            </div>

            {roleString === 'owner' && (
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Account Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-slate-700 transition cursor-pointer"
                >
                  <option value="reseller">Reseller</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Initial Tokens
              </label>
              <input
                type="number"
                min="0"
                value={newTokens}
                onChange={(e) => setNewTokens(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-slate-700 transition"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreating ? 'Creating...' : 'Create User'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resellers Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white">Managed Accounts Directory</h3>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-semibold text-[11px]">
              {filteredUsers.length} Users
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search username, role, creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white font-mono outline-none focus:border-slate-700 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">User / Reseller</th>
                <th className="p-3">Role</th>
                <th className="p-3">Token Balance</th>
                <th className="p-3">Created By</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    No accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase border border-slate-700">
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-amber-400">
                      <div className="flex items-center space-x-1">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{u.tokens ?? 0}</span>
                      </div>
                    </td>

                    <td className="p-3 text-slate-400">
                      {u.createdBy || 'System'}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          u.isBlocked === 1
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        }`}
                      >
                        {u.isBlocked === 1 ? 'Blocked' : 'Active'}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Manage Tokens */}
                        <button
                          onClick={() => handleOpenTokens(u)}
                          className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 hover:bg-amber-900/60 transition flex items-center space-x-1"
                          title="Adjust Token Balance"
                        >
                          <Coins className="w-3 h-3" />
                          <span>Tokens</span>
                        </button>

                        {/* Drilldown Reseller Dashboard */}
                        <button
                          onClick={() => handleOpenDashboard(u)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition flex items-center space-x-1"
                          title="View Reseller Dashboard"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Dashboard</span>
                        </button>

                        {/* Toggle Block */}
                        <button
                          onClick={() => onToggleBlock(u.id, u.isBlocked === 0)}
                          className={`p-1.5 rounded-lg border transition ${
                            u.isBlocked === 1
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/60'
                              : 'bg-amber-950/40 text-amber-400 border-amber-800/50 hover:bg-amber-900/60'
                          }`}
                          title={u.isBlocked === 1 ? 'Unblock User' : 'Block User'}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User */}
                        {u.role !== 'owner' && u.id !== currentUser?.id && onDeleteUser && (
                          <button
                            onClick={() => onDeleteUser(u.id)}
                            className="p-1.5 rounded-lg bg-rose-950/50 text-rose-400 border border-rose-800/50 hover:bg-rose-900/60 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
