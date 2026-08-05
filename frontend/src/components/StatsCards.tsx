"use client";

import React from 'react';
import { Key, ShieldCheck, Cpu, Clock } from 'lucide-react';
import { StatsOverview } from '@/types/key';

interface StatsCardsProps {
  stats: StatsOverview;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: "Total Keys",
      value: stats.totalKeys,
      icon: Key,
      color: "from-purple-500/20 to-purple-900/40",
      borderColor: "border-purple-500/40",
      textColor: "text-purple-300",
      iconBg: "bg-purple-500/20 text-purple-300",
      glow: "hover:shadow-glow-purple",
    },
    {
      title: "Active Keys",
      value: stats.activeKeys,
      icon: ShieldCheck,
      color: "from-emerald-500/20 to-teal-900/40",
      borderColor: "border-emerald-500/40",
      textColor: "text-emerald-300",
      iconBg: "bg-emerald-500/20 text-emerald-300",
      glow: "hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]",
    },
    {
      title: "Bound Devices",
      value: stats.boundDevices,
      icon: Cpu,
      color: "from-cyan-500/20 to-blue-900/40",
      borderColor: "border-cyan-500/40",
      textColor: "text-cyan-300",
      iconBg: "bg-cyan-500/20 text-cyan-300",
      glow: "hover:shadow-[0_0_20px_-5px_rgba(56,189,248,0.4)]",
    },
    {
      title: "Expired Keys",
      value: stats.expiredKeys,
      icon: Clock,
      color: "from-rose-500/20 to-pink-900/40",
      borderColor: "border-rose-500/40",
      textColor: "text-rose-300",
      iconBg: "bg-rose-500/20 text-rose-300",
      glow: "hover:shadow-glow-pink",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`glass-panel rounded-2xl p-5 border bg-gradient-to-br ${card.color} ${card.borderColor} transition-all duration-300 hover:-translate-y-1 ${card.glow}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-purple-200/60 mb-1">
                  {card.title}
                </p>
                <h3 className={`text-3xl font-extrabold font-mono ${card.textColor}`}>
                  {card.value}
                </h3>
              </div>
              <div className={`p-3.5 rounded-xl ${card.iconBg} border border-white/10`}>
                <IconComponent className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
