'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const TeamStats = dynamic(() => import('@/components/TeamStats'), { ssr: false });
const AIStatsWithDB = dynamic(() => import('@/components/AIStatsWithDB'), { ssr: false });

export default function InsightsPage() {
  const { user, loading } = useAuth(true);
  const [activeTab, setActiveTab] = useState<'team' | 'ai'>('ai');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout currentView="stats" title="Insights">
      <div className="flex flex-col h-full bg-slate-50">
        {/* Tab Navigation */}
        <div className="h-14 border-b border-slate-200 bg-white flex items-center px-6 sticky top-0 z-10">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'ai'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              AI 사용 통계
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'team'
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              팀 통계
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'ai' ? <AIStatsWithDB /> : <TeamStats />}
        </div>
      </div>
    </AppLayout>
  );
}
