"use client";

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ExpirationProgressBarProps {
  createdAt?: string;
  expiresAt?: string | null;
  status?: string;
  showTimerText?: boolean;
}

export const ExpirationProgressBar: React.FC<ExpirationProgressBarProps> = ({
  createdAt,
  expiresAt,
  status,
  showTimerText = true,
}) => {
  const [now, setNow] = useState<number>(Date.now());

  // Tick live every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isLifetime = !expiresAt || expiresAt === 'never';
  const expiresTime = expiresAt && !isLifetime ? new Date(expiresAt).getTime() : null;
  const createdTime = createdAt ? new Date(createdAt).getTime() : now - 24 * 60 * 60 * 1000;

  const isExpired =
    status === 'expired' ||
    (expiresTime !== null && expiresTime <= now);

  if (isLifetime) {
    return (
      <div className="space-y-1 w-full font-mono text-[11px]">
        {showTimerText && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Lifetime Access</span>
            </span>
            <span className="text-emerald-400/80 font-extrabold text-[9px] uppercase tracking-wider">
              ∞ Never
            </span>
          </div>
        )}
        <div className="w-full h-2 bg-slate-950 rounded-full border border-emerald-900/60 p-[1px] overflow-hidden shadow-inner">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 w-full animate-pulse opacity-90" />
        </div>
      </div>
    );
  }

  // Calculate Progress Fill Percentage (0% at creation, 100% when expired)
  let fillPercent = 0;
  let timeRemainingMs = 0;
  let timeExpiredMs = 0;

  if (expiresTime !== null) {
    if (isExpired) {
      fillPercent = 100; // MUST BE FULLY FILLED WHEN EXPIRED
      timeExpiredMs = now - expiresTime;
    } else {
      const totalDurationMs = Math.max(1, expiresTime - createdTime);
      const elapsedMs = Math.max(0, now - createdTime);
      fillPercent = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
      timeRemainingMs = Math.max(0, expiresTime - now);
    }
  }

  // Format timer text
  const formatTimeSpan = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Dynamic bar colors based on progress
  let barGradient = 'from-emerald-500 via-teal-400 to-cyan-500';
  let barGlow = 'shadow-[0_0_8px_rgba(16,185,129,0.4)]';
  let textStyle = 'text-cyan-300';

  if (isExpired) {
    barGradient = 'from-rose-600 via-red-600 to-rose-500';
    barGlow = 'shadow-[0_0_12px_rgba(244,63,94,0.7)]';
    textStyle = 'text-rose-400 font-extrabold';
  } else if (fillPercent >= 85) {
    barGradient = 'from-rose-500 via-amber-500 to-red-500';
    barGlow = 'shadow-[0_0_10px_rgba(244,63,94,0.5)]';
    textStyle = 'text-rose-300 font-bold';
  } else if (fillPercent >= 60) {
    barGradient = 'from-amber-500 via-yellow-400 to-amber-400';
    barGlow = 'shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    textStyle = 'text-amber-300 font-semibold';
  }

  return (
    <div className="space-y-1.5 w-full font-mono">
      {showTimerText && (
        <div className="flex items-center justify-between text-[10px]">
          {isExpired ? (
            <span className="text-rose-400 font-extrabold flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-rose-400 animate-pulse" />
              <span>KEY EXPIRED ({formatTimeSpan(timeExpiredMs)} ago)</span>
            </span>
          ) : (
            <span className={`${textStyle} flex items-center space-x-1`}>
              <Clock className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>{formatTimeSpan(timeRemainingMs)} left</span>
            </span>
          )}

          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${isExpired ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>
            {Math.round(fillPercent)}%
          </span>
        </div>
      )}

      {/* Horizontal Bar - Fills up as time elapses, 100% full when expired */}
      <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-800/90 p-[1px] overflow-hidden relative shadow-inner">
        <div
          style={{ width: `${fillPercent}%` }}
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} ${barGlow} transition-all duration-500 ease-out relative`}
        >
          {/* Subtle animated highlight line inside progress bar */}
          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};
