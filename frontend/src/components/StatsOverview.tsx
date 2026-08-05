"use client";

import React, { useState } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Users, 
  Coins, 
  TrendingUp, 
  ArrowUpRight, 
  Cpu, 
  Clock,
  Sparkles,
  Activity
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
  boundDevices: propBoundDevices,
  expiredKeys: propExpiredKeys,
  className = '',
}) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  // Extract metrics from stats object or fallback to direct props or defaults
  const totalKeys = stats?.totalKeys ?? propTotalKeys ?? 142;
  const activeKeys = stats?.activeKeys ?? propActiveKeys ?? 98;
  const totalResellers = stats?.totalResellers ?? propTotalResellers ?? 18;
  const totalRevenueTokens = stats?.totalRevenueTokens ?? propTotalRevenueTokens ?? 4250;
  const boundDevices = stats?.boundDevices ?? propBoundDevices ?? 84;
  const expiredKeys = stats?.expiredKeys ?? propExpiredKeys ?? 28;

  // Compute active ratio percentage
  const activePercent = totalKeys > 0 ? ((activeKeys / totalKeys) * 100).toFixed(1) : '0.0';

  // 4 Executive Stat Cards configuration with sparkline points & luxury styling
  const cards = [
    {
      id: 'total-keys',
      title: 'Total License Keys',
      value: totalKeys.toLocaleString(),
      subtitle: 'Issued across network',
      change: '+14.2%',
      isPositive: true,
      icon: Key,
      badgeText: 'Live Issuance',
      // Cyber Neon Purple Theme
      bgGradient: 'from-purple-950/50 via-slate-950/80 to-purple-900/20',
      borderColor: 'border-purple-500/30 hover:border-purple-500/70',
      glowColor: 'shadow-[0_0_30px_rgba(168,85,247,0.25)]',
      iconBoxBg: 'bg-purple-500/10 border-purple-500/40 text-purple-400',
      valueGradient: 'from-purple-200 via-fuchsia-300 to-purple-400',
      sparklineColor: '#c084fc',
      sparklineGradId: 'sparkGradPurple',
      sparklineData: [20, 28, 24, 38, 32, 45, 52, 48, 62, 58, 75, 88],
    },
    {
      id: 'active-licenses',
      title: 'Active Licenses',
      value: activeKeys.toLocaleString(),
      subtitle: `${activePercent}% utilization rate`,
      change: '+8.5%',
      isPositive: true,
      icon: ShieldCheck,
      badgeText: `${activePercent}% Active`,
      // Cyber Neon Emerald Theme
      bgGradient: 'from-emerald-950/50 via-slate-950/80 to-teal-900/20',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/70',
      glowColor: 'shadow-[0_0_30px_rgba(16,185,129,0.25)]',
      iconBoxBg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
      valueGradient: 'from-emerald-200 via-teal-300 to-emerald-400',
      sparklineColor: '#34d399',
      sparklineGradId: 'sparkGradEmerald',
      sparklineData: [15, 22, 18, 30, 26, 40, 48, 44, 55, 50, 68, 80],
    },
    {
      id: 'total-resellers',
      title: 'Total Resellers',
      value: totalResellers.toLocaleString(),
      subtitle: 'Verified partner accounts',
      change: '+25.0%',
      isPositive: true,
      icon: Users,
      badgeText: 'Network Partners',
      // Cyber Neon Amber Theme
      bgGradient: 'from-amber-950/50 via-slate-950/80 to-orange-900/20',
      borderColor: 'border-amber-500/30 hover:border-amber-500/70',
      glowColor: 'shadow-[0_0_30px_rgba(245,158,11,0.25)]',
      iconBoxBg: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
      valueGradient: 'from-amber-200 via-yellow-300 to-amber-400',
      sparklineColor: '#fbbf24',
      sparklineGradId: 'sparkGradAmber',
      sparklineData: [4, 6, 5, 8, 9, 11, 10, 14, 13, 15, 16, 18],
    },
    {
      id: 'token-revenue',
      title: 'Total Token Revenue',
      value: `${totalRevenueTokens.toLocaleString()}`,
      subtitle: 'Tokens consumed',
      change: '+18.6%',
      isPositive: true,
      icon: Coins,
      badgeText: 'Token Economy',
      // Cyber Neon Cyan Theme
      bgGradient: 'from-cyan-950/50 via-slate-950/80 to-blue-900/20',
      borderColor: 'border-cyan-500/30 hover:border-cyan-500/70',
      glowColor: 'shadow-[0_0_30px_rgba(6,182,212,0.25)]',
      iconBoxBg: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400',
      valueGradient: 'from-cyan-200 via-teal-300 to-blue-400',
      sparklineColor: '#22d3ee',
      sparklineGradId: 'sparkGradCyan',
      sparklineData: [400, 650, 520, 980, 850, 1400, 1250, 1900, 2300, 2100, 3200, 4250],
    },
  ];

  // Helper to draw SVG sparkline path
  const renderSparkline = (data: number[], color: string, gradId: string, isHovered: boolean) => {
    const width = 140;
    const height = 46;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - 4 - ((val - min) / range) * (height - 10);
      return { x, y };
    });

    // Build smooth curve path
    let dLine = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cx = (p1.x + p2.x) / 2;
      dLine += ` C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;
    }

    const dArea = `${dLine} L ${width} ${height} L 0 ${height} Z`;
    const lastPoint = points[points.length - 1];

    return (
      <svg className="w-full h-12 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={isHovered ? 0.45 : 0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Sparkline Area Fill */}
        <path d={dArea} fill={`url(#${gradId})`} className="transition-all duration-300" />

        {/* Sparkline Line Path */}
        <path
          d={dLine}
          fill="none"
          stroke={color}
          strokeWidth={isHovered ? 2.5 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />

        {/* Pulsing End Dot */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={isHovered ? 4 : 3}
          fill="#ffffff"
          stroke={color}
          strokeWidth={2}
          className="transition-all duration-300"
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={isHovered ? 8 : 6}
          fill={color}
          fillOpacity={0.4}
          className="animate-ping"
        />
      </svg>
    );
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isHovered = hoveredCard === idx;

        return (
          <div
            key={card.id}
            onMouseEnter={() => setHoveredCard(idx)}
            onMouseLeave={() => setHoveredCard(null)}
            className={`group relative overflow-hidden rounded-3xl p-6 border backdrop-blur-xl bg-gradient-to-br ${card.bgGradient} ${card.borderColor} transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] ${
              isHovered ? card.glowColor : 'shadow-xl'
            }`}
          >
            {/* Ambient Background Glow Effect on Hover */}
            <div
              className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none`}
              style={{ backgroundColor: card.sparklineColor }}
            />

            {/* Top Bar: Icon + Badge */}
            <div className="flex items-center justify-between relative z-10 mb-4">
              {/* Luxury Glowing Icon Container */}
              <div
                className={`p-3.5 rounded-2xl border ${card.iconBoxBg} backdrop-blur-md shadow-inner transition-transform duration-300 group-hover:scale-110`}
              >
                <Icon className="w-6 h-6 animate-pulse" />
              </div>

              {/* Percentage Growth Badge */}
              <div className="flex items-center space-x-1.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 text-emerald-400" />
                  {card.change}
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="relative z-10">
              <span className="text-xs font-mono uppercase tracking-widest font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                {card.title}
              </span>

              {/* Big Metric Value */}
              <div className="flex items-baseline space-x-2 mt-1 mb-1">
                <h3
                  className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${card.valueGradient}`}
                >
                  {card.value}
                </h3>
              </div>

              <p className="text-[11px] font-mono text-slate-400/80">
                {card.subtitle}
              </p>
            </div>

            {/* Bottom Sparkline Indicator */}
            <div className="mt-4 pt-2 relative z-10 flex items-center justify-between border-t border-slate-800/60">
              <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400">
                <Activity className="w-3 h-3 text-slate-400 group-hover:text-purple-400 transition-colors" />
                <span>7d Trend</span>
              </div>
              <div className="w-28 sm:w-32">
                {renderSparkline(card.sparklineData, card.sparklineColor, card.sparklineGradId, isHovered)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
