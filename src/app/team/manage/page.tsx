'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const TeamManageWithDB = dynamic(() => import('@/components/TeamManageWithDB'), { ssr: false });

export default function TeamManagePage() {
  const { user, loading } = useAuth(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout currentView="team_manage" title="Team Management">
      <TeamManageWithDB />
    </AppLayout>
  );
}
