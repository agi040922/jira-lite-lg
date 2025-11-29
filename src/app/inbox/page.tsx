'use client';

import dynamic from 'next/dynamic';
import { useUserId } from '@/hooks/useAuth';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const Inbox = dynamic(() => import('@/components/Inbox'), { ssr: false });

export default function InboxPage() {
  // 인증 체크 및 userId 가져오기 (test/auth 패턴 기반)
  const { userId, loading } = useUserId(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <AppLayout currentView="inbox" title="Inbox">
      <Inbox userId={userId} />
    </AppLayout>
  );
}
