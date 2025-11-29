'use client';

import React, { useEffect, useState } from 'react';
import { X, Calendar, User as UserIcon, Tag, Sparkles, MessageSquare, CheckSquare, Paperclip, Share2, Plus, ChevronLeft } from 'lucide-react';
import { Priority } from '../types';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Supabase 테이블에서 가져온 데이터 타입 정의
interface User {
  id: string;
  name: string;
  email: string;
  profile_image: string | null;
}

interface ProjectStatus {
  id: string;
  name: string;
  color: string | null;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: User;
}

interface IssueData {
  id: string;
  title: string;
  description: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  due_date: string | null;
  created_at: string;
  assignee: User | null;
  reporter: User | null;
  status: ProjectStatus | null;
  labels: Label[];
  subtasks: Subtask[];
  comments: Comment[];
}

interface IssueDetailWithDBProps {
  issueId: string;
}

const IssueDetailWithDB: React.FC<IssueDetailWithDBProps> = ({ issueId }) => {
  const router = useRouter();
  const [issue, setIssue] = useState<IssueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 이슈 데이터 조회 함수
  const fetchIssueData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // 1. 기본 이슈 정보 + 담당자, 생성자, 상태 조인
      const { data: issueData, error: issueError } = await supabase
        .from('issues')
        .select(`
          id,
          title,
          description,
          priority,
          due_date,
          created_at,
          assignee:assignee_id (
            id,
            name,
            email,
            profile_image
          ),
          reporter:reporter_id (
            id,
            name,
            email,
            profile_image
          ),
          status:status_id (
            id,
            name,
            color
          )
        `)
        .eq('id', issueId)
        .is('deleted_at', null)
        .single();

      if (issueError) throw issueError;
      if (!issueData) throw new Error('Issue not found');

      // 2. 라벨 조회 (issue_labels 테이블과 labels 테이블 조인)
      const { data: labelsData, error: labelsError } = await supabase
        .from('issue_labels')
        .select(`
          label:label_id (
            id,
            name,
            color
          )
        `)
        .eq('issue_id', issueId);

      if (labelsError) throw labelsError;

      // 3. 서브태스크 조회
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select('id, title, is_completed, position')
        .eq('issue_id', issueId)
        .order('position', { ascending: true });

      if (subtasksError) throw subtasksError;

      // 4. 댓글 조회 (작성자 정보 포함)
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user:user_id (
            id,
            name,
            email,
            profile_image
          )
        `)
        .eq('issue_id', issueId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // 5. 데이터 조합
      const formattedIssue: IssueData = {
        ...issueData,
        labels: labelsData?.map((item: any) => item.label).filter(Boolean) || [],
        subtasks: subtasksData || [],
        comments: commentsData?.map((comment: any) => ({
          ...comment,
          user: comment.user
        })) || []
      };

      setIssue(formattedIssue);
    } catch (err: any) {
      console.error('Error fetching issue:', err);
      setError(err.message || 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  // 댓글 작성 함수
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsSubmittingComment(true);
      const supabase = createClient();

      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 댓글 삽입
      const { error } = await supabase
        .from('comments')
        .insert({
          issue_id: issueId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      // 댓글 입력창 초기화 및 데이터 새로고침
      setNewComment('');
      await fetchIssueData();
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      alert('댓글 등록에 실패했습니다: ' + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 서브태스크 완료/미완료 토글 함수
  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('subtasks')
        .update({ is_completed: !currentCompleted })
        .eq('id', subtaskId);

      if (error) throw error;

      // 로컬 상태 업데이트 (즉시 반영)
      setIssue(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          subtasks: prev.subtasks.map(st =>
            st.id === subtaskId ? { ...st, is_completed: !currentCompleted } : st
          )
        };
      });
    } catch (err: any) {
      console.error('Error toggling subtask:', err);
      alert('서브태스크 업데이트에 실패했습니다: ' + err.message);
    }
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '설정 안 됨';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 상대 시간 포맷 함수 (예: "2시간 전")
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return formatDate(dateString);
  };

  // 우선순위 표시 텍스트
  const getPriorityText = (priority: string) => {
    const map: Record<string, string> = {
      'HIGH': '높음',
      'MEDIUM': '보통',
      'LOW': '낮음'
    };
    return map[priority] || priority;
  };

  // 컴포넌트 마운트 시 데이터 조회
  useEffect(() => {
    fetchIssueData();
  }, [issueId]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    );
  }

  // 에러 상태
  if (error || !issue) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-red-500">
          {error || 'Issue not found'}
        </div>
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
          <span className="font-mono text-slate-400">#{issue.id.slice(0, 8)}</span>
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
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {issue.description || '설명이 없습니다.'}
              </p>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckSquare size={16} />
              서브태스크
              <span className="text-slate-400 font-normal ml-1">
                {issue.subtasks.filter(t => t.is_completed).length}/{issue.subtasks.length}
              </span>
            </h3>
            <div className="space-y-2">
              {issue.subtasks.length > 0 ? issue.subtasks.map(task => (
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
              <span className="text-slate-400 font-normal ml-1">
                ({issue.comments.length})
              </span>
            </h3>

            {/* 댓글 입력창 */}
            <div className="flex gap-4 mb-6">
              <img
                src={issue.reporter?.profile_image || "https://picsum.photos/100/100"}
                className="w-8 h-8 rounded-full"
                alt="me"
              />
              <div className="flex-1 relative">
                <textarea
                  placeholder="댓글을 남겨주세요..."
                  className="w-full border border-slate-200 rounded-lg p-3 min-h-[80px] text-sm focus:ring-2 focus:ring-brand-100 focus:border-brand-500 outline-none resize-none"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isSubmittingComment}
                ></textarea>
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                    <Paperclip size={16} />
                  </button>
                  <button
                    className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-medium hover:bg-slate-700 disabled:bg-slate-400"
                    onClick={handleSubmitComment}
                    disabled={isSubmittingComment || !newComment.trim()}
                  >
                    {isSubmittingComment ? '등록 중...' : '등록'}
                  </button>
                </div>
              </div>
            </div>

            {/* 댓글 목록 */}
            <div className="space-y-4">
              {issue.comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <img
                    src={comment.user?.profile_image || "https://picsum.photos/100/100"}
                    className="w-8 h-8 rounded-full"
                    alt={comment.user?.name}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {comment.user?.name || '알 수 없는 사용자'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}

              {issue.comments.length === 0 && (
                <div className="text-sm text-slate-400 italic pl-1">
                  등록된 댓글이 없습니다.
                </div>
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
                defaultValue={issue.status?.name || ''}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-brand-500 shadow-sm"
              >
                <option value="">선택 안 됨</option>
                {issue.status && (
                  <option value={issue.status.name}>{issue.status.name}</option>
                )}
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
                <div className="text-sm text-slate-400 italic">담당자 없음</div>
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
                  {getPriorityText(issue.priority)}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">마감일</label>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                <Calendar size={16} className="text-slate-400" />
                <span>{formatDate(issue.due_date)}</span>
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">라벨</label>
              <div className="flex flex-wrap gap-2">
                {issue.labels.map(label => (
                  <span
                    key={label.id}
                    className="px-2 py-1 rounded text-xs font-medium border"
                    style={{
                      backgroundColor: label.color + '20',
                      color: label.color,
                      borderColor: label.color + '40'
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                {issue.labels.length === 0 && (
                  <div className="text-sm text-slate-400 italic">라벨 없음</div>
                )}
                <button className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Reporter */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">생성자</label>
              {issue.reporter ? (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                  <img
                    src={issue.reporter.profile_image || "https://picsum.photos/100/100"}
                    className="w-6 h-6 rounded-full"
                    alt="Reporter"
                  />
                  <span className="text-sm text-slate-700">{issue.reporter.name}</span>
                </div>
              ) : (
                <div className="text-sm text-slate-400 italic">정보 없음</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetailWithDB;
