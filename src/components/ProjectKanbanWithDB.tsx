'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MoreHorizontal, Plus, Filter, SlidersHorizontal } from 'lucide-react';

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
  position: number;
  // 조인된 데이터
  assignee?: User;
  labels?: Label[];
}

interface ProjectKanbanWithDBProps {
  projectId: string;
  onOpenIssue?: (issue: Issue) => void;
}

// =============================================
// 메인 컴포넌트
// =============================================

const ProjectKanbanWithDB: React.FC<ProjectKanbanWithDBProps> = ({
  projectId,
  onOpenIssue
}) => {
  const supabase = createClient();

  // State
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);

  // =============================================
  // 데이터 로드
  // =============================================

  // 프로젝트 상태(칸반 컬럼) 조회
  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('project_statuses')
        .select('id, name, color, position, wip_limit')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) throw error;
      setStatuses(data || []);
    } catch (err) {
      console.error('Error fetching statuses:', err);
      setError('상태 목록을 불러오는데 실패했습니다.');
    }
  };

  // 이슈 조회 (assignee, labels 조인)
  const fetchIssues = async () => {
    try {
      // 1. 이슈 기본 정보 조회
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
          position,
          assignee:users!assignee_id (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('position', { ascending: true });

      if (issuesError) throw issuesError;

      // 2. 각 이슈의 라벨 조회
      const issuesWithLabels = await Promise.all(
        (issuesData || []).map(async (issue) => {
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
            assignee: issue.assignee as User | undefined,
            labels: labelData?.map((l: any) => l.label).filter(Boolean) || []
          };
        })
      );

      setIssues(issuesWithLabels);
    } catch (err) {
      console.error('Error fetching issues:', err);
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
          <div className="w-5 h-5 bg-brand-500 rounded-sm flex items-center justify-center text-[8px] text-white">
            L
          </div>
          <span className="font-semibold text-sm text-slate-800">Project Issues</span>
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
        {issues.length === 0 && statuses.length > 0 ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center max-w-md px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">프로젝트가 비어있습니다</h3>
              <p className="text-sm text-slate-500 mb-6">
                첫 이슈를 만들어 프로젝트를 시작하세요
              </p>
              <button
                className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-medium"
              >
                <Plus size={16} />
                첫 이슈 만들기
              </button>
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
                    onClick={() => onOpenIssue?.(issue)}
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
                <button className="w-full py-1.5 flex items-center gap-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-colors text-xs font-medium px-2">
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
    </div>
  );
};

export default ProjectKanbanWithDB;
