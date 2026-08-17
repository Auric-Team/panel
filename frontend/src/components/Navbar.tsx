"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, LogOut, Coins, Activity, ShieldAlert, Zap } from 'lucide-react';
import { UserItem } from '@/types/key';

export interface NavbarProps {
  user: UserItem | null;
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isConnected,
  isRefreshing,
  onRefresh,
  onLogout,
}) => {
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkPing = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (res.ok && isMounted) {
          setLatency(Math.round(performance.now() - start));
        }
      } catch {
        if (isMounted) setLatency(null);
      }
    };

    checkPing();
    const interval = setInterval(checkPing, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getLatencyColor = (ms: number | null) => {
    if (ms === null) return 'text-rose-400 border-rose-800/60 bg-rose-950/40';
    if (ms < 80) return 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40';
    if (ms < 200) return 'text-amber-400 border-amber-800/60 bg-amber-950/40';
    return 'text-rose-400 border-rose-800/60 bg-rose-950/40';
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/80 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
      case 'manager':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80 shadow-[0_0_10px_rgba(6,182,212,0.2)]';
      case 'reseller':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 border-b border-slate-800/80 backdrop-blur-2xl px-4 sm:px-8 py-3 transition-all duration-200 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & System Info */}
        <div className="flex items-center space-x-3.5">
          <div className="relative group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:border-cyan-400 transition-all duration-300">
              <ShieldCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-white font-mono flex items-center gap-1.5">
                AXIOS <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">EXECUTIVE</span>
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-extrabold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 rounded-full uppercase tracking-wider">
                v3.0 PRO
              </span>
            </div>
            <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Hardware License & Cryptographic Armor
            </p>
          </div>
        </div>

        {/* Right Section: Telemetry, Tokens, Profile & Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time Server Ping Indicator */}
          <div
            className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all ${getLatencyColor(
              latency
            )}`}
            title="Real-time Server Telemetry"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                  : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
              }`}
            />
            <span className="font-semibold">
              {isConnected ? (latency !== null ? `${latency}ms` : 'Active') : 'Offline'}
            </span>
          </div>

          {/* User Profile & Token Balance */}
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl px-3 py-1.5 font-mono text-xs shadow-lg backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-[11px] font-black text-white shadow-sm">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-bold text-white text-xs max-w-[90px] sm:max-w-[150px] truncate">
                  {user.username}
                </span>
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>

              {/* Tokens Pill */}
              <div className="flex items-center space-x-1.5 text-amber-400 border-l border-slate-800 pl-2.5 sm:pl-3">
                <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="font-black text-amber-300 text-xs tracking-tight">
                  {(user.tokens !== undefined ? user.tokens : (user.credits || 0)).toLocaleString()}
                </span>
                <span className="hidden sm:inline text-[10px] text-amber-500 font-semibold">T</span>
              </div>
            </div>
          )}

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all disabled:opacity-50 shadow-md active:scale-95"
            title="Refresh Real-time Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Logout Action */}
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2.5 rounded-2xl bg-rose-950/30 hover:bg-rose-900/60 border border-rose-900/50 hover:border-rose-700 text-rose-300 hover:text-white transition-all shadow-md active:scale-95"
              title="Secure Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
