'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { MoreHorizontal, Plus, Filter, SlidersHorizontal } from 'lucide-react';

// 동적 임포트로 모달 로드
const CreateIssueModalWithDB = dynamic(() => import('./CreateIssueModalWithDB'), { ssr: false });

// =============================================
// 타입 정의
// =============================================

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Label {
  id: string;
  name: string;
  color?: string;
}

interface ProjectStatus {
  id: string;
  name: string;
  color?: string;
  position: number;
  wip_limit?: number;
}

interface Issue {
  id: string;
  issue_key: string;
  title: string;
  description?: string;
  status_id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assignee_id?: string;
  created_at: string;
  // 조인된 데이터
  assignee?: User;
  labels?: Label[];
}

interface Project {
  id: string;
  name: string;
  team_id: string;
}

interface ProjectKanbanWithDBProps {
  projectId: string;
  projects?: Project[];
  onProjectChange?: (projectId: string) => void;
  handleOpenIssue?: (issue: Issue) => void;
}

// =============================================
// 메인 컴포넌트
// =============================================

const ProjectKanbanWithDB: React.FC<ProjectKanbanWithDBProps> = ({
  projectId,
  projects = [],
  onProjectChange,
  handleOpenIssue
}) => {
  const supabase = createClient();

  // 현재 선택된 프로젝트 정보
  const currentProject = projects.find(p => p.id === projectId);

  // State
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // =============================================
  // 데이터 로드
  // =============================================

  // 프로젝트 상태(칸반 컬럼) 조회
  const fetchStatuses = async () => {
    try {
      console.log('🔄 Fetching statuses for project:', projectId);
      const { data, error } = await supabase
        .from('project_statuses')
        .select('id, name, color, position, wip_limit')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) {
        console.error('❌ Statuses query error:', error);
        throw error;
      }

      console.log('✅ Statuses data:', data);
      setStatuses(data || []);
    } catch (err) {
      console.error('❌ Error fetching statuses:', err);
      setError('상태 목록을 불러오는데 실패했습니다.');
    }
  };

  // 이슈 조회 (assignee, labels 조인)
  const fetchIssues = async () => {
    try {
      // 1. 이슈 기본 정보 조회 (assignee 조인 제외)
      const { data: issuesData, error: issuesError } = await supabase
        .from('issues')
        .select(`
          id,
          issue_key,
          title,
          description,
          status_id,
          priority,
          assignee_id,
          created_at
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (issuesError) {
        console.error('❌ Issues query error:', {
          message: issuesError.message,
          details: issuesError.details,
          hint: issuesError.hint,
          code: issuesError.code
        });
        throw issuesError;
      }

      console.log('✅ Issues data:', issuesData);

      // 2. 각 이슈의 assignee와 라벨 조회
      const issuesWithDetails = await Promise.all(
        (issuesData || []).map(async (issue) => {
          // assignee 정보 조회
          let assignee: User | undefined;
          if (issue.assignee_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('id, name, email, avatar_url')
              .eq('id', issue.assignee_id)
              .single();
            assignee = userData || undefined;
          }

          // 라벨 정보 조회
          const { data: labelData, error: labelError } = await supabase
            .from('issue_labels')
            .select(`
              label:labels (
                id,
                name,
                color
              )
            `)
            .eq('issue_id', issue.id);

          if (labelError) {
            console.error('Error fetching labels for issue:', issue.id, labelError);
          }

          return {
            ...issue,
            assignee,
            labels: labelData?.map((l: any) => l.label).filter(Boolean) || []
          };
        })
      );

      setIssues(issuesWithDetails);
    } catch (err: any) {
      console.error('❌ Error fetching issues (detailed):', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err
      });
      setError('이슈 목록을 불러오는데 실패했습니다.');
    }
  };

  // 초기 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStatuses(), fetchIssues()]);
      setLoading(false);
    };

    loadData();
  }, [projectId]);

  // =============================================
  // Drag & Drop 핸들러
  // =============================================

  const handleDragStart = (issue: Issue) => {
    setDraggedIssue(issue);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 드롭을 허용하기 위해 필요
  };

  const handleDrop = async (targetStatusId: string) => {
    if (!draggedIssue) return;

    // 같은 컬럼에 드롭하면 무시
    if (draggedIssue.status_id === targetStatusId) {
      setDraggedIssue(null);
      return;
    }

    try {
      // 낙관적 업데이트 (UI 먼저 업데이트)
      setIssues(prev =>
        prev.map(issue =>
          issue.id === draggedIssue.id
            ? { ...issue, status_id: targetStatusId }
            : issue
        )
      );

      // DB 업데이트
      const { error } = await supabase
        .from('issues')
        .update({
          status_id: targetStatusId,
          updated_at: new Date().toISOString()
        })
        .eq('id', draggedIssue.id);

      if (error) throw error;

      // 성공 시 데이터 다시 로드 (position 재정렬 등을 위해)
      await fetchIssues();
    } catch (err) {
      console.error('Error updating issue status:', err);
      // 에러 시 원래 상태로 되돌림
      await fetchIssues();
      alert('이슈 상태 변경에 실패했습니다.');
    } finally {
      setDraggedIssue(null);
    }
  };

  // =============================================
  // 렌더링 헬퍼
  // =============================================

  const getStatusIcon = (statusName: string) => {
    const lowerName = statusName.toLowerCase();
    if (lowerName.includes('backlog')) {
      return <div className="w-3 h-3 rounded-full border border-slate-400 border-dashed"></div>;
    } else if (lowerName.includes('todo')) {
      return <div className="w-3 h-3 rounded-full border border-slate-400"></div>;
    } else if (lowerName.includes('review') || lowerName.includes('progress')) {
      return <div className="w-3 h-3 rounded-full bg-yellow-400"></div>;
    } else if (lowerName.includes('done')) {
      return <div className="w-3 h-3 rounded-full bg-brand-500"></div>;
    }
    return <div className="w-3 h-3 rounded-full bg-slate-300"></div>;
  };

  const getPriorityDot = (priority: string) => {
    if (priority === 'HIGH') {
      return <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="High Priority"></span>;
    }
    return null;
  };

  // =============================================
  // UI 렌더링
  // =============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Kanban Header */}
      <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {projects.length > 0 ? (
            <select
              value={projectId}
              onChange={(e) => onProjectChange?.(e.target.value)}
              className="font-semibold text-sm text-slate-800 bg-transparent border border-slate-200 rounded px-2 py-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-brand-500 rounded-sm flex items-center justify-center text-[8px] text-white">
                {currentProject?.name.charAt(0).toUpperCase() || 'P'}
              </div>
              <span className="font-semibold text-sm text-slate-800">
                {currentProject?.name || 'Project Issues'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded">
            <Filter size={14} />
            <span>Filter</span>
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200">
            <SlidersHorizontal size={14} />
            <span>Display</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-0 flex">
        {statuses.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center max-w-md px-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">프로젝트 상태가 없습니다</h3>
              <p className="text-sm text-slate-500 mb-6">
                데이터베이스에서 기본 상태(Backlog, In Progress, Done)를 추가해야 합니다.
                <br />
                <code className="text-xs bg-slate-100 px-2 py-1 rounded mt-2 inline-block">
                  supabase/FIX_add_default_statuses.sql
                </code>
                파일을 실행하세요.
              </p>
            </div>
          </div>
        ) : (
          <>
        {statuses.map((status) => {
          const columnIssues = issues.filter(i => i.status_id === status.id);
          const isOverLimit = status.wip_limit && columnIssues.length >= status.wip_limit;

          return (
            <div
              key={status.id}
              className="min-w-[300px] w-[300px] flex flex-col h-full border-r border-slate-100 bg-[#F7F8F9]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(status.id)}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.name)}
                  <span className="font-medium text-sm text-slate-700">{status.name}</span>
                  <span className={`text-xs font-normal ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
                    {columnIssues.length}
                    {status.wip_limit && `/${status.wip_limit}`}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-slate-200 rounded text-slate-400">
                    <Plus size={14} />
                  </button>
                  <button className="p-1 hover:bg-slate-200 rounded text-slate-400">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>

              {/* Issues List */}
              <div className="px-3 pb-3 flex-1 overflow-y-auto space-y-2">
                {columnIssues.map((issue) => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={() => handleDragStart(issue)}
                    onClick={() => handleOpenIssue?.(issue)}
                    className="bg-white p-3 rounded-md border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-move group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {issue.issue_key}
                      </span>
                      {issue.assignee?.avatar_url && (
                        <img
                          src={issue.assignee.avatar_url}
                          alt={issue.assignee.name}
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                    </div>

                    <h4 className="font-medium text-slate-800 mb-2 text-sm leading-snug">
                      {issue.title}
                    </h4>

                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {getPriorityDot(issue.priority)}
                      {issue.labels?.map(label => (
                        <span
                          key={label.id}
                          className="text-[10px] text-slate-500 border border-slate-100 px-1 rounded-sm bg-slate-50"
                          style={label.color ? { borderColor: label.color, color: label.color } : {}}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Add Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full py-1.5 flex items-center gap-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-colors text-xs font-medium px-2"
                >
                  <Plus size={14} />
                  <span>New issue</span>
                </button>
              </div>
            </div>
          );
        })}
        </>
        )}

        {/* Add Column Button */}
        <div className="w-8 shrink-0 bg-[#F7F8F9] border-r border-slate-100 flex items-start justify-center pt-3">
          <button className="p-1 hover:bg-slate-200 rounded text-slate-400">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModalWithDB
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // 이슈 생성 성공 시 목록 새로고침
            fetchIssues();
          }}
        />
      )}
    </div>
  );
};

export default ProjectKanbanWithDB;
