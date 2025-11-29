'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Circle, AlertCircle, Clock, Plus, Filter, SlidersHorizontal } from 'lucide-react';
import type { IssueWithRelations, User, Label, ProjectStatus, Priority } from '@/types/database.types';

// Status enum을 DB 데이터와 매칭하기 위한 맵
const STATUS_MAP = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BACKLOG: 'BACKLOG',
} as const;

// Priority 타입 가드
const getPriorityIcon = (priority: Priority) => {
  switch(priority) {
    case 'HIGH':
      return <div className="text-red-500"><AlertCircle size={14} /></div>;
    case 'MEDIUM':
      return (
        <div className="text-orange-400">
          <div className="w-3 h-0.5 bg-orange-400 rounded-full"></div>
          <div className="w-3 h-0.5 bg-orange-400 rounded-full mt-0.5"></div>
        </div>
      );
    case 'LOW':
      return <div className="text-slate-400"><div className="w-3 h-0.5 bg-slate-400 rounded-full"></div></div>;
    default:
      return null;
  }
};

// 날짜 포맷팅 함수
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface IssueGroupProps {
  statusName: string;
  issues: IssueWithRelations[];
  icon: React.ReactNode;
  label: string;
  onOpenIssue?: (issue: IssueWithRelations) => void;
}

const IssueGroup: React.FC<IssueGroupProps> = ({ statusName, issues, icon, label, onOpenIssue }) => {
  if (issues.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2 px-4 group cursor-pointer">
        <div className="p-0.5 rounded hover:bg-slate-100">
          <span className="text-slate-400">{icon}</span>
        </div>
        <h3 className="text-sm font-medium text-slate-900">{label}</h3>
        <span className="text-slate-400 text-xs font-normal ml-1">{issues.length}</span>
        <Plus size={14} className="ml-auto text-slate-400 opacity-0 group-hover:opacity-100" />
      </div>
      <div className="border-t border-slate-100">
        {issues.map((issue) => (
          <div
            key={issue.id}
            onClick={() => onOpenIssue?.(issue)}
            className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-pointer"
          >
            {/* Status Icon */}
            <div className="flex-shrink-0 text-slate-400 pt-0.5">
              {issue.status?.name === 'DONE' ? (
                <CheckCircle2 size={16} className="text-brand-500" />
              ) : (
                <Circle size={16} />
              )}
            </div>

            {/* ID */}
            <div className="flex-shrink-0 w-20 text-xs text-slate-500 font-mono">
              {issue.issue_key}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-slate-800 font-medium truncate block">
                {issue.title}
              </span>
            </div>

            {/* Labels (Desktop) */}
            <div className="hidden md:flex gap-1.5">
              {issue.labels?.map(label => (
                <span
                  key={label.id}
                  className="px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-500"
                  style={{
                    backgroundColor: label.color ? `${label.color}15` : undefined,
                    borderColor: label.color || undefined
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            {/* Priority */}
            <div className="flex-shrink-0 px-2" title={issue.priority}>
              {getPriorityIcon(issue.priority)}
            </div>

            {/* Assignee */}
            <div className="flex-shrink-0">
              {issue.assignee?.profile_image ? (
                <img
                  src={issue.assignee.profile_image}
                  alt={issue.assignee.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600">
                  {issue.assignee?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="flex-shrink-0 w-20 text-right text-xs text-slate-400">
              {formatDate(issue.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface DashboardWithDBProps {
  userId: string;
  title?: string;
  onOpenIssue?: (issue: IssueWithRelations) => void;
}

const DashboardWithDB: React.FC<DashboardWithDBProps> = ({
  userId,
  title = "My issues",
  onOpenIssue
}) => {
  const [issues, setIssues] = useState<IssueWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // issues 테이블에서 조회하면서 필요한 데이터 조인
        const { data, error: fetchError } = await supabase
          .from('issues')
          .select(`
            *,
            assignee:assignee_id(id, email, name, profile_image),
            owner:owner_id(id, email, name, profile_image),
            status:status_id(id, project_id, name, color, position, is_default)
          `)
          .or(`assignee_id.eq.${userId},owner_id.eq.${userId}`)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching issues:', fetchError);
          setError(fetchError.message);
          return;
        }

        // labels 별도 조회 (다대다 관계)
        if (data && data.length > 0) {
          const issueIds = data.map(issue => issue.id);

          const { data: labelsData, error: labelsError } = await supabase
            .from('issue_labels')
            .select(`
              issue_id,
              labels:label_id(id, name, color)
            `)
            .in('issue_id', issueIds);

          if (labelsError) {
            console.error('Error fetching labels:', labelsError);
          }

          // labels를 issue에 매핑
          const issuesWithLabels = data.map(issue => {
            const issueLabels = labelsData
              ?.filter(il => il.issue_id === issue.id)
              .map(il => il.labels)
              .filter((label): label is Label => label !== null) || [];

            return {
              ...issue,
              labels: issueLabels,
            };
          });

          setIssues(issuesWithLabels);
        } else {
          setIssues([]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchIssues();
    }
  }, [userId]);

  // 상태별로 이슈 그룹화
  const inReviewIssues = issues.filter(i => i.status?.name === STATUS_MAP.IN_REVIEW);
  const todoIssues = issues.filter(i => i.status?.name === STATUS_MAP.TODO);
  const inProgressIssues = issues.filter(i => i.status?.name === STATUS_MAP.IN_PROGRESS);
  const backlogIssues = issues.filter(i => i.status?.name === STATUS_MAP.BACKLOG);
  const doneIssues = issues.filter(i => i.status?.name === STATUS_MAP.DONE);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-100 rounded text-purple-600 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
            <span className="font-semibold text-sm text-slate-800">{title}</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 text-sm">Loading issues...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-100 rounded text-purple-600 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
            <span className="font-semibold text-sm text-slate-800">{title}</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500 text-sm">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* View Header */}
      <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-purple-100 rounded text-purple-600 flex items-center justify-center">
            <CheckCircle2 size={14} />
          </div>
          <span className="font-semibold text-sm text-slate-800">{title}</span>
          <span className="text-slate-400 text-xs">({issues.length})</span>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 md:p-6">
        <div className="max-w-5xl mx-auto">
          {issues.length === 0 ? (
            <div className="text-center py-12">
              <Circle size={64} className="mx-auto mb-4 opacity-20 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">아직 할당된 이슈가 없습니다</h3>
              <p className="text-sm text-slate-500 mb-6">
                새 이슈를 생성하거나, 팀원이 이슈를 할당할 때까지 기다려주세요
              </p>
              <button
                onClick={() => window.location.href = '/issues'}
                className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-medium"
              >
                <Plus size={16} />
                새 이슈 만들기
              </button>
            </div>
          ) : (
            <>
              <IssueGroup
                label="In Review"
                statusName={STATUS_MAP.IN_REVIEW}
                issues={inReviewIssues}
                icon={<Clock size={16} className="text-yellow-500" />}
                onOpenIssue={onOpenIssue}
              />
              <IssueGroup
                label="In Progress"
                statusName={STATUS_MAP.IN_PROGRESS}
                issues={inProgressIssues}
                icon={<Circle size={16} className="text-blue-500" />}
                onOpenIssue={onOpenIssue}
              />
              <IssueGroup
                label="Todo"
                statusName={STATUS_MAP.TODO}
                issues={todoIssues}
                icon={<Circle size={16} className="text-slate-400" />}
                onOpenIssue={onOpenIssue}
              />
              <IssueGroup
                label="Backlog"
                statusName={STATUS_MAP.BACKLOG}
                issues={backlogIssues}
                icon={<Circle size={16} style={{strokeDasharray: '2 2'}} className="text-slate-300" />}
                onOpenIssue={onOpenIssue}
              />
              <IssueGroup
                label="Done"
                statusName={STATUS_MAP.DONE}
                issues={doneIssues}
                icon={<CheckCircle2 size={16} className="text-brand-500" />}
                onOpenIssue={onOpenIssue}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardWithDB;
