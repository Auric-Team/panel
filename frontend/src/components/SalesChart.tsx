"use client";

import React, { useState, useMemo, useRef } from 'react';
import { SalesDataPoint } from '@/types/key';

export interface SalesChartProps {
  data?: SalesDataPoint[];
  totalRevenue?: number;
  totalKeysSold?: number;
  title?: string;
  subtitle?: string;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data = [],
  totalRevenue: propTotalRevenue,
  totalKeysSold: propTotalKeysSold,
  title = "Sales & Token Analytics",
  subtitle = "Key issuance trends and token consumption over time"
}) => {
  const [activeFilter, setActiveFilter] = useState<'7d' | '14d' | '30d'>('7d');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showRevenue, setShowRevenue] = useState<boolean>(true);
  const [showKeys, setShowKeys] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic dataset fallback for 30 days if custom data isn't full
  const full30DayDataset = useMemo<SalesDataPoint[]>(() => {
    if (data && data.length >= 7) {
      return data;
    }

    const dates = [
      'Jul 07', 'Jul 08', 'Jul 09', 'Jul 10', 'Jul 11', 'Jul 12', 'Jul 13',
      'Jul 14', 'Jul 15', 'Jul 16', 'Jul 17', 'Jul 18', 'Jul 19', 'Jul 20',
      'Jul 21', 'Jul 22', 'Jul 23', 'Jul 24', 'Jul 25', 'Jul 26', 'Jul 27',
      'Jul 28', 'Jul 29', 'Jul 30', 'Jul 31', 'Aug 01', 'Aug 02', 'Aug 03',
      'Aug 04', 'Aug 05'
    ];

    const salesCounts = [
      8, 12, 10, 15, 14, 18, 22, 19, 25, 28, 24, 30, 35, 32, 28,
      34, 40, 38, 42, 45, 50, 48, 55, 52, 60, 58, 64, 70, 68, 75
    ];

    const tokenRevenues = salesCounts.map((count, idx) => {
      const baseRatio = 28 + (idx % 5) * 2;
      return count * baseRatio;
    });

    return dates.map((date, idx) => ({
      date,
      salesCount: salesCounts[idx],
      revenueTokens: tokenRevenues[idx],
    }));
  }, [data]);

  // Slice dataset according to activeFilter
  const activeDataset = useMemo<SalesDataPoint[]>(() => {
    if (activeFilter === '7d') {
      return full30DayDataset.slice(-7);
    } else if (activeFilter === '14d') {
      return full30DayDataset.slice(-14);
    } else {
      return full30DayDataset.slice(-30);
    }
  }, [full30DayDataset, activeFilter]);

  // Aggregated summary metrics
  const aggregatedStats = useMemo(() => {
    const totalRev = activeDataset.reduce((acc, curr) => acc + curr.revenueTokens, 0);
    const totalKeys = activeDataset.reduce((acc, curr) => acc + curr.salesCount, 0);
    const avgConversion = totalKeys > 0 ? (totalRev / totalKeys).toFixed(1) : '0.0';

    let peakPoint = activeDataset[0];
    activeDataset.forEach((d) => {
      if (d.revenueTokens > (peakPoint?.revenueTokens || 0)) {
        peakPoint = d;
      }
    });

    return {
      periodRevenue: propTotalRevenue ?? totalRev,
      periodKeys: propTotalKeysSold ?? totalKeys,
      avgConversion,
      peakDay: peakPoint ? peakPoint.date : 'N/A',
      peakTokens: peakPoint ? peakPoint.revenueTokens : 0,
    };
  }, [activeDataset, propTotalRevenue, propTotalKeysSold]);

  // SVG Dimensions & Margins
  const svgWidth = 800;
  const svgHeight = 240;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxRevenue = useMemo(() => {
    const maxVal = Math.max(...activeDataset.map((d) => d.revenueTokens), 100);
    return Math.ceil(maxVal * 1.15);
  }, [activeDataset]);

  const maxKeys = useMemo(() => {
    const maxVal = Math.max(...activeDataset.map((d) => d.salesCount), 10);
    return Math.ceil(maxVal * 1.2);
  }, [activeDataset]);

  // Map data to SVG points
  const points = useMemo(() => {
    const n = activeDataset.length;
    return activeDataset.map((item, idx) => {
      const x = padLeft + (idx / Math.max(n - 1, 1)) * chartW;
      const yRev = padTop + chartH - (item.revenueTokens / maxRevenue) * chartH;
      const yKeys = padTop + chartH - (item.salesCount / maxKeys) * chartH;
      return {
        x,
        yRev,
        yKeys,
        data: item,
      };
    });
  }, [activeDataset, maxRevenue, maxKeys, padLeft, padTop, chartW, chartH]);

  // Build smooth cubic Bezier curve path string
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cp1x = curr.x + (next.x - curr.x) * 0.4;
      const cp1y = curr.y;
      const cp2x = next.x - (next.x - curr.x) * 0.4;
      const cp2y = next.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const revPoints = points.map((p) => ({ x: p.x, y: p.yRev }));
  const keysPoints = points.map((p) => ({ x: p.x, y: p.yKeys }));

  const revLinePath = useMemo(() => buildSmoothPath(revPoints), [revPoints]);
  const keysLinePath = useMemo(() => buildSmoothPath(keysPoints), [keysPoints]);

  const revAreaPath = useMemo(() => {
    if (revPoints.length === 0) return '';
    const lastX = revPoints[revPoints.length - 1].x;
    const firstX = revPoints[0].x;
    const bottomY = padTop + chartH;
    return `${revLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [revLinePath, revPoints, padTop, chartH]);

  const keysAreaPath = useMemo(() => {
    if (keysPoints.length === 0) return '';
    const lastX = keysPoints[keysPoints.length - 1].x;
    const firstX = keysPoints[0].x;
    const bottomY = padTop + chartH;
    return `${keysLinePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [keysLinePath, keysPoints, padTop, chartH]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgScaledX = (mouseX / rect.width) * svgWidth;

    let closestIdx = 0;
    let minDistance = Infinity;

    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - svgScaledX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
  };

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              {title}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        </div>

        {/* Timeframe & Legend Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe selector tabs */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-mono">
            {(['7d', '14d', '30d'] as const).map((tab) => {
              const label = tab === '7d' ? '7D' : tab === '14d' ? '14D' : '30D';
              const isActive = activeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveFilter(tab);
                    setHoveredIdx(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700/60 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Minimal Legend Toggles */}
          <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setShowRevenue(!showRevenue)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-md transition-colors ${
                showRevenue ? 'text-violet-300 bg-violet-950/40 border border-violet-800/40' : 'text-zinc-500 opacity-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              <span>Revenue</span>
            </button>
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-md transition-colors ${
                showKeys ? 'text-zinc-300 bg-zinc-800/60 border border-zinc-700/50' : 'text-zinc-500 opacity-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
              <span>Keys</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        {/* Sleek Minimal Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-100 ease-out"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: '8px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-zinc-900/95 border border-zinc-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[150px] text-xs font-mono text-zinc-200">
              <div className="text-[11px] text-zinc-400 font-medium pb-1.5 border-b border-zinc-800 flex items-center justify-between">
                <span>{hoveredPoint.data.date}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              </div>

              <div className="space-y-1 pt-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Tokens:</span>
                  <span className="font-semibold text-violet-300">{hoveredPoint.data.revenueTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Keys Issued:</span>
                  <span className="font-semibold text-zinc-200">{hoveredPoint.data.salesCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 sm:h-64 cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Soft Violet Area Gradient */}
            <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle Neutral Area Gradient */}
            <linearGradient id="neutralGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines & Y-Axis Labels */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = padTop + chartH * (1 - ratio);
            const tokenVal = Math.round(maxRevenue * ratio);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {tokenVal >= 1000 ? `${(tokenVal / 1000).toFixed(1)}k` : tokenVal}
                </text>
              </g>
            );
          })}

          {/* Revenue Curve & Gradient Area */}
          {showRevenue && (
            <g>
              <path d={revAreaPath} fill="url(#violetGradient)" />
              <path
                d={revLinePath}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Keys Curve & Gradient Area */}
          {showKeys && (
            <g>
              <path d={keysAreaPath} fill="url(#neutralGradient)" />
              <path
                d={keysLinePath}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth="1.5"
                strokeDasharray={showRevenue ? "3 3" : "none"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Interactive Hover Vertical Laser Line & Indicators */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padTop}
                x2={hoveredPoint.x}
                y2={padTop + chartH}
                stroke="#52525b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {showRevenue && (
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.yRev}
                  r="4"
                  fill="#8b5cf6"
                  stroke="#18181b"
                  strokeWidth="2"
                />
              )}

              {showKeys && (
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.yKeys}
                  r="3.5"
                  fill="#a1a1aa"
                  stroke="#18181b"
                  strokeWidth="2"
                />
              )}
            </g>
          )}

          {/* X-Axis Ticks & Dates */}
          {points.map((p, idx) => {
            const showLabel = points.length <= 10 || idx % Math.ceil(points.length / 10) === 0 || idx === points.length - 1;
            const isHovered = hoveredIdx === idx;

            return (
              <g key={idx}>
                {showLabel && (
                  <text
                    x={p.x}
                    y={svgHeight - 8}
                    fill={isHovered ? '#f4f4f5' : '#71717a'}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight={isHovered ? '600' : '400'}
                    textAnchor="middle"
                  >
                    {p.data.date}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sleek Summary Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800/80 font-mono">
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Period Revenue</span>
          <span className="text-sm font-semibold text-zinc-100 mt-0.5 block">
            {aggregatedStats.periodRevenue.toLocaleString()} Tokens
          </span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Issued</span>
          <span className="text-sm font-semibold text-zinc-100 mt-0.5 block">
            {aggregatedStats.periodKeys.toLocaleString()} Keys
          </span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Avg Rate</span>
          <span className="text-sm font-semibold text-zinc-100 mt-0.5 block">
            {aggregatedStats.avgConversion} Tok/Key
          </span>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Peak Day</span>
          <span className="text-sm font-semibold text-zinc-100 mt-0.5 block">
            {aggregatedStats.peakDay}
          </span>
        </div>
      </div>
    </div>
  );
};
