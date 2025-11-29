'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const ProjectForm = dynamic(() => import('@/components/ProjectForm'), { ssr: false });

export default function NewProjectPage() {
  const { user, loading } = useAuth(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout currentView="projects" title="New Project">
      <ProjectForm />
    </AppLayout>
  );
}
