"use client";

import React, { useMemo, useState } from 'react';
import { TrendingUp, Coins, Key } from 'lucide-react';
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
    <div className="ref-card p-5 sm:p-7 space-y-6 font-sans text-xs">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-soft">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-display text-base sm:text-lg font-normal text-ink tracking-tight">{title}</h3>
            <span className="ref-badge success text-[10px]">
              Live Metrics
            </span>
          </div>
          <p className="text-[11px] text-muted mt-0.5 font-sans">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Switcher */}
          <div className="ref-tab-list">
            {(['7d', '14d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`ref-tab-btn py-1 px-2.5 text-[10px] font-mono ${
                  timeframe === tf ? 'active' : ''
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Key & Token Legends */}
          <div className="flex items-center space-x-3 bg-surface border border-border-soft px-3 py-1.5 rounded-md text-[11px] font-mono shadow-sm">
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-muted">
                Issued: <strong className="text-ink font-bold">{totalKeysSold}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5 border-l border-line pl-2.5">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-muted">
                Tokens: <strong className="text-warning font-bold">{totalRevenue.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Pill Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ref-card-subtle p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] text-muted uppercase font-sans font-medium">Peak Daily Keys</div>
            <div className="font-display text-lg text-ink mt-0.5">{statsSummary.peakCount} Keys</div>
          </div>
          <div className="w-8 h-8 rounded-sm bg-surface border border-border-soft flex items-center justify-center text-accent">
            <Key className="w-4 h-4" />
          </div>
        </div>

        <div className="ref-card-subtle p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] text-muted uppercase font-sans font-medium">Avg Daily Keys</div>
            <div className="font-display text-lg text-ink mt-0.5">{statsSummary.avgKeys} Keys</div>
          </div>
          <div className="w-8 h-8 rounded-sm bg-surface border border-border-soft flex items-center justify-center text-muted">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="ref-card-subtle p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] text-muted uppercase font-sans font-medium">Peak Daily Tokens</div>
            <div className="font-display text-lg text-warning mt-0.5">{statsSummary.peakTokens.toLocaleString()} T</div>
          </div>
          <div className="w-8 h-8 rounded-sm bg-surface border border-border-soft flex items-center justify-center text-warning">
            <Coins className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Interactive Graphic Visualization */}
      <div className="h-56 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-3 bg-surface border border-border-soft rounded-md relative overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="w-full text-center text-muted my-auto font-sans py-8">
            No license velocity data found for the selected {timeframe.toUpperCase()} timeframe.
          </div>
        ) : (
          filteredData.map((item, idx) => {
            const heightPercent = Math.max(10, Math.round(((item.salesCount || 0) / maxCount) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-tooltip text-tooltip-ink text-[10px] p-2 rounded-sm mb-2 pointer-events-none whitespace-nowrap absolute bottom-full z-20 font-sans shadow-md border border-border-soft">
                  <div className="font-semibold border-b border-white/10 pb-0.5 mb-1">{item.date}</div>
                  <div className="flex items-center gap-1 font-mono">
                    <Key className="w-3 h-3" />
                    <span>{item.salesCount || 0} Licenses Issued</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 font-mono opacity-90">
                    <Coins className="w-3 h-3 text-warning" />
                    <span>{(item.revenueTokens || 0).toLocaleString()} Tokens Consumed</span>
                  </div>
                </div>

                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[32px] bg-border group-hover:bg-accent rounded-t-sm transition-colors duration-150 relative overflow-hidden cursor-pointer"
                >
                  <div
                    style={{
                      height: `${Math.min(100, ((item.revenueTokens || 0) / (maxCount * 70 || 1)) * 100)}%`,
                    }}
                    className="w-full bg-warning/40 absolute bottom-0 transition-all duration-150"
                  />
                </div>

                {/* Date Label */}
                <span className="text-[9px] text-muted group-hover:text-ink transition-colors truncate max-w-[42px] mt-2 font-mono">
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
