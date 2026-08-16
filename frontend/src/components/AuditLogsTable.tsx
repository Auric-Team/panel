"use client";

import React, { useState, useMemo } from 'react';
import { Search, ShieldAlert, Clock, Activity, Filter, Download, Trash2, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { UserItem } from '@/types/key';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastContext';

export interface AuditLogItem {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface AuditLogsTableProps {
  logs: AuditLogItem[];
  currentUser?: UserItem | null;
  onClearLogs?: () => Promise<void>;
  onRefreshLogs?: () => void;
}

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({
  logs,
  currentUser,
  onClearLogs,
  onRefreshLogs,
}) => {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        log.username.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.id && log.id.toLowerCase().includes(q));

      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, searchQuery, actionFilter]);

  const handleConfirmClear = async () => {
    if (!onClearLogs) return;
    setIsClearing(true);
    try {
      await onClearLogs();
      toast.success('Successfully cleared all system audit logs!');
      setShowClearConfirm(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear audit logs.');
    } finally {
      setIsClearing(false);
    }
  };

  const exportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'User', 'Action Event', 'Details & Parameters'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.username,
      l.action,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `axios-audit-logs-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredLogs.length} audit logs to CSV!`);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Security & Audit Event Stream</h3>
              <p className="text-xs text-slate-400 font-mono">
                Immutable event stream for user authentication, key lifecycles, and token movements
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Action Type Filter */}
            {actionTypes.length > 0 && (
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
              >
                <option value="all">All Events ({logs.length})</option>
                {actionTypes.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            )}

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-mono font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Clear Logs (Owner Only) */}
            {currentUser?.role === 'owner' && onClearLogs && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 rounded-xl text-xs font-mono font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Username, Action, Parameters, or Details..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/80 rounded-2xl pl-10 pr-4 py-2.5 text-white font-mono text-xs outline-none transition"
          />
        </div>

        {/* Logs Stream (Cards on Mobile, Table on Desktop) */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Account</th>
                <th className="p-3.5">Event Action</th>
                <th className="p-3.5">Activity Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isAuth = log.action.includes('LOGIN') || log.action.includes('2FA');
                  const isKey = log.action.includes('KEY');
                  const isUser = log.action.includes('USER') || log.action.includes('TOKEN');

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-200 font-bold">
                          @{log.username}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            isAuth
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : isKey
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : isUser
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-300 break-words leading-relaxed font-sans text-xs">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Logs Confirm Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear All Audit Logs"
        description="Are you sure you want to clear all system audit logs? This action will permanently erase the event history."
        variant="danger"
        confirmText="Clear All Logs"
        isLoading={isClearing}
        onConfirm={handleConfirmClear}
        onClose={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
