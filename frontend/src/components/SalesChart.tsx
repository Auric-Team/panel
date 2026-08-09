"use client";

import React, { useMemo } from 'react';
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
  title = 'License Sales Trajectory',
  subtitle = '14-Day key issuance and token volume timeline',
}) => {
  const maxCount = useMemo(() => {
    if (!data || data.length === 0) return 10;
    const m = Math.max(...data.map((d) => d.salesCount));
    return m === 0 ? 10 : m;
  }, [data]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Keys Issued: <strong className="text-white">{totalKeysSold}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Tokens: <strong className="text-amber-400">{totalRevenue.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart Visualization */}
      <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4 pb-2 px-1">
        {data.length === 0 ? (
          <div className="w-full text-center text-slate-500 my-auto font-sans">
            No sales activity recorded for this period.
          </div>
        ) : (
          data.map((item, idx) => {
            const heightPercent = Math.max(8, Math.round((item.salesCount / maxCount) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition bg-slate-950 border border-slate-700 text-slate-200 text-[10px] p-1.5 rounded-lg mb-1 pointer-events-none whitespace-nowrap z-10 font-mono shadow-md">
                  <div>{item.date}</div>
                  <div className="text-cyan-400 font-bold">{item.salesCount} Keys</div>
                  <div className="text-amber-400">{item.revenueTokens} Tokens</div>
                </div>

                {/* Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[28px] bg-slate-800 group-hover:bg-cyan-500 rounded-t-md transition-all relative overflow-hidden"
                >
                  <div
                    style={{ height: `${Math.min(100, (item.revenueTokens / (maxCount * 70)) * 100)}%` }}
                    className="w-full bg-amber-500/40 absolute bottom-0"
                  />
                </div>

                {/* Date Label */}
                <span className="text-[9px] text-slate-500 truncate max-w-[36px] mt-1.5">
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
