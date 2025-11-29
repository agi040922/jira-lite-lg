'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const TeamManage = dynamic(() => import('@/components/TeamManage'), { ssr: false });

export default function TeamManagePage() {
  return (
    <AppLayout currentView="team_manage" title="Team Management">
      <TeamManage />
    </AppLayout>
  );
}
