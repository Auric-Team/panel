"use client";

import React from 'react';
import { StatsOverview, StatsOverviewProps } from './StatsOverview';

export interface StatsCardsProps {
  stats: {
    totalKeys: number;
    activeKeys: number;
    boundDevices: number;
    expiredKeys: number;
    totalResellers?: number;
    totalRevenueTokens?: number;
  };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return <StatsOverview stats={stats} />;
};

export { StatsOverview };
export type { StatsOverviewProps };
