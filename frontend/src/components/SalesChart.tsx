"use client";

import React, { useMemo, useState } from 'react';
import { TrendingUp, Coins, Key, BarChart3, LineChart, Calendar } from 'lucide-react';
import { SalesDataPoint } from '@/types/key';

interface SalesChartProps {
  data: SalesDataPoint[];
  totalRevenue?: number;
  totalKeysSold?: number;
  title?: string;
  subtitle?: string;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data,
  totalRevenue = 0,
  totalKeysSold = 0,
  title = 'Global License Issuance & Token Velocity',
  subtitle = 'Real-time telemetry stream of license activation and token volume',
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '14d' | '30d'>('14d');
  const [chartMode, setChartMode] = useState<'bars' | 'area'>('bars');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const count = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : 30;
    return data.slice(-count);
  }, [data, timeframe]);

  const statsSummary = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { peakCount: 0, peakTokens: 0, avgKeys: 0 };
    }
    const maxKeys = Math.max(...filteredData.map((d) => d.salesCount || 0));
    const maxTokens = Math.max(...filteredData.map((d) => d.revenueTokens || 0));
    const totalK = filteredData.reduce((acc, curr) => acc + (curr.salesCount || 0), 0);
    const avgKeys = Math.round(totalK / filteredData.length);
    return { peakCount: maxKeys, peakTokens: maxTokens, avgKeys };
  }, [filteredData]);

  const maxCount = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return 10;
    const m = Math.max(...filteredData.map((d) => d.salesCount || 0));
    return m === 0 ? 10 : m;
  }, [filteredData]);

  return (
    <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 font-mono text-xs backdrop-blur-2xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-black text-white tracking-tight">{title}</h3>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 rounded-full">
              LIVE METRICS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1 shadow-inner">
            {(['7d', '14d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-[10px] font-bold rounded-xl transition-all ${
                  timeframe === tf
                    ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Key & Token Legends */}
          <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-2xl text-[11px]">
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="text-slate-300">
                Issued: <strong className="text-white font-bold">{totalKeysSold}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5 border-l border-slate-800 pl-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span className="text-slate-300">
                Tokens: <strong className="text-amber-400 font-bold">{totalRevenue.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Pill Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Peak Daily Keys</div>
            <div className="text-base font-bold text-cyan-400 mt-0.5">{statsSummary.peakCount} Keys</div>
          </div>
          <Key className="w-4 h-4 text-cyan-400/60" />
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Avg Daily Keys</div>
            <div className="text-base font-bold text-slate-200 mt-0.5">{statsSummary.avgKeys} Keys</div>
          </div>
          <TrendingUp className="w-4 h-4 text-slate-400/60" />
        </div>
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">Peak Daily Tokens</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">{statsSummary.peakTokens.toLocaleString()} T</div>
          </div>
          <Coins className="w-4 h-4 text-amber-400/60" />
        </div>
      </div>

      {/* Interactive Graphic Visualization */}
      <div className="h-52 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-slate-950/50 rounded-2xl border border-slate-800/50 relative overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="w-full text-center text-slate-500 my-auto font-sans py-8">
            No license velocity data found for the selected {timeframe.toUpperCase()} timeframe.
          </div>
        ) : (
          filteredData.map((item, idx) => {
            const heightPercent = Math.max(10, Math.round(((item.salesCount || 0) / maxCount) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-950 border border-cyan-500/40 text-slate-200 text-[10px] p-2.5 rounded-xl mb-2 pointer-events-none whitespace-nowrap absolute bottom-full z-20 font-mono shadow-2xl backdrop-blur-xl">
                  <div className="text-slate-400 font-semibold border-b border-slate-800 pb-1 mb-1">{item.date}</div>
                  <div className="text-cyan-400 font-extrabold flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    <span>{item.salesCount || 0} Licenses Issued</span>
                  </div>
                  <div className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Coins className="w-3 h-3" />
                    <span>{(item.revenueTokens || 0).toLocaleString()} Tokens Consumed</span>
                  </div>
                </div>

                {/* Animated Pillar Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[36px] bg-slate-800/80 group-hover:bg-cyan-500 rounded-t-xl transition-all duration-200 relative overflow-hidden group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] cursor-pointer"
                >
                  <div
                    style={{
                      height: `${Math.min(100, ((item.revenueTokens || 0) / (maxCount * 70 || 1)) * 100)}%`,
                    }}
                    className="w-full bg-gradient-to-t from-amber-500/50 to-amber-400/20 absolute bottom-0 transition-all duration-200"
                  />
                </div>

                {/* Date Label */}
                <span className="text-[9px] text-slate-500 group-hover:text-cyan-400 transition-colors truncate max-w-[42px] mt-2 font-mono">
                  {item.date.slice(5)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
