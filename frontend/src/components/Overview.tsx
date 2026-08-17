"use client";

import React from 'react';
import {
  Key,
  ShieldCheck,
  Cpu,
  Clock,
  Users,
  Coins,
  Activity,
  TrendingUp,
  Zap,
  Lock,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { DashboardStats, StatsOverviewData } from '@/types/key';

export interface OverviewProps {
  stats: DashboardStats | StatsOverviewData | null;
  userRole?: string;
}

export const Overview: React.FC<OverviewProps> = ({ stats, userRole }) => {
  const totalKeys = stats ? ('totalKeys' in stats ? stats.totalKeys : 0) : 0;
  const activeKeys = stats ? ('activeKeys' in stats ? stats.activeKeys : 0) : 0;
  const boundDevices = stats ? ('boundDevices' in stats ? stats.boundDevices : 0) : 0;
  const expiredKeys = stats ? ('expiredKeys' in stats ? stats.expiredKeys : 0) : 0;
  const totalResellers = stats ? ('totalResellers' in stats ? stats.totalResellers : 0) : 0;
  const totalTokensSpent = stats
    ? 'totalTokensSpent' in stats
      ? stats.totalTokensSpent
      : 'totalRevenueTokens' in stats
      ? stats.totalRevenueTokens
      : 0
    : 0;

  const activeRatio = totalKeys > 0 ? Math.round((activeKeys / totalKeys) * 100) : 0;

  const cards = [
    {
      title: 'Active Licenses',
      value: activeKeys.toLocaleString(),
      subtitle: `${activeRatio}% active pool`,
      badge: 'LIVE PROTECTED',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      gradient: 'from-emerald-950/30 to-slate-900',
      borderColor: 'hover:border-emerald-500/50',
    },
    {
      title: 'Hardware Bound (HWID)',
      value: boundDevices.toLocaleString(),
      subtitle: 'Locked devices',
      badge: 'ANTI-CLONE',
      badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
      icon: Cpu,
      iconColor: 'text-cyan-400',
      gradient: 'from-cyan-950/30 to-slate-900',
      borderColor: 'hover:border-cyan-500/50',
    },
    {
      title: 'Total Generated Keys',
      value: totalKeys.toLocaleString(),
      subtitle: 'All-time issuance',
      badge: 'ALL TIME',
      badgeBg: 'bg-slate-950 text-slate-300 border-slate-800',
      icon: Key,
      iconColor: 'text-slate-200',
      gradient: 'from-slate-900 to-slate-950',
      borderColor: 'hover:border-slate-600',
    },
    {
      title: 'Expired / Dormant',
      value: expiredKeys.toLocaleString(),
      subtitle: 'Inactive keys',
      badge: 'EXPIRED',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
      icon: Clock,
      iconColor: 'text-rose-400',
      gradient: 'from-rose-950/30 to-slate-900',
      borderColor: 'hover:border-rose-500/50',
    },
    {
      title: 'Partner Network',
      value: totalResellers.toLocaleString(),
      subtitle: 'Reseller nodes',
      badge: 'NETWORK',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80 shadow-[0_0_10px_rgba(99,102,241,0.15)]',
      icon: Users,
      iconColor: 'text-indigo-400',
      gradient: 'from-indigo-950/30 to-slate-900',
      borderColor: 'hover:border-indigo-500/50',
    },
    {
      title: 'Token Circulation',
      value: totalTokensSpent.toLocaleString(),
      subtitle: 'Tokens consumed',
      badge: 'VELOCITY',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/80 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
      icon: Coins,
      iconColor: 'text-amber-400',
      gradient: 'from-amber-950/30 to-slate-900',
      borderColor: 'hover:border-amber-500/50',
    },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* Security Armor System Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Lock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-black text-white font-mono tracking-tight">
                ANTI-CRACK CRYPTOGRAPHIC DEFENSE SHIELD
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ARMED & ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Argon2id Salted Hashes • Anti-DDoS Lockout • Strict HWID Checksum Protocol • Replay Protection
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto text-[11px] font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Integrity: 100% Verified</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Anti-Replay: Active</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`bg-gradient-to-b ${c.gradient} border border-slate-800/90 ${c.borderColor} rounded-3xl p-4 sm:p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between space-y-3.5`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-[8px] font-mono font-black border rounded-md uppercase tracking-wider ${c.badgeBg}`}>
                  {c.badge}
                </span>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
                  <Icon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 tracking-tight">
                  {c.title}
                </div>
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight mt-0.5 ${c.iconColor}`}>
                  {c.value}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {c.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
