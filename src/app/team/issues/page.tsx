'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const ProjectKanban = dynamic(() => import('@/components/ProjectKanban'), { ssr: false });

export default function TeamIssuesPage() {
  return (
    <AppLayout currentView="team_issues" title="Team Issues">
      <ProjectKanban onOpenIssue={() => {}} />
    </AppLayout>
  );
}
