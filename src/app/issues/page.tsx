'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUserId } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const ProjectKanbanWithDB = dynamic(() => import('@/components/ProjectKanbanWithDB'), { ssr: false });

export default function IssuesPage() {
  const router = useRouter();
  const { userId, loading: authLoading } = useUserId(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 사용자의 첫 번째 프로젝트 ID 가져오기
  useEffect(() => {
    const fetchFirstProject = async () => {
      if (!userId) return;

      try {
        // 사용자가 속한 팀의 첫 번째 프로젝트 조회
        const { data: memberData, error: memberError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (memberError) throw memberError;

        if (memberData) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('team_id', memberData.team_id)
            .limit(1)
            .single();

          if (projectError) throw projectError;

          if (projectData) {
            setProjectId(projectData.id);
          }
        }
      } catch (err) {
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchFirstProject();
    }
  }, [userId, supabase]);

  const handleOpenIssue = (issue: any) => {
    router.push(`/issues/${issue.id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!userId) return null;

  if (!projectId) {
    return (
      <AppLayout currentView="team_issues" title="All Issues">
        <div className="flex items-center justify-center h-full bg-white">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">프로젝트가 없습니다</h3>
            <p className="text-sm text-slate-500 mb-6">
              이슈를 관리하려면 먼저 프로젝트를 생성해야 합니다
            </p>
            <button
              onClick={() => window.location.href = '/projects/new'}
              className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              첫 프로젝트 만들기
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout currentView="team_issues" title="All Issues">
      <ProjectKanbanWithDB
        projectId={projectId}
        onOpenIssue={handleOpenIssue}
      />
    </AppLayout>
  );
}
