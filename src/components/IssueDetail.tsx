'use client';

import React, { useEffect, useState } from 'react';
import { X, Calendar, User as UserIcon, Tag, Sparkles, MessageSquare, CheckSquare, Paperclip, Share2, Plus, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type {
  IssueWithRelations,
  Priority,
  CommentWithUser,
  Subtask,
  User,
  ProjectStatus,
  Label,
  Comment
} from '@/types/database.types';

interface IssueDetailProps {
  issueId: string;
}

const IssueDetail: React.FC<IssueDetailProps> = ({ issueId }) => {
  const router = useRouter();
  const supabase = createClient();

  const [issue, setIssue] = useState<IssueWithRelations | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatus[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 이슈 상세 데이터 조회
  const fetchIssueDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // 이슈 기본 정보 + 관계 데이터 조회
      const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select(`
          *,
          status:project_statuses(id, name, color),
          assignee:users!issues_assignee_id_fkey(id, name, email, profile_image),
          owner:users!issues_owner_id_fkey(id, name, email, profile_image)
        `)
        .eq('id', issueId)
        .is('deleted_at', null)
        .single();

      if (issueError) throw issueError;
      if (!issueData) throw new Error('이슈를 찾을 수 없습니다.');

      // 라벨 조회
      const { data: labelsData } = await supabase
        .from('issue_labels')
        .select(`
          label_id,
          labels(id, name, color)
        `)
        .eq('issue_id', issueId);

      const labels = labelsData?.map(il => il.labels).filter(Boolean).flat() as Label[] || [];

      // 서브태스크 조회
      const { data: subtasksData } = await supabase
        .from('subtasks')
        .select('*')
        .eq('issue_id', issueId)
        .order('position', { ascending: true });

      // 댓글 조회
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          *,
          user:users(id, name, email, profile_image)
        `)
        .eq('issue_id', issueId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      setIssue({
        ...issueData,
        labels,
        subtasks: subtasksData || [],
      });
      setComments(commentsData || []);

      // 프로젝트의 상태 목록 조회
      if (issueData.project_id) {
        const { data: statusesData } = await supabase
          .from('project_statuses')
          .select('*')
          .eq('project_id', issueData.project_id)
          .order('position', { ascending: true });

        setProjectStatuses(statusesData || []);
      }

    } catch (err) {
      console.error('이슈 조회 실패:', err);
      setError(err instanceof Error ? err.message : '이슈를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 댓글 작성
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error: insertError } = await supabase
        .from('comments')
        .insert({
          issue_id: issueId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (insertError) throw insertError;

      setNewComment('');
      await fetchIssueDetail(); // 댓글 목록 새로고침
    } catch (err) {
      console.error('댓글 작성 실패:', err);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  // 서브태스크 토글
  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('subtasks')
        .update({ is_completed: !currentStatus })
        .eq('id', subtaskId);

      if (updateError) throw updateError;

      await fetchIssueDetail(); // 서브태스크 목록 새로고침
    } catch (err) {
      console.error('서브태스크 토글 실패:', err);
      alert('서브태스크 업데이트에 실패했습니다.');
    }
  };

  // 상태 변경
  const handleStatusChange = async (statusId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('issues')
        .update({ status_id: statusId })
        .eq('id', issueId);

      if (updateError) throw updateError;

      await fetchIssueDetail(); // 이슈 정보 새로고침
    } catch (err) {
      console.error('상태 변경 실패:', err);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 담당자 변경 (현재는 UI만 표시, 실제 변경은 추후 구현)
  const handleAssigneeChange = async (assigneeId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('issues')
        .update({ assignee_id: assigneeId })
        .eq('id', issueId);

      if (updateError) throw updateError;

      await fetchIssueDetail(); // 이슈 정보 새로고침
    } catch (err) {
      console.error('담당자 변경 실패:', err);
      alert('담당자 변경에 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchIssueDetail();

    // Realtime 구독 - 이슈 변경사항 실시간 반영
    const issueChannel = supabase
      .channel(`issue-${issueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues',
          filter: `id=eq.${issueId}`
        },
        () => {
          fetchIssueDetail();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `issue_id=eq.${issueId}`
        },
        () => {
          fetchIssueDetail();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subtasks',
          filter: `issue_id=eq.${issueId}`
        },
        () => {
          fetchIssueDetail();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(issueChannel);
    };
  }, [issueId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-600 mb-2">{error || '이슈를 찾을 수 없습니다.'}</div>
        <button
          onClick={() => router.back()}
          className="text-brand-600 hover:underline"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3 text-sm text-slate-500">
                <button onClick={() => router.back()} className="hover:text-slate-900 flex items-center gap-1">
                    <ChevronLeft size={16} />
                    Back
                </button>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-slate-400">{issue.issue_key}</span>
                <span className="text-slate-300">/</span>
                <span className="hover:underline cursor-pointer">프로젝트</span>
            </div>
            <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Share2 size={18} />
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {/* Title & Description */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">{issue.title}</h2>
                    
                    {/* AI Actions Area */}
                    <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-2 text-brand-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <span>AI Assistant</span>
                        </div>
                        <p className="text-sm text-brand-900 mb-3">
                            이 이슈에 대해 AI가 도움을 줄 수 있습니다. 내용을 요약하거나 해결 방안을 제안받아보세요.
                        </p>
                        <div className="flex gap-2">
                            <button className="bg-white text-brand-600 border border-brand-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-100 transition-colors shadow-sm">
                                📝 내용 요약하기
                            </button>
                            <button className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-600 transition-colors shadow-sm">
                                💡 해결 제안받기
                            </button>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.description || '설명이 없습니다.'}</p>
                    </div>
                </div>

                {/* Subtasks */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckSquare size={16} />
                        서브태스크
                        <span className="text-slate-400 font-normal ml-1">
                            {issue.subtasks?.filter(t => t.is_completed).length || 0}/{issue.subtasks?.length || 0}
                        </span>
                    </h3>
                    <div className="space-y-2">
                        {issue.subtasks && issue.subtasks.length > 0 ? issue.subtasks.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group cursor-pointer"
                              onClick={() => handleToggleSubtask(task.id, task.is_completed)}
                            >
                                <input
                                    type="checkbox"
                                    checked={task.is_completed}
                                    readOnly
                                    className="w-4 h-4 text-brand-500 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                                />
                                <span className={`text-sm ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                    {task.title}
                                </span>
                            </div>
                        )) : (
                            <div className="text-sm text-slate-400 italic pl-1">등록된 서브태스크가 없습니다.</div>
                        )}
                        <button className="mt-2 text-sm text-brand-600 hover:underline flex items-center gap-1">
                            <Plus size={14} /> 서브태스크 추가
                        </button>
                    </div>
                </div>

                {/* Comments */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <MessageSquare size={16} />
                        활동
                    </h3>
                    <div className="flex gap-4 mb-6">
                        <img src={issue.assignee?.profile_image || "https://picsum.photos/100/100"} className="w-8 h-8 rounded-full" alt="me" />
                        <div className="flex-1 relative">
                            <textarea
                                placeholder="댓글을 남겨주세요..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg p-3 min-h-[80px] text-sm focus:ring-2 focus:ring-brand-100 focus:border-brand-500 outline-none resize-none"
                            ></textarea>
                            <div className="absolute bottom-2 right-2 flex gap-2">
                                <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                                    <Paperclip size={16} />
                                </button>
                                <button
                                  onClick={handleAddComment}
                                  className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-medium hover:bg-slate-700"
                                >
                                    등록
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Comment List */}
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4">
                                <img
                                  src={comment.user?.profile_image || "https://picsum.photos/100/100"}
                                  className="w-8 h-8 rounded-full"
                                  alt="User"
                                />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-slate-900">{comment.user?.name || '익명'}</span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(comment.created_at).toLocaleDateString('ko-KR', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">{comment.content}</p>
                                </div>
                            </div>
                        ))}
                        {comments.length === 0 && (
                            <div className="text-sm text-slate-400 italic">아직 댓글이 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar (Right) */}
            <div className="w-full md:w-80 bg-slate-50 border-l border-slate-200 p-6 overflow-y-auto hidden md:block">
                <div className="space-y-6">
                    {/* Status Select */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">상태</label>
                        <select
                            value={issue.status_id || ''}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-brand-500 shadow-sm"
                        >
                            <option value="">상태 없음</option>
                            {projectStatuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                    {status.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">담당자</label>
                        {issue.assignee ? (
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 cursor-pointer hover:border-brand-300 transition-colors shadow-sm">
                                <img
                                  src={issue.assignee.profile_image || "https://picsum.photos/100/100"}
                                  className="w-6 h-6 rounded-full"
                                  alt="Assignee"
                                />
                                <span className="text-sm text-slate-700">{issue.assignee.name}</span>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic p-2">담당자 없음</div>
                        )}
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">우선순위</label>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                issue.priority === 'HIGH'
                                  ? 'bg-red-50 text-red-600 border-red-100'
                                  : issue.priority === 'MEDIUM'
                                  ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {issue.priority}
                            </span>
                        </div>
                    </div>

                    {/* Dates */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">마감일</label>
                        {issue.due_date ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                                <Calendar size={16} className="text-slate-400" />
                                <span>
                                    {new Date(issue.due_date).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic p-2">마감일 없음</div>
                        )}
                    </div>

                     {/* Labels */}
                     <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">라벨</label>
                        <div className="flex flex-wrap gap-2">
                            {issue.labels && issue.labels.length > 0 ? (
                                issue.labels.map((label) => (
                                    <span
                                      key={label.id}
                                      className="px-2 py-1 rounded text-xs font-medium border"
                                      style={{
                                        backgroundColor: `${label.color}20`,
                                        color: label.color,
                                        borderColor: `${label.color}40`
                                      }}
                                    >
                                        {label.name}
                                    </span>
                                ))
                            ) : (
                                <div className="text-sm text-slate-400 italic">라벨 없음</div>
                            )}
                            <button className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default IssueDetail;
