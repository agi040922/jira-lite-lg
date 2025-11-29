'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

const AppLayout = dynamic(() => import('@/components/AppLayout'), { ssr: false });
const ProjectKanbanWithDB = dynamic(() => import('@/components/ProjectKanbanWithDB'), { ssr: false });

export default function TeamIssuesPage() {
  const { user, loading: authLoading } = useAuth(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const loadTeamAndProject = async () => {
      try {
        // 1. 사용자가 속한 팀 조회
        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (!membership) {
          console.error('팀을 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        // 2. 해당 팀의 첫 번째 프로젝트 조회
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('team_id', membership.team_id)
          .limit(1)
          .single();

        if (project) {
          setProjectId(project.id);
        }
      } catch (error) {
        console.error('팀/프로젝트 로드 중 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamAndProject();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) return null;

  if (!projectId) {
    return (
      <AppLayout currentView="team_issues" title="Team Issues">
        <div className="flex items-center justify-center h-full bg-white">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">팀 프로젝트가 없습니다</h3>
            <p className="text-sm text-slate-500 mb-6">
              팀의 이슈를 관리하려면 먼저 프로젝트를 생성해야 합니다
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
    <AppLayout currentView="team_issues" title="Team Issues">
      <ProjectKanbanWithDB projectId={projectId} />
    </AppLayout>
  );
}
