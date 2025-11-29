'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const TeamStats = dynamic(() => import('@/components/TeamStats'), { ssr: false });

export default function InsightsPage() {
  return (
    <AppLayout currentView="stats" title="Insights">
      <TeamStats />
    </AppLayout>
  );
}
