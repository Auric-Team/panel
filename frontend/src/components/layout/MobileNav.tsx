"use client";

import React from 'react';
import { LayoutDashboard, Key, Users, FileCode2, Activity } from 'lucide-react';
import { UserItem } from '@/types/key';

export interface MobileNavProps {
  activeTab: 'overview' | 'keys' | 'resellers' | 'payload' | 'audit';
  setActiveTab: (tab: 'overview' | 'keys' | 'resellers' | 'payload' | 'audit') => void;
  user: UserItem | null;
  keysCount: number;
  resellersCount: number;
  auditCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  user,
  keysCount,
  resellersCount,
  auditCount,
}) => {
  const isManagerOrOwner = user?.role === 'owner' || user?.role === 'manager';

  const navItems = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      visible: true,
    },
    {
      id: 'keys' as const,
      label: 'Keys',
      icon: Key,
      badge: keysCount > 0 ? (keysCount > 99 ? '99+' : String(keysCount)) : null,
      visible: true,
    },
    {
      id: 'resellers' as const,
      label: 'Resellers',
      icon: Users,
      badge: resellersCount > 0 ? String(resellersCount) : null,
      visible: isManagerOrOwner,
    },
    {
      id: 'payload' as const,
      label: 'Publisher',
      icon: FileCode2,
      badge: 'SO',
      visible: isManagerOrOwner,
    },
    {
      id: 'audit' as const,
      label: 'Audit',
      icon: Activity,
      badge: auditCount > 0 ? (auditCount > 99 ? '99+' : String(auditCount)) : null,
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 border-t border-slate-800/90 backdrop-blur-2xl px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {item.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 px-1 min-w-[14px] h-3.5 text-[8px] font-mono font-black rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight font-sans">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
