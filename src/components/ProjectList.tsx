'use client';

import React, { useEffect, useState } from 'react';
import { Health, Priority } from '../types';
import { Activity, AlertTriangle, CheckCircle, BarChart3, Plus, Filter, SlidersHorizontal, Calendar, LayoutGrid, List } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Supabase에서 가져온 프로젝트 데이터 타입
interface ProjectWithDB {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  team?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    name: string;
    email: string;
    profile_image: string | null;
  } | null;
  issue_count?: number;
  completed_issue_count?: number;
}

// Health 계산 함수
const calculateHealth = (targetDate: string | null, statusPercent: number): Health => {
  if (!targetDate) return Health.ON_TRACK;

  const today = new Date();
  const target = new Date(targetDate);
  const daysUntilDue = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 요청된 로직: statusPercent >= 80 && target_date 충분 → ON_TRACK
  if (statusPercent >= 80 && daysUntilDue >= 7) return Health.ON_TRACK;

  // statusPercent >= 50 → AT_RISK
  if (statusPercent >= 50) return Health.AT_RISK;

  // 그 외 → OFF_TRACK
  return Health.OFF_TRACK;
};

// statusPercent 계산 함수: 완료된 이슈 / 전체 이슈 * 100
const calculateStatusPercent = (completedCount: number, totalCount: number): number => {
  if (totalCount === 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
};

// Priority 계산 함수 (이슈 개수 기반)
const calculatePriority = (issueCount: number): Priority => {
  // 이슈 개수에 따라 우선순위 자동 결정
  if (issueCount > 10) return Priority.HIGH;
  if (issueCount > 5) return Priority.MEDIUM;
  return Priority.LOW;
};

// Target Date 포맷팅 함수
const formatTargetDate = (dateStr: string | null): string => {
  if (!dateStr) return '미정';

  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${month}월 ${day}일`;
};

const getHealthBadge = (health: Health) => {
    switch(health) {
        case Health.ON_TRACK:
            return <div className="flex items-center gap-1.5 text-green-600"><div className="bg-green-500 w-2 h-2 rounded-full"></div><span className="text-xs font-medium">On track</span></div>;
        case Health.AT_RISK:
            return <div className="flex items-center gap-1.5 text-orange-500"><div className="bg-orange-400 w-2 h-2 rounded-full border-2 border-orange-100"></div><span className="text-xs font-medium">At risk</span></div>;
        case Health.OFF_TRACK:
            return <div className="flex items-center gap-1.5 text-red-500"><div className="bg-red-500 w-2 h-2 rounded-full"></div><span className="text-xs font-medium">Off track</span></div>;
        default: return null;
    }
};

const getPriorityIcon = (priority: Priority) => {
    switch(priority) {
        case Priority.HIGH: return <BarChart3 size={14} className="text-slate-700" />; // Simplified visual from screenshot
        case Priority.MEDIUM: return <BarChart3 size={14} className="text-slate-400" />;
        case Priority.LOW: return <span className="text-slate-300">---</span>;
        default: return null;
    }
};

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<ProjectWithDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // 1. 현재 사용자 가져오기
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('로그인이 필요합니다.');
        return;
      }

      // 2. 프로젝트 조회 (team, owner 조인)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          created_at,
          updated_at,
          team:teams!inner (
            id,
            name
          ),
          owner:users!projects_owner_id_fkey (
            id,
            name,
            email,
            profile_image
          )
        `)
        .is('deleted_at', null)  // Soft Delete된 프로젝트 제외
        .eq('is_archived', false)  // 아카이브되지 않은 프로젝트만
        .order('updated_at', { ascending: false });

      if (projectsError) {
        console.error('프로젝트 조회 오류:', projectsError);
        setError('프로젝트를 불러올 수 없습니다.');
        return;
      }

      // 3. 각 프로젝트별 이슈 개수 조회 (전체 이슈, 완료된 이슈)
      const projectsWithDetails = await Promise.all(
        (projectsData || []).map(async (project) => {
          // 전체 이슈 개수 조회
          const { count: totalIssueCount } = await supabase
            .from('issues')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .is('deleted_at', null);

          // 완료된 이슈 개수 조회 (status_id가 "Done" 상태인 것)
          // "Done" 상태의 project_statuses id를 먼저 찾아야 함
          const { data: doneStatuses } = await supabase
            .from('project_statuses')
            .select('id')
            .eq('project_id', project.id)
            .eq('name', 'Done')
            .is('deleted_at', null);

          let completedCount = 0;
          if (doneStatuses && doneStatuses.length > 0) {
            const doneStatusIds = doneStatuses.map(s => s.id);
            const { count: completed } = await supabase
              .from('issues')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', project.id)
              .in('status_id', doneStatusIds)
              .is('deleted_at', null);

            completedCount = completed || 0;
          }

          return {
            ...project,
            issue_count: totalIssueCount || 0,
            completed_issue_count: completedCount,
          };
        })
      );

      setProjects(projectsWithDetails);
    } catch (err) {
      console.error('프로젝트 가져오기 실패:', err);
      setError('프로젝트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">프로젝트 로딩 중...</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-red-600">오류 발생</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={fetchProjects}
              className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
         {/* View Header */}
         <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer">
                    <div className="w-4 h-4 bg-brand-500 rounded-sm flex items-center justify-center text-[8px] text-white">L</div>
                    <span className="font-semibold text-sm text-slate-800">Lightsoft</span>
                </div>
                <span className="text-slate-300">/</span>
                <span className="text-sm font-medium text-slate-600">Active projects</span>
            </div>
            <div className="flex items-center gap-2">
                 <button className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded">
                    <Filter size={14} />
                    <span>Filter</span>
                </button>
                <button className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200">
                    <SlidersHorizontal size={14} />
                    <span>Display</span>
                </button>
                <button
                    onClick={() => window.location.href = '/projects/new'}
                    className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-slate-800 flex items-center gap-1"
                >
                    <Plus size={14} />
                    Add project
                </button>
            </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-500">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Health</div>
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-1 text-center">Lead</div>
            <div className="col-span-2">Target date</div>
            <div className="col-span-2">Status</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-slate-500 mb-4">아직 프로젝트가 없습니다.</p>
                  <button
                    onClick={() => window.location.href = '/projects/new'}
                    className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
                  >
                    첫 프로젝트 만들기
                  </button>
                </div>
              </div>
            ) : (
              projects.map((project) => {
                const totalCount = project.issue_count || 0;
                const completedCount = project.completed_issue_count || 0;
                const statusPercent = calculateStatusPercent(completedCount, totalCount);
                // created_at을 임시 target_date로 사용 (향후 DB 컬럼 추가 필요)
                const health = calculateHealth(project.created_at, statusPercent);
                const priority = calculatePriority(totalCount);
                const targetDate = formatTargetDate(project.created_at);

                return (
                  <div key={project.id} className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-50 hover:bg-slate-50 items-center group transition-colors cursor-pointer">
                      {/* Name */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="p-1 rounded bg-indigo-50 text-indigo-600">
                              <LayoutGrid size={14} />
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate">{project.name}</span>
                          {/* Status chip if implied by design */}
                          {health === Health.ON_TRACK && totalCount > 0 && (
                            <div className="text-[10px] text-green-600 bg-green-50 px-1.5 rounded hidden xl:block">
                              {totalCount}개
                            </div>
                          )}
                      </div>

                      {/* Health */}
                      <div className="col-span-2">
                          {getHealthBadge(health)}
                      </div>

                      {/* Priority */}
                      <div className="col-span-1 flex justify-center">
                          {getPriorityIcon(priority)}
                      </div>

                      {/* Lead */}
                      <div className="col-span-1 flex justify-center">
                          {project.owner?.profile_image ? (
                            <img
                              src={project.owner.profile_image}
                              alt={project.owner.name}
                              className="w-5 h-5 rounded-full border border-slate-100"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-slate-100 bg-slate-200 flex items-center justify-center text-[10px] text-slate-600">
                              {project.owner?.name?.charAt(0) || '?'}
                            </div>
                          )}
                      </div>

                      {/* Target Date */}
                      <div className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{targetDate}</span>
                      </div>

                      {/* Status Progress */}
                      <div className="col-span-2 flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-brand-500 border-r-brand-500 transform -rotate-45"></div>
                          <span className="text-xs font-medium text-slate-600">{statusPercent}%</span>
                          <div className="h-0.5 w-12 bg-slate-100 rounded-full overflow-hidden ml-auto hidden md:block">
                              <div className="h-full bg-brand-500" style={{width: `${statusPercent}%`}}></div>
                          </div>
                      </div>
                  </div>
                );
              })
            )}

            {/* Add New Row Visual */}
             <div
                 onClick={() => window.location.href = '/projects/new'}
                 className="grid grid-cols-12 gap-4 px-6 py-3 items-center group cursor-pointer hover:bg-slate-50"
             >
                 <div className="col-span-12 text-sm text-slate-400 flex items-center gap-2">
                     <Plus size={16} />
                     <span>New project...</span>
                 </div>
             </div>
        </div>
    </div>
  );
};

export default ProjectList;

