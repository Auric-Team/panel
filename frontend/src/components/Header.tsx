"use client";

import React from 'react';
import { ShieldAlert, KeyRound, Wifi, RefreshCw, Layers } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  backendUrl: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  backendUrl,
  isRefreshing,
  onRefresh,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-purple-900/40 bg-axios-dark/80 backdrop-blur-md px-6 py-4 shadow-xl mb-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-800 rounded-xl shadow-glow-purple flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-axios-accent-grad glow-text">
                AXIOS KEY MANAGEMENT PANEL
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-md">
                v2.0 PRO
              </span>
            </div>
            <p className="text-xs text-purple-300/70 font-mono mt-0.5">
              Secure Hardware-Bound Authentication Portal
            </p>
          </div>
        </div>

        {/* Connection status & controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-axios-card border border-purple-900/50">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
            <div className="flex items-center space-x-1.5 text-xs font-mono">
              <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className="text-gray-300">
                {isConnected ? 'Synced:' : 'Offline:'}
              </span>
              <span className="text-purple-300 font-semibold truncate max-w-[180px]">
                {backendUrl}
              </span>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 transition-all duration-200 hover:shadow-glow-purple disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-300' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
