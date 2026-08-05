"use client";

import React, { useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  BarChart2, 
  Calendar, 
  DollarSign, 
  Key, 
  Award,
  Zap,
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  Activity,
  Layers
} from 'lucide-react';
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
  title = "Sales & Token Revenue Intelligence",
  subtitle = "Real-time key issuance dynamics and token consumption analytics"
}) => {
  const [activeFilter, setActiveFilter] = useState<'7d' | '14d' | '30d'>('7d');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showRevenue, setShowRevenue] = useState<boolean>(true);
  const [showKeys, setShowKeys] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic datasets for 7d, 14d, 30d fallback generation if custom data isn't full
  const full30DayDataset = useMemo<SalesDataPoint[]>(() => {
    if (data && data.length >= 7) {
      // If user passed custom data, use or pad it
      return data;
    }

    // Default luxury sample data generator for 30 days
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

  // Aggregate metrics
  const aggregatedStats = useMemo(() => {
    const totalRev = activeDataset.reduce((acc, curr) => acc + curr.revenueTokens, 0);
    const totalKeys = activeDataset.reduce((acc, curr) => acc + curr.salesCount, 0);
    const avgConversion = totalKeys > 0 ? (totalRev / totalKeys).toFixed(1) : '0.0';

    // Find peak day
    let peakPoint = activeDataset[0];
    activeDataset.forEach((d) => {
      if (d.revenueTokens > peakPoint.revenueTokens) {
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

  // SVG Chart Geometry Constants
  const svgWidth = 900;
  const svgHeight = 300;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 45;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Max values for Y scales
  const maxRevenue = useMemo(() => {
    const maxVal = Math.max(...activeDataset.map((d) => d.revenueTokens), 100);
    return Math.ceil(maxVal * 1.15); // Add headroom
  }, [activeDataset]);

  const maxKeys = useMemo(() => {
    const maxVal = Math.max(...activeDataset.map((d) => d.salesCount), 10);
    return Math.ceil(maxVal * 1.2); // Add headroom
  }, [activeDataset]);

  // Points coordinates mapping
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

  // Helper to build smooth cubic Bezier curve path string
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

  // Paths
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

  // Handle Mouse Hover relative position
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgScaledX = (mouseX / rect.width) * svgWidth;

    // Find closest index
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
    <div className="glass-card rounded-3xl p-6 sm:p-7 border border-purple-500/30 glow-purple relative overflow-hidden transition-all duration-300">
      {/* Top Header: Title, Filters, Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        {/* Left Title & Subtitle */}
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 via-slate-900 to-cyan-500/20 border border-purple-500/40 rounded-2xl text-purple-300 shadow-glow-purple">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
              {title}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                <Sparkles className="w-3 h-3 mr-1 text-purple-400" />
                SVG Pro
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Right Controls: Filter Tabs + Legend Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Filter Tabs */}
          <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-2xl p-1 font-mono text-xs shadow-inner">
            {(['7d', '14d', '30d'] as const).map((tab) => {
              const label = tab === '7d' ? '7 Days' : tab === '14d' ? '14 Days' : '30 Days';
              const isActive = activeFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveFilter(tab);
                    setHoveredIdx(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Interactive Legend Toggles */}
          <div className="flex items-center space-x-2 bg-slate-950/90 border border-slate-800 rounded-2xl px-3 py-1.5 text-xs font-mono">
            {/* Tokens Revenue Legend */}
            <button
              onClick={() => setShowRevenue(!showRevenue)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg transition-all ${
                showRevenue
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-500 opacity-60 line-through'
              }`}
              title="Toggle Token Revenue curve"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              <span>Tokens Revenue</span>
              {showRevenue ? <Eye className="w-3 h-3 ml-1 text-cyan-400" /> : <EyeOff className="w-3 h-3 ml-1 text-slate-500" />}
            </button>

            {/* Keys Created Legend */}
            <button
              onClick={() => setShowKeys(!showKeys)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg transition-all ${
                showKeys
                  ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40'
                  : 'text-slate-500 opacity-60 line-through'
              }`}
              title="Toggle Keys Created curve"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></span>
              <span>Keys Created</span>
              {showKeys ? <Eye className="w-3 h-3 ml-1 text-purple-400" /> : <EyeOff className="w-3 h-3 ml-1 text-slate-500" />}
            </button>
          </div>
        </div>
      </div>

      {/* SVG Dual Area Chart Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        {/* Floating Glassmorphism Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-40 pointer-events-none transition-all duration-150 ease-out"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: '15px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-slate-950/90 border border-cyan-500/50 rounded-2xl p-3.5 shadow-[0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-2xl min-w-[170px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {hoveredPoint.data.date}
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                {/* Tokens Revenue */}
                <div className="flex items-center justify-between text-cyan-300 font-semibold">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <DollarSign className="w-3 h-3 text-cyan-400" />
                    Revenue:
                  </span>
                  <span>{hoveredPoint.data.revenueTokens.toLocaleString()} Tokens</span>
                </div>

                {/* Keys Issued */}
                <div className="flex items-center justify-between text-purple-300 font-semibold">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Key className="w-3 h-3 text-purple-400" />
                    Keys Issued:
                  </span>
                  <span>{hoveredPoint.data.salesCount} Keys</span>
                </div>

                {/* Ratio */}
                <div className="flex items-center justify-between text-emerald-400 text-[10px] pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Token Density:</span>
                  <span>
                    {hoveredPoint.data.salesCount > 0
                      ? (hoveredPoint.data.revenueTokens / hoveredPoint.data.salesCount).toFixed(1)
                      : '0'}{' '}
                    tok/key
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-72 sm:h-80 cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Gradient Fill for Token Revenue (Cyan) */}
            <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradient Fill for Keys Created (Purple) */}
            <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
            </linearGradient>

            {/* Vertical Laser Crosshair Gradient */}
            <linearGradient id="crosshairGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
            </linearGradient>

            {/* Glow Filter for Lines */}
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padTop + chartH * (1 - ratio);
            const tokenVal = Math.round(maxRevenue * ratio);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {tokenVal >= 1000 ? `${(tokenVal / 1000).toFixed(1)}k` : tokenVal}
                </text>
              </g>
            );
          })}

          {/* Token Revenue Gradient Area & Line */}
          {showRevenue && (
            <g>
              <path d={revAreaPath} fill="url(#cyanAreaGrad)" />
              <path
                d={revLinePath}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#cyanGlow)"
              />
            </g>
          )}

          {/* Keys Created Gradient Area & Line */}
          {showKeys && (
            <g>
              <path d={keysAreaPath} fill="url(#purpleAreaGrad)" />
              <path
                d={keysLinePath}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#purpleGlow)"
              />
            </g>
          )}

          {/* Interactive Crosshair & Glowing Hover Rings */}
          {hoveredPoint && (
            <g>
              {/* Vertical Laser Line */}
              <line
                x1={hoveredPoint.x}
                y1={padTop}
                x2={hoveredPoint.x}
                y2={padTop + chartH}
                stroke="url(#crosshairGrad)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Hover Dot: Token Revenue */}
              {showRevenue && (
                <g>
                  {/* Outer Pulsing Ring */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.yRev}
                    r="8"
                    fill="#06b6d4"
                    fillOpacity="0.4"
                    className="animate-ping"
                  />
                  {/* Outer Glow Ring */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.yRev}
                    r="6"
                    fill="#030712"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                  />
                  {/* Inner Solid White Core */}
                  <circle cx={hoveredPoint.x} cy={hoveredPoint.yRev} r="2.5" fill="#ffffff" />
                </g>
              )}

              {/* Hover Dot: Keys Created */}
              {showKeys && (
                <g>
                  {/* Outer Pulsing Ring */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.yKeys}
                    r="8"
                    fill="#a855f7"
                    fillOpacity="0.4"
                    className="animate-ping"
                  />
                  {/* Outer Glow Ring */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.yKeys}
                    r="5.5"
                    fill="#030712"
                    stroke="#c084fc"
                    strokeWidth="2.5"
                  />
                  {/* Inner Solid White Core */}
                  <circle cx={hoveredPoint.x} cy={hoveredPoint.yKeys} r="2" fill="#ffffff" />
                </g>
              )}
            </g>
          )}

          {/* X-Axis Dates Ticks & Labels */}
          {points.map((p, idx) => {
            // Show all labels if <= 10 items, else skip every second item
            const showLabel = points.length <= 10 || idx % Math.ceil(points.length / 10) === 0 || idx === points.length - 1;
            const isHovered = hoveredIdx === idx;

            return (
              <g key={idx}>
                {showLabel && (
                  <text
                    x={p.x}
                    y={svgHeight - 12}
                    fill={isHovered ? '#22d3ee' : '#64748b'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="transition-colors duration-200"
                  >
                    {p.data.date}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Executive Metrics Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
        {/* Period Revenue */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-center space-x-3.5 hover:border-cyan-500/40 transition-colors">
          <div className="p-3 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">Period Revenue</span>
            <span className="text-lg font-bold text-cyan-300 font-mono">
              {aggregatedStats.periodRevenue.toLocaleString()} Tokens
            </span>
          </div>
        </div>

        {/* Total Licenses Sold */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-center space-x-3.5 hover:border-purple-500/40 transition-colors">
          <div className="p-3 rounded-xl bg-purple-950/80 text-purple-300 border border-purple-800/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">Total Issued</span>
            <span className="text-lg font-bold text-purple-300 font-mono">
              {aggregatedStats.periodKeys.toLocaleString()} Keys
            </span>
          </div>
        </div>

        {/* Avg Conversion */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-center space-x-3.5 hover:border-emerald-500/40 transition-colors">
          <div className="p-3 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">Avg Conversion</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {aggregatedStats.avgConversion} Tok / Key
            </span>
          </div>
        </div>

        {/* Peak Volume Day */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex items-center space-x-3.5 hover:border-amber-500/40 transition-colors">
          <div className="p-3 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider block">Peak Day</span>
            <span className="text-lg font-bold text-amber-300 font-mono">
              {aggregatedStats.peakDay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
