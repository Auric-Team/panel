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
    const list = resellers || users || [];
    return list.filter((u) => u.role === 'reseller' || u.role === 'manager');
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
    <div className="space-y-6 font-sans text-xs">
      {/* Create Account Form Card (Owner & Manager) */}
      {(roleString === 'owner' || roleString === 'manager') && (
        <div className="ref-card p-5 space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-soft">
            <UserPlus className="w-4 h-4 text-accent" />
            <h3 className="font-display text-sm font-normal text-ink">Create New Reseller / Manager Account</h3>
          </div>

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1">
                Username
              </label>
              <input
                type="text"
                required
                placeholder="Username..."
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="ref-input w-full font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="ref-input w-full font-mono text-xs"
              />
            </div>

            {roleString === 'owner' && (
              <div>
                <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1">
                  Account Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="ref-input w-full font-mono text-xs cursor-pointer"
                >
                  <option value="reseller">Reseller</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-sans font-medium text-muted block mb-1">
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

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isCreating}
                className="ref-btn ref-btn-primary w-full py-2 flex items-center justify-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreating ? 'Creating...' : 'Create User'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resellers Directory Table */}
      <div className="ref-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-soft">
          <div className="flex items-center space-x-2">
            <h3 className="font-display text-sm font-normal text-ink">Managed Accounts Directory</h3>
            <span className="ref-badge text-[10px] font-mono">
              {filteredUsers.length} Users
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search username, role, creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ref-input w-full pl-8 py-1.5 text-xs font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border-soft bg-surface-solid">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface text-muted uppercase text-[10px] tracking-wider border-b border-border-soft font-sans font-medium">
              <tr>
                <th className="p-3">User / Reseller</th>
                <th className="p-3">Role</th>
                <th className="p-3">Token Balance</th>
                <th className="p-3">Created By</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft font-mono text-ink">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted font-sans">
                    No accounts found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                    <td className="p-3 font-semibold text-ink">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-sm bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-[10px]">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-sm bg-surface text-muted text-[10px] font-medium uppercase border border-border-soft">
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-warning">
                      <div className="flex items-center space-x-1">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{u.tokens ?? 0}</span>
                      </div>
                    </td>

                    <td className="p-3 text-ink font-medium">
                      @{u.createdByUsername || u.createdBy || 'System'}
                    </td>

                    <td className="p-3">
                      <span
                        className={`ref-badge text-[9px] ${
                          u.isBlocked === 1
                            ? 'danger'
                            : 'success'
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
                          className="ref-btn ref-btn-sm text-warning"
                          title="Adjust Token Balance"
                        >
                          <Coins className="w-3 h-3" />
                          <span>Tokens</span>
                        </button>

                        {/* Drilldown Reseller Dashboard */}
                        <button
                          onClick={() => handleOpenDashboard(u)}
                          className="ref-btn ref-btn-sm text-accent"
                          title="View Reseller Dashboard"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dashboard</span>
                        </button>

                        {/* Toggle Block */}
                        <button
                          onClick={() => onToggleBlock(u.id, u.isBlocked === 0)}
                          className={`ref-btn-icon w-7 h-7 ${
                            u.isBlocked === 1
                              ? 'text-success hover:border-success/30'
                              : 'text-warning hover:border-warning/30'
                          }`}
                          title={u.isBlocked === 1 ? 'Unblock User' : 'Block User'}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User */}
                        {u.role !== 'owner' && u.id !== currentUser?.id && onDeleteUser && (
                          <button
                            onClick={() => onDeleteUser(u.id)}
                            className="ref-btn-icon w-7 h-7 text-danger hover:border-danger/30"
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
