"use client";

import React, { useState, useMemo } from 'react';
import { Search, ShieldAlert, Clock, Activity, Filter, Download, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { UserItem } from '@/types/key';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [isClearing, setIsClearing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set);
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

  const handleClearAll = async () => {
    if (!onClearLogs) return;
    if (confirm('Are you sure you want to clear all system audit logs? This will reset backend/data/logs.json.')) {
      setIsClearing(true);
      try {
        await onClearLogs();
        showToast('Successfully cleared all system audit logs from data/logs.json!');
      } catch (err: any) {
        alert(err?.message || 'Failed to clear audit logs.');
      } finally {
        setIsClearing(false);
      }
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
    link.setAttribute('download', `axios-system-audit-logs-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 font-bold hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-5 backdrop-blur-md">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
                <span>AXIOS Audit Ledger & JSON Security Monitoring</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold">
                  {logs.length} Total Logs
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Persisted in <code className="text-cyan-300 font-bold">backend/data/logs.json</code> (Safe to backup or delete anytime)</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Action Type Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-slate-700 text-xs cursor-pointer"
            >
              <option value="all">All Actions ({actionTypes.length})</option>
              {actionTypes.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user, key, HWID, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono outline-none focus:border-slate-700 text-xs"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={exportCSV}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center space-x-1 font-bold"
              title="Export CSV Log File"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Clear All Logs Button (Owner Only) */}
            {onClearLogs && currentUser?.role === 'owner' && (
              <button
                onClick={handleClearAll}
                disabled={isClearing || logs.length === 0}
                className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/80 hover:text-white transition flex items-center space-x-1 font-bold disabled:opacity-50"
                title="Clear backend/data/logs.json"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Clear Logs</span>
              </button>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor / User</th>
                <th className="p-3.5">Action Event</th>
                <th className="p-3.5">Full Log Details & Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500 font-sans">
                    No audit logs recorded matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 text-slate-400 flex items-center space-x-1.5 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 font-bold border border-slate-800 text-[11px]">
                        @{log.username}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 font-extrabold border border-indigo-800/60 text-[10px] uppercase">
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-300 text-xs font-mono max-w-xl break-words" title={log.details}>
                      {log.details}
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
