"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, LogOut, Coins, Sun, Moon } from 'lucide-react';
import { UserItem } from '@/types/key';
import { useTheme } from '@/components/ui/ThemeContext';

export interface NavbarProps {
  user: UserItem | null;
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isConnected,
  isRefreshing,
  onRefresh,
  onLogout,
}) => {
  const [latency, setLatency] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;
    const checkPing = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (res.ok && isMounted) {
          setLatency(Math.round(performance.now() - start));
        }
      } catch {
        if (isMounted) setLatency(null);
      }
    };

    checkPing();
    const interval = setInterval(checkPing, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getLatencyBadgeClass = (ms: number | null) => {
    if (ms === null || ms >= 200) return 'text-danger bg-danger/10 border-danger/20';
    if (ms < 80) return 'text-success bg-success/10 border-success/20';
    return 'text-warning bg-warning/10 border-warning/20';
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-accent/15 text-accent border-accent/25';
      case 'manager':
        return 'bg-info/15 text-info border-info/25';
      case 'reseller':
        return 'bg-muted/15 text-muted border-border';
      default:
        return 'bg-surface text-ink border-border-soft';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-solid/85 border-b border-border-soft backdrop-blur-md px-4 sm:px-8 py-3 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Editorial Title */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-surface-gradient border border-border-soft text-accent shadow-sm">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-solid ${
                isConnected ? 'bg-success' : 'bg-danger'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display text-lg sm:text-xl font-normal tracking-tight text-ink flex items-center gap-1.5">
                AXIOS <span className="text-muted font-sans text-xs tracking-widest uppercase font-semibold">Executive</span>
              </h1>
              <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded border border-border-soft bg-surface text-muted uppercase">
                v3.0
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-muted font-sans tracking-wide">
              Licensing Control &amp; Cryptographic Armor
            </p>
          </div>
        </div>

        {/* Right Section: Telemetry, Tokens, Profile & Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time Server Ping Indicator */}
          <div
            className={`hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-sm border text-[11px] font-mono transition-colors ${getLatencyBadgeClass(
              latency
            )}`}
            title="Real-time Server Telemetry"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-success' : 'bg-danger'
              }`}
            />
            <span>
              {isConnected ? (latency !== null ? `${latency}ms` : 'Active') : 'Offline'}
            </span>
          </div>

          {/* User Profile & Token Balance */}
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3 bg-surface border border-border-soft rounded-md px-3 py-1 font-sans text-xs shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded bg-accent text-accent-ink flex items-center justify-center text-[10px] font-bold font-mono">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-medium text-ink text-xs max-w-[90px] sm:max-w-[140px] truncate">
                  {user.username}
                </span>
                <span
                  className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>

              {/* Tokens Pill */}
              <div className="flex items-center space-x-1.5 text-ink border-l border-line pl-2.5 sm:pl-3">
                <Coins className="w-3.5 h-3.5 text-warning" />
                <span className="font-mono font-bold text-ink text-xs">
                  {(user.tokens !== undefined ? user.tokens : (user.credits || 0)).toLocaleString()}
                </span>
                <span className="hidden sm:inline text-[10px] text-muted font-mono">T</span>
              </div>
            </div>
          )}

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="ref-btn-icon"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-warning" />
            ) : (
              <Moon className="w-4 h-4 text-muted" />
            )}
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="ref-btn-icon"
            title="Refresh Real-time Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-muted ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>

          {/* Logout Action */}
          {user && (
            <button
              type="button"
              onClick={onLogout}
              className="ref-btn-icon hover:text-danger hover:border-danger/30"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
