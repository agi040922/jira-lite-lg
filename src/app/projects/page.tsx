'use client';

import dynamic from 'next/dynamic';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const ProjectList = dynamic(() => import('@/components/ProjectList'), { ssr: false });

export default function ProjectsPage() {
  return (
    <AppLayout currentView="projects" title="Projects">
      <ProjectList />
    </AppLayout>
  );
}
