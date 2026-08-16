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
      title: 'Active Licenses',
      value: activeKeys.toLocaleString(),
      badge: 'LIVE NOW',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Bound Hardware Devices',
      value: boundDevices.toLocaleString(),
      badge: 'HWID LOCKED',
      badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
      icon: Cpu,
      iconColor: 'text-cyan-400',
    },
    {
      title: 'Total License Keys',
      value: totalKeys.toLocaleString(),
      badge: 'ALL TIME',
      badgeBg: 'bg-slate-950 text-slate-300 border-slate-800',
      icon: Key,
      iconColor: 'text-slate-200',
    },
    {
      title: 'Expired / Inactive',
      value: expiredKeys.toLocaleString(),
      badge: 'EXPIRED',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
      icon: Clock,
      iconColor: 'text-rose-400',
    },
    {
      title: 'Partner Resellers',
      value: totalResellers.toLocaleString(),
      badge: 'NETWORK',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
      icon: Users,
      iconColor: 'text-indigo-400',
    },
    {
      title: 'Token Volume Velocity',
      value: totalTokensSpent.toLocaleString(),
      badge: 'TOKENS',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
      icon: Coins,
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-lg hover:border-slate-700 transition flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-[8px] font-mono font-bold border rounded-md uppercase ${c.badgeBg}`}>
                  {c.badge}
                </span>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                  <Icon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-400 tracking-tight">
                  {c.title}
                </div>
                <div className={`text-xl font-bold font-mono tracking-tight mt-0.5 ${c.iconColor}`}>
                  {c.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
