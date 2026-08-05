"use client";

import React from 'react';
import { 
  Key, 
  ShieldCheck, 
  Users, 
  Coins 
} from 'lucide-react';
import { StatsOverview as StatsOverviewType } from '@/types/key';

export interface StatsOverviewProps {
  stats?: Partial<StatsOverviewType>;
  totalKeys?: number;
  activeKeys?: number;
  totalResellers?: number;
  totalRevenueTokens?: number;
  boundDevices?: number;
  expiredKeys?: number;
  className?: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  totalKeys: propTotalKeys,
  activeKeys: propActiveKeys,
  totalResellers: propTotalResellers,
  totalRevenueTokens: propTotalRevenueTokens,
  className = '',
}) => {
  // Extract metrics from stats object or fallback to direct props or defaults
  const totalKeys = stats?.totalKeys ?? propTotalKeys ?? 0;
  const activeKeys = stats?.activeKeys ?? propActiveKeys ?? 0;
  const totalResellers = stats?.totalResellers ?? propTotalResellers ?? 0;
  const totalRevenueTokens = stats?.totalRevenueTokens ?? propTotalRevenueTokens ?? 0;

  // Compute active ratio percentage
  const activePercent = totalKeys > 0 ? ((activeKeys / totalKeys) * 100).toFixed(1) : '0.0';

  // 4 Executive Stat Cards: Total Keys, Active Licenses, Total Resellers, Token Revenue
  const cards = [
    {
      id: 'total-keys',
      title: 'Total Keys',
      value: totalKeys.toLocaleString(),
      subtitle: 'Total licenses issued',
      ratioLabel: '+14.2%',
      icon: Key,
    },
    {
      id: 'active-licenses',
      title: 'Active Licenses',
      value: activeKeys.toLocaleString(),
      subtitle: `${activeKeys} of ${totalKeys} active`,
      ratioLabel: `${activePercent}% Active`,
      icon: ShieldCheck,
    },
    {
      id: 'total-resellers',
      title: 'Total Resellers',
      value: totalResellers.toLocaleString(),
      subtitle: 'Registered network partners',
      ratioLabel: '+25.0%',
      icon: Users,
    },
    {
      id: 'token-revenue',
      title: 'Token Revenue',
      value: `${totalRevenueTokens.toLocaleString()}`,
      subtitle: 'Total tokens consumed',
      ratioLabel: '+18.6%',
      icon: Coins,
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
                {card.title}
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-zinc-400">
                <Icon className="w-4 h-4 text-zinc-400" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tracking-tight">
                {card.value}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/60">
                <span className="text-[11px] font-mono text-zinc-400 truncate mr-2">
                  {card.subtitle}
                </span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 shrink-0">
                  {card.ratioLabel}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

