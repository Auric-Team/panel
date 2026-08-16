"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, LogOut, Coins, User, Wifi, Sparkles, Activity } from 'lucide-react';
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
      const start = Date.now();
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (res.ok && isMounted) {
          setLatency(Date.now() - start);
        }
      } catch {
        if (isMounted) setLatency(null);
      }
    };

    checkPing();
    const interval = setInterval(checkPing, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-8 py-3 transition-all duration-300 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-black tracking-tight text-white font-mono">
                AXIOS <span className="text-cyan-400">PANEL</span>
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-900 text-cyan-300 border border-cyan-500/30 rounded-md uppercase">
                v2.2
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400 font-mono">
              License & Token Operations Control
            </p>
          </div>
        </div>

        {/* Right Section: Status, Tokens, Refresh & Logout */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Backend Health & Latency */}
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300">
              {isConnected ? (latency !== null ? `${latency}ms` : 'Online') : 'Offline'}
            </span>
          </div>

          {/* User Profile & Token Balance */}
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-900 border border-slate-800 rounded-xl px-2.5 sm:px-3 py-1 font-mono text-xs shadow-sm">
              <div className="flex items-center space-x-1.5 text-slate-200">
                <div className="w-5 h-5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-bold text-white text-xs max-w-[90px] sm:max-w-[140px] truncate">
                  {user.username}
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-950 text-cyan-300 border border-slate-800 uppercase">
                  {user.role}
                </span>
              </div>

              {/* Tokens Pill */}
              <div className="flex items-center space-x-1 text-amber-400 border-l border-slate-800 pl-2 sm:pl-2.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-extrabold text-amber-300 text-xs">
                  {(user.tokens !== undefined ? user.tokens : (user.credits || 0)).toLocaleString()}
                </span>
                <span className="hidden sm:inline text-[9px] text-slate-400 font-normal">T</span>
              </div>
            </div>
          )}

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Logout Action */}
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 hover:text-white transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
