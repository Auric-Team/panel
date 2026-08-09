"use client";

import React from 'react';
import { Key, ShieldCheck, Cpu, Clock, Users, Coins, Activity, TrendingUp, Zap } from 'lucide-react';
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

  const cards = [
    {
      title: 'Total License Keys',
      value: totalKeys.toLocaleString(),
      badge: 'SYSTEM TOTAL',
      badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
      icon: Key,
      iconColor: 'text-purple-400',
      hoverGlow: 'hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]',
      gradient: 'from-purple-500/10 to-transparent',
    },
    {
      title: 'Active Licenses',
      value: activeKeys.toLocaleString(),
      badge: 'LIVE NOW',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      hoverGlow: 'hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      gradient: 'from-emerald-500/10 to-transparent',
    },
    {
      title: 'Bound Hardware Devices',
      value: boundDevices.toLocaleString(),
      badge: 'HWID LOCKED',
      badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
      icon: Cpu,
      iconColor: 'text-cyan-400',
      hoverGlow: 'hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)]',
      gradient: 'from-cyan-500/10 to-transparent',
    },
    {
      title: 'Expired / Revoked Keys',
      value: expiredKeys.toLocaleString(),
      badge: 'INACTIVE',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
      icon: Clock,
      iconColor: 'text-rose-400',
      hoverGlow: 'hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.2)]',
      gradient: 'from-rose-500/10 to-transparent',
    },
    {
      title: 'Total Resellers',
      value: totalResellers.toLocaleString(),
      badge: 'NETWORK',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
      icon: Users,
      iconColor: 'text-indigo-400',
      hoverGlow: 'hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.2)]',
      gradient: 'from-indigo-500/10 to-transparent',
    },
    {
      title: 'Total Token Volume',
      value: totalTokensSpent.toLocaleString(),
      badge: 'VELOCITY',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
      icon: Coins,
      iconColor: 'text-amber-400',
      hoverGlow: 'hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]',
      gradient: 'from-amber-500/10 to-transparent',
    },
  ];

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner / System Telemetry Summary */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/10 transition-all duration-500" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/10 transition-all duration-500" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Zap className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>Executive Command Telemetry</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 uppercase font-bold">
                  Real-time
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              High-frequency license telemetry, hardware binding activity, and active token distribution status across your global reseller matrix.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <div className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-300">Engine Status: <strong className="text-emerald-400 font-extrabold">OPTIMAL</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group ${c.hoverGlow}`}
            >
              {/* Subtle top subtle gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-b ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

              <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 text-[9px] font-extrabold border rounded-full uppercase tracking-wider ${c.badgeBg}`}>
                    {c.badge}
                  </span>
                  <div className="p-2 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-slate-300 group-hover:border-slate-700 transition">
                    <Icon className={`w-4 h-4 ${c.iconColor}`} />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
                    {c.title}
                  </div>
                  <div className={`text-2xl font-black tracking-tight mt-1 ${c.iconColor}`}>
                    {c.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
