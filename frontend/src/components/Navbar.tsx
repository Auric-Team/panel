"use client";

import React from 'react';
import { ShieldCheck, RefreshCw, LogOut, Coins, User, Wifi, Activity, Sparkles } from 'lucide-react';
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
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 shadow-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand Logo & System Title */}
        <div className="flex items-center space-x-3.5">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-white font-mono flex items-center space-x-1">
                <span>AXIOS</span>
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  EXECUTIVE
                </span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                v2.1 ULTRA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Hardware Licensing & Token Operations Portal</span>
            </p>
          </div>
        </div>

        {/* User Status, Token Balance & Actions */}
        <div className="flex items-center space-x-3 flex-wrap justify-center sm:justify-end gap-y-2">
          {/* Sync Status Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-slate-800/80 text-xs font-mono backdrop-blur-md shadow-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-500'}`} />
            <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className="text-slate-300 font-medium">
              {isConnected ? 'Backend: Online' : 'Backend: Local'}
            </span>
          </div>

          {/* User Profile & Token Balance Pill */}
          {user && (
            <div className="flex items-center space-x-3 bg-slate-950/90 border border-slate-800/90 rounded-2xl px-3.5 py-1.5 font-mono text-xs shadow-md">
              <div className="flex items-center space-x-2 text-slate-200">
                <div className="w-6 h-6 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1px]">
                  <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center text-[11px] font-bold text-cyan-400">
                    {user.username.slice(0, 1).toUpperCase()}
                  </div>
                </div>
                <span className="font-bold text-white tracking-wide">{user.username}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-800/90 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 text-amber-400 border-l border-slate-800 pl-3">
                <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="font-extrabold text-amber-400 text-sm tracking-tight shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  {(user.tokens !== undefined ? user.tokens : (user.credits || 0)).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Tokens</span>
              </div>
            </div>
          )}

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition duration-200 disabled:opacity-50"
            title="Refresh System Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Logout Action */}
          {user && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-rose-300 hover:bg-rose-900/50 hover:text-white hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)] transition duration-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
