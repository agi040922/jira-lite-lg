'use client';

import dynamic from 'next/dynamic';
import { useUserId } from '@/hooks/useAuth';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false });

export default function ReviewsPage() {
  const { userId, loading } = useUserId(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!userId) return null;

  return (
    <AppLayout currentView="reviews" title="Reviews">
      <Dashboard
        userId={userId}
        title="Reviews"
      />
    </AppLayout>
  );
}
