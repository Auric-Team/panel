"use client";

import React from 'react';
import {
  Key,
  ShieldCheck,
  Cpu,
  Clock,
  Users,
  Coins,
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
      subtitle: `${activeRatio}% active license pool`,
      badge: 'Protected',
      badgeClass: 'ref-badge success',
      icon: ShieldCheck,
      iconClass: 'text-success',
    },
    {
      title: 'Bound Hardware (HWID)',
      value: boundDevices.toLocaleString(),
      subtitle: 'Tethered client devices',
      badge: 'Anti-Clone',
      badgeClass: 'ref-badge info',
      icon: Cpu,
      iconClass: 'text-info',
    },
    {
      title: 'Total Generated Keys',
      value: totalKeys.toLocaleString(),
      subtitle: 'All-time issued licenses',
      badge: 'Registry',
      badgeClass: 'ref-badge',
      icon: Key,
      iconClass: 'text-muted',
    },
    {
      title: 'Expired / Dormant',
      value: expiredKeys.toLocaleString(),
      subtitle: 'Inactive or lapsed keys',
      badge: 'Expired',
      badgeClass: 'ref-badge danger',
      icon: Clock,
      iconClass: 'text-danger',
    },
    {
      title: 'Partner Network',
      value: totalResellers.toLocaleString(),
      subtitle: 'Authorized reseller nodes',
      badge: 'Network',
      badgeClass: 'ref-badge info',
      icon: Users,
      iconClass: 'text-info',
    },
    {
      title: 'Token Circulation',
      value: totalTokensSpent.toLocaleString(),
      subtitle: 'Total tokens consumed',
      badge: 'Tokens',
      badgeClass: 'ref-badge warning',
      icon: Coins,
      iconClass: 'text-warning',
    },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* Security Defense System Status Banner */}
      <div className="ref-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-md bg-surface border border-border-soft flex items-center justify-center text-accent shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display text-base font-normal text-ink tracking-tight">
                Cryptographic Defense Shield
              </h2>
              <span className="ref-badge success text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-muted font-sans mt-0.5">
              Argon2id Salted Hashes &bull; Anti-DDoS Lockout &bull; Strict HWID Checksum Protocol &bull; Replay Protection
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto text-[11px] font-mono">
          <div className="px-3 py-1.5 rounded-sm bg-surface border border-border-soft text-ink flex items-center gap-1.5 whitespace-nowrap shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span>Integrity: 100%</span>
          </div>
          <div className="px-3 py-1.5 rounded-sm bg-surface border border-border-soft text-ink flex items-center gap-1.5 whitespace-nowrap shadow-sm">
            <Radio className="w-3.5 h-3.5 text-info animate-pulse" />
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
              className="ref-card p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:border-border transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className={c.badgeClass}>
                  {c.badge}
                </span>
                <div className="w-8 h-8 rounded-sm bg-surface border border-border-soft flex items-center justify-center shadow-sm">
                  <Icon className={`w-4 h-4 ${c.iconClass}`} />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium text-muted tracking-tight">
                  {c.title}
                </div>
                <div className="font-display text-2xl font-normal text-ink tracking-tight mt-0.5">
                  {c.value}
                </div>
                <div className="text-[10px] text-muted font-sans mt-0.5">
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
