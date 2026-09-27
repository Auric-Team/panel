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
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-solid/90 border-t border-border-soft backdrop-blur-md px-2 py-1.5 shadow-md transition-colors">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-md transition-all duration-150 ${
                isActive
                  ? 'text-accent font-semibold'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-0.5 bg-accent rounded-full" />
              )}
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-105' : ''}`} />
                {item.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 px-1 min-w-[14px] h-3.5 text-[8px] font-mono font-bold rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-accent text-accent-ink'
                        : 'bg-surface text-muted border border-border-soft'
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
