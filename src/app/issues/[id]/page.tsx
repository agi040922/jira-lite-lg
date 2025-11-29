'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const IssueDetailWithDB = dynamic(() => import('@/components/IssueDetailWithDB'), { ssr: false });

export default function IssueDetailPage() {
  const params = useParams();
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
    <AppLayout currentView="issues" title="Issue Detail">
      <IssueDetailWithDB issueId={params.id as string} />
    </AppLayout>
  );
}
