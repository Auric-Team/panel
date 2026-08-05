"use client";

import React, { useState } from 'react';
import { TrendingUp, BarChart2, Calendar, DollarSign, Key, Award } from 'lucide-react';
import { SalesDataPoint } from '@/types/key';

interface SalesChartProps {
  data?: SalesDataPoint[];
  totalRevenue?: number;
  totalKeysSold?: number;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data = [],
  totalRevenue = 4250,
  totalKeysSold = 142,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Fallback demo data if data is empty
  const defaultHistory: SalesDataPoint[] = [
    { date: 'Jul 30', salesCount: 12, revenueTokens: 360 },
    { date: 'Jul 31', salesCount: 18, revenueTokens: 540 },
    { date: 'Aug 01', salesCount: 15, revenueTokens: 450 },
    { date: 'Aug 02', salesCount: 24, revenueTokens: 720 },
    { date: 'Aug 03', salesCount: 30, revenueTokens: 900 },
    { date: 'Aug 04', salesCount: 22, revenueTokens: 660 },
    { date: 'Aug 05', salesCount: 21, revenueTokens: 620 },
  ];

  const chartData = data && data.length > 0 ? data : defaultHistory;
  const maxRevenue = Math.max(...chartData.map((d) => d.revenueTokens), 100);

  return (
    <div className="glass-card rounded-3xl p-6 border border-purple-500/30 glow-purple">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/40 rounded-2xl text-purple-400">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Sales & Token Revenue History</h3>
            <p className="text-xs text-slate-400 font-mono">Daily key issuances and token consumption metrics</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">Revenue (Tokens)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span className="text-slate-300">Keys Sold</span>
          </div>
        </div>
      </div>

      {/* SVG Bar & Line Chart Container */}
      <div className="relative pt-6 pb-2">
        <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2">
          {chartData.map((item, idx) => {
            const heightPercent = Math.min(100, Math.max(15, (item.revenueTokens / maxRevenue) * 100));
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <div className="absolute -top-16 z-30 bg-slate-950 border border-purple-500/60 rounded-xl p-2.5 shadow-2xl text-center min-w-[120px] backdrop-blur-md animate-in fade-in zoom-in duration-150">
                    <div className="text-[11px] font-mono text-purple-300 font-bold">{item.date}</div>
                    <div className="text-xs font-bold text-cyan-400 font-mono">{item.revenueTokens} Tokens</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.salesCount} Keys Issued</div>
                  </div>
                )}

                {/* Animated Gradient Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-xl transition-all duration-300 relative flex items-start justify-center ${
                    isHovered
                      ? 'bg-gradient-to-t from-purple-600 via-indigo-500 to-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105'
                      : 'bg-gradient-to-t from-slate-900 via-purple-950/80 to-purple-600/70 border-t border-purple-400/40'
                  }`}
                >
                  {/* Top indicator dot */}
                  <div className="w-2 h-2 rounded-full bg-cyan-300 shadow-glow-cyan -mt-1 opacity-80"></div>
                </div>

                {/* X-axis date label */}
                <span className="mt-3 text-[11px] font-mono text-slate-400 group-hover:text-purple-300 font-semibold transition-colors">
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">Period Revenue</span>
            <span className="text-lg font-bold text-cyan-300 font-mono">{totalRevenue.toLocaleString()} Tokens</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-950 text-purple-300 border border-purple-800/50">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">Total Licenses Sold</span>
            <span className="text-lg font-bold text-purple-300 font-mono">{totalKeysSold} Keys</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">Avg Conversion</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">30 Tokens / key</span>
          </div>
        </div>
      </div>
    </div>
  );
};
