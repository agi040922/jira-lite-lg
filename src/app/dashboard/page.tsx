'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false });

export default function DashboardPage() {
  return (
    <AppLayout currentView="my_issues" title="My issues">
      <Dashboard />
    </AppLayout>
  );
}
