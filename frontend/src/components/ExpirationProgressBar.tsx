"use client";

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

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
      <div className="space-y-1 w-full font-sans text-[11px]">
        {showTimerText && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-success font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-success" />
              <span>Lifetime License</span>
            </span>
            <span className="text-muted font-mono text-[9px] uppercase">
              Permanent
            </span>
          </div>
        )}
        <div className="w-full h-1.5 bg-border-soft rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-success w-full opacity-80" />
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
      fillPercent = 100;
      timeExpiredMs = now - expiresTime;
    } else {
      const totalDurationMs = Math.max(1, expiresTime - createdTime);
      const elapsedMs = Math.max(0, now - createdTime);
      fillPercent = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
      timeRemainingMs = Math.max(0, expiresTime - now);
    }
  }

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

  let fillColor = 'bg-accent';
  let textColor = 'text-muted';

  if (isExpired) {
    fillColor = 'bg-danger';
    textColor = 'text-danger font-medium';
  } else if (fillPercent >= 85) {
    fillColor = 'bg-danger';
    textColor = 'text-danger';
  } else if (fillPercent >= 60) {
    fillColor = 'bg-warning';
    textColor = 'text-warning';
  }

  return (
    <div className="space-y-1 w-full font-sans">
      {showTimerText && (
        <div className="flex items-center justify-between text-[10px]">
          {isExpired ? (
            <span className="text-danger font-medium flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-danger" />
              <span>Expired ({formatTimeSpan(timeExpiredMs)} ago)</span>
            </span>
          ) : (
            <span className={`${textColor} flex items-center space-x-1 font-sans`}>
              <Clock className="w-3 h-3 text-muted" />
              <span>{formatTimeSpan(timeRemainingMs)} left</span>
            </span>
          )}

          <span className="text-[9px] font-mono text-muted">
            {Math.round(fillPercent)}%
          </span>
        </div>
      )}

      {/* Horizontal Bar */}
      <div className="w-full h-1.5 bg-border-soft rounded-full overflow-hidden">
        <div
          style={{ width: `${fillPercent}%` }}
          className={`h-full rounded-full ${fillColor} transition-all duration-300`}
        />
      </div>
    </div>
  );
};
