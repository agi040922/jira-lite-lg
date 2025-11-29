'use client';

import React, { useState, useEffect } from 'react';
import { Upload, X, ChevronLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTeam } from './providers/TeamContext';
import { createClient } from '@/lib/supabase/client';

interface TeamMemberWithUser {
  id: string;
  user_id: string;
  role: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profile_image: string | null;
  };
}

const ProjectForm: React.FC = () => {
  const router = useRouter();
  const { currentTeam } = useTeam();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!currentTeam) return;

      try {
        // 현재 로그인한 사용자 가져오기
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 팀 멤버 조회
        const { data: members, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            role,
            user:users!team_members_user_id_fkey (
              id,
              name,
              email,
              profile_image
            )
          `)
          .eq('team_id', currentTeam.id);

        if (membersError) {
          console.error('팀 멤버 조회 오류:', membersError);
          return;
        }

        setTeamMembers((members || []).map((m: any) => ({
          ...m,
          user: Array.isArray(m.user) ? m.user[0] : m.user
        })));
        
        // 현재 사용자를 기본 owner로 설정
        setOwnerId(user.id);
      } catch (err) {
        console.error('팀 멤버 가져오기 실패:', err);
      }
    };

    fetchTeamMembers();
  }, [currentTeam, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTeam) {
      setError('팀이 선택되지 않았습니다.');
      return;
    }

    if (!name.trim()) {
      setError('프로젝트 이름을 입력해주세요.');
      return;
    }

    if (!ownerId) {
      setError('프로젝트 리드를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 프로젝트 생성
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          team_id: currentTeam.id,
          name: name.trim(),
          description: description.trim() || null,
          owner_id: ownerId,
        })
        .select()
        .single();

      if (projectError) {
        console.error('프로젝트 생성 오류:', projectError);
        setError('프로젝트 생성에 실패했습니다: ' + projectError.message);
        return;
      }

      // 기본 프로젝트 상태(칸반 컬럼)는 DB 트리거(trigger_create_default_statuses)가 자동 생성합니다.
      // 트리거: create_default_project_statuses() - Backlog, In Progress, Done 자동 생성

      // 2. 활동 로그 기록
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('team_activity_logs')
          .insert({
            team_id: currentTeam.id,
            user_id: user.id,
            action_type: 'project_created',
            target_type: 'project',
            target_id: newProject.id,
            description: `${name} 프로젝트가 생성되었습니다.`,
            metadata: { project_name: name },
          });
      }

      // 3. 성공 - 프로젝트 목록으로 이동
      router.push('/projects');
    } catch (err: any) {
      console.error('프로젝트 생성 중 오류:', err);
      setError('프로젝트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-600 mb-4">팀을 먼저 선택해주세요.</p>
          <button
            onClick={() => router.push('/team/create')}
            className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
          >
            팀 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 h-full overflow-y-auto">
      <div className="mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Back to Projects
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New Project</h1>
        <p className="text-slate-500 mt-1">
          {currentTeam.name} 팀의 새로운 프로젝트를 생성합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Project Details */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Q4 Marketing Campaign" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                placeholder="Describe the project goals..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Lead <span className="text-red-500">*</span>
              </label>
              <select 
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                required
              >
                <option value="">Select a lead...</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.user?.name} ({member.user?.email}) - {member.role}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">프로젝트 리드는 프로젝트를 관리할 수 있습니다.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
