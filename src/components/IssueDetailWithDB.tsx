'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Calendar, User as UserIcon, Tag, Sparkles, MessageSquare, CheckSquare, Paperclip, Share2, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Priority } from '../types';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IssueMorphPanelComplete } from './IssueMorphPanelComplete';

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
  completed: boolean;
  position: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: User;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  profile_image: string | null;
}

interface IssueData {
  id: string;
  project_id: string;
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
  const [newSubtask, setNewSubtask] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [isSubmittingSubtask, setIsSubmittingSubtask] = useState(false);

  // 사이드바 토글 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 드롭다운 상태들
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // DB에서 가져온 옵션들
  const [allStatuses, setAllStatuses] = useState<ProjectStatus[]>([]);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // 새 라벨 추가
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');

  // 드롭다운 ref (외부 클릭 감지용)
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const labelDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  // 프로젝트 관련 데이터 조회 (상태, 라벨, 팀 멤버)
  const fetchProjectData = async (projectId: string) => {
    const supabase = createClient();

    // 1. 프로젝트 상태 목록 조회
    const { data: statusesData } = await supabase
      .from('project_statuses')
      .select('id, name, color')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (statusesData) setAllStatuses(statusesData);

    // 2. 프로젝트 라벨 목록 조회
    const { data: labelsData } = await supabase
      .from('labels')
      .select('id, name, color')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (labelsData) setAllLabels(labelsData);

    // 3. 팀 멤버 목록 조회 (프로젝트 → 팀 → 팀 멤버 → 유저)
    const { data: projectData } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .single();

    if (projectData?.team_id) {
      const { data: membersData } = await supabase
        .from('team_members')
        .select(`
          user:user_id (
            id,
            name,
            email,
            profile_image
          )
        `)
        .eq('team_id', projectData.team_id);

      if (membersData) {
        const members = membersData
          .map((m: any) => m.user)
          .filter(Boolean) as TeamMember[];
        setTeamMembers(members);
      }
    }
  };

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
          project_id,
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

      // 프로젝트 관련 데이터도 함께 조회
      await fetchProjectData(issueData.project_id);

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
        .select('id, title, completed, position')
        .eq('parent_issue_id', issueId)
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
        assignee: Array.isArray(issueData.assignee) ? issueData.assignee[0] : issueData.assignee,
        reporter: Array.isArray(issueData.reporter) ? issueData.reporter[0] : issueData.reporter,
        status: Array.isArray(issueData.status) ? issueData.status[0] : issueData.status,
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
        .update({ completed: !currentCompleted })
        .eq('id', subtaskId);

      if (error) throw error;

      // 로컬 상태 업데이트 (즉시 반영)
      setIssue(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          subtasks: prev.subtasks.map(st =>
            st.id === subtaskId ? { ...st, completed: !currentCompleted } : st
          )
        };
      });
    } catch (err: any) {
      console.error('Error toggling subtask:', err);
      alert('서브태스크 업데이트에 실패했습니다: ' + err.message);
    }
  };

  // 서브태스크 추가 함수
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;

    try {
      setIsSubmittingSubtask(true);
      const supabase = createClient();

      // 현재 서브태스크의 최대 position 값 가져오기
      const maxPosition = issue?.subtasks.length || 0;

      // 서브태스크 삽입
      const { error } = await supabase
        .from('subtasks')
        .insert({
          parent_issue_id: issueId,
          title: newSubtask.trim(),
          completed: false,
          position: maxPosition
        });

      if (error) throw error;

      // 입력창 초기화 및 데이터 새로고침
      setNewSubtask('');
      setShowSubtaskInput(false);
      await fetchIssueData();
    } catch (err: any) {
      console.error('Error adding subtask:', err);
      alert('서브태스크 추가에 실패했습니다: ' + err.message);
    } finally {
      setIsSubmittingSubtask(false);
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

  // 상태 변경 함수
  const handleStatusChange = async (statusId: string) => {
    if (!issue) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('issues')
        .update({ status_id: statusId })
        .eq('id', issueId);

      if (error) throw error;

      const newStatus = allStatuses.find(s => s.id === statusId) || null;
      setIssue(prev => prev ? { ...prev, status: newStatus } : prev);
      setShowStatusDropdown(false);
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('상태 변경에 실패했습니다: ' + err.message);
    }
  };

  // 담당자 변경 함수
  const handleAssigneeChange = async (userId: string | null) => {
    if (!issue) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('issues')
        .update({ assignee_id: userId })
        .eq('id', issueId);

      if (error) throw error;

      const newAssignee = userId ? teamMembers.find(m => m.id === userId) || null : null;
      setIssue(prev => prev ? { ...prev, assignee: newAssignee } : prev);
      setShowAssigneeDropdown(false);
    } catch (err: any) {
      console.error('Error updating assignee:', err);
      alert('담당자 변경에 실패했습니다: ' + err.message);
    }
  };

  // 우선순위 변경 함수
  const handlePriorityChange = async (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (!issue) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('issues')
        .update({ priority })
        .eq('id', issueId);

      if (error) throw error;

      setIssue(prev => prev ? { ...prev, priority } : prev);
      setShowPriorityDropdown(false);
    } catch (err: any) {
      console.error('Error updating priority:', err);
      alert('우선순위 변경에 실패했습니다: ' + err.message);
    }
  };

  // 마감일 변경 함수
  const handleDueDateChange = async (date: string | null) => {
    if (!issue) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('issues')
        .update({ due_date: date })
        .eq('id', issueId);

      if (error) throw error;

      setIssue(prev => prev ? { ...prev, due_date: date } : prev);
    } catch (err: any) {
      console.error('Error updating due date:', err);
      alert('마감일 변경에 실패했습니다: ' + err.message);
    }
  };

  // 라벨 토글 함수 (추가/제거)
  const handleLabelToggle = async (labelId: string) => {
    if (!issue) return;
    const isSelected = issue.labels.some(l => l.id === labelId);

    try {
      const supabase = createClient();

      if (isSelected) {
        const { error } = await supabase
          .from('issue_labels')
          .delete()
          .eq('issue_id', issueId)
          .eq('label_id', labelId);

        if (error) throw error;

        setIssue(prev => prev ? {
          ...prev,
          labels: prev.labels.filter(l => l.id !== labelId)
        } : prev);
      } else {
        if (issue.labels.length >= 5) {
          alert('이슈당 최대 5개의 라벨만 추가할 수 있습니다.');
          return;
        }

        const { error } = await supabase
          .from('issue_labels')
          .insert({ issue_id: issueId, label_id: labelId });

        if (error) throw error;

        const newLabel = allLabels.find(l => l.id === labelId);
        if (newLabel) {
          setIssue(prev => prev ? {
            ...prev,
            labels: [...prev.labels, newLabel]
          } : prev);
        }
      }
    } catch (err: any) {
      console.error('Error toggling label:', err);
      alert('라벨 변경에 실패했습니다: ' + err.message);
    }
  };

  // 새 라벨 생성 함수
  const handleCreateLabel = async () => {
    if (!issue || !newLabelName.trim()) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('labels')
        .insert({
          project_id: issue.project_id,
          name: newLabelName.trim(),
          color: newLabelColor
        })
        .select()
        .single();

      if (error) throw error;

      setAllLabels(prev => [...prev, data]);
      setNewLabelName('');
      setNewLabelColor('#6366f1');
    } catch (err: any) {
      console.error('Error creating label:', err);
      alert('라벨 생성에 실패했습니다: ' + err.message);
    }
  };

  // 컴포넌트 마운트 시 데이터 조회
  useEffect(() => {
    fetchIssueData();
  }, [issueId]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

            {/* AI Assistant Panel */}
            <div className="mb-6">
              <IssueMorphPanelComplete
                issueId={issue.id}
                issueTitle={issue.title}
                issueDescription={issue.description}
                projectId={issue.project_id}
                existingLabels={allLabels}
                comments={issue.comments}
              />
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
                {issue.subtasks.filter(t => t.completed).length}/{issue.subtasks.length}
              </span>
            </h3>
            <div className="space-y-2">
              {issue.subtasks.length > 0 ? issue.subtasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => handleToggleSubtask(task.id, task.completed)}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    readOnly
                    className="w-4 h-4 text-brand-500 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className={`text-sm ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.title}
                  </span>
                </div>
              )) : (
                <div className="text-sm text-slate-400 italic pl-1">등록된 서브태스크가 없습니다.</div>
              )}

              {/* 서브태스크 추가 입력창 */}
              {showSubtaskInput ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-100 focus:border-brand-500 outline-none"
                    placeholder="서브태스크 제목..."
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddSubtask();
                    }}
                    disabled={isSubmittingSubtask}
                    autoFocus
                  />
                  <button
                    className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-700 disabled:bg-slate-400"
                    onClick={handleAddSubtask}
                    disabled={isSubmittingSubtask || !newSubtask.trim()}
                  >
                    {isSubmittingSubtask ? '추가 중...' : '추가'}
                  </button>
                  <button
                    className="text-slate-400 hover:text-slate-600 px-2"
                    onClick={() => {
                      setShowSubtaskInput(false);
                      setNewSubtask('');
                    }}
                    disabled={isSubmittingSubtask}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  className="mt-2 text-sm text-brand-600 hover:underline flex items-center gap-1"
                  onClick={() => setShowSubtaskInput(true)}
                >
                  <Plus size={14} /> 서브태스크 추가
                </button>
              )}
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

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-slate-200 hover:bg-slate-300 items-center justify-center rounded-l-lg transition-colors"
          style={{ right: isSidebarOpen ? '320px' : '0' }}
        >
          {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Sidebar (Right) */}
        <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-slate-50 border-l border-slate-200 overflow-hidden transition-all duration-300 hidden md:block`}>
          <div className={`w-80 p-6 overflow-y-auto h-full ${isSidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
            <div className="space-y-6">
              {/* Status Select */}
              <div ref={statusDropdownRef} className="relative">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">상태</label>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-300 transition-colors shadow-sm text-left flex items-center justify-between"
                >
                  <span>{issue.status?.name || '선택 안 됨'}</span>
                  <ChevronRight size={16} className={`transform transition-transform ${showStatusDropdown ? 'rotate-90' : ''}`} />
                </button>
                {showStatusDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {allStatuses.map(status => (
                      <button
                        key={status.id}
                        onClick={() => handleStatusChange(status.id)}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between ${issue.status?.id === status.id ? 'bg-slate-50' : ''}`}
                      >
                        <span>{status.name}</span>
                        {issue.status?.id === status.id && <Check size={14} className="text-brand-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignee */}
              <div ref={assigneeDropdownRef} className="relative">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">담당자</label>
                <button
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 hover:border-brand-300 transition-colors shadow-sm text-left"
                >
                  {issue.assignee ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={issue.assignee.profile_image || "https://picsum.photos/100/100"}
                        className="w-6 h-6 rounded-full"
                        alt="Assignee"
                      />
                      <span className="text-sm text-slate-700">{issue.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">담당자 없음</span>
                  )}
                </button>
                {showAssigneeDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <button
                      onClick={() => handleAssigneeChange(null)}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 text-slate-400 ${!issue.assignee ? 'bg-slate-50' : ''}`}
                    >
                      담당자 없음
                    </button>
                    {teamMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => handleAssigneeChange(member.id)}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center gap-2 ${issue.assignee?.id === member.id ? 'bg-slate-50' : ''}`}
                      >
                        <img
                          src={member.profile_image || "https://picsum.photos/100/100"}
                          className="w-5 h-5 rounded-full"
                          alt={member.name}
                        />
                        <span>{member.name}</span>
                        {issue.assignee?.id === member.id && <Check size={14} className="text-brand-500 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div ref={priorityDropdownRef} className="relative">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">우선순위</label>
                <button
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-brand-300 transition-colors shadow-sm text-left"
                >
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${
                    issue.priority === 'HIGH'
                      ? 'bg-red-50 text-red-600 border-red-100'
                      : issue.priority === 'MEDIUM'
                      ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {getPriorityText(issue.priority)}
                  </span>
                </button>
                {showPriorityDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
                    {(['HIGH', 'MEDIUM', 'LOW'] as const).map(priority => (
                      <button
                        key={priority}
                        onClick={() => handlePriorityChange(priority)}
                        className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center justify-between ${issue.priority === priority ? 'bg-slate-50' : ''}`}
                      >
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                          priority === 'HIGH'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : priority === 'MEDIUM'
                            ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {getPriorityText(priority)}
                        </span>
                        {issue.priority === priority && <Check size={14} className="text-brand-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dates */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">마감일</label>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                  <Calendar size={16} className="text-slate-400" />
                  <input
                    type="date"
                    value={issue.due_date || ''}
                    onChange={(e) => handleDueDateChange(e.target.value || null)}
                    className="flex-1 text-sm text-slate-600 outline-none bg-transparent"
                  />
                  {issue.due_date && (
                    <button
                      onClick={() => handleDueDateChange(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Labels */}
              <div ref={labelDropdownRef} className="relative">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">라벨</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {issue.labels.map(label => (
                    <span
                      key={label.id}
                      onClick={() => handleLabelToggle(label.id)}
                      className="px-2 py-1 rounded text-xs font-medium border cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: label.color + '20',
                        color: label.color,
                        borderColor: label.color + '40'
                      }}
                    >
                      {label.name} ×
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-md border border-brand-200 transition-colors"
                >
                  <Plus size={14} /> 라벨 추가
                </button>
                {showLabelDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-slate-100 bg-white">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="새 라벨 이름"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          className="flex-1 text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-brand-500 bg-white text-slate-900 placeholder:text-slate-400"
                        />
                        <input
                          type="color"
                          value={newLabelColor}
                          onChange={(e) => setNewLabelColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                        />
                        <button
                          onClick={handleCreateLabel}
                          disabled={!newLabelName.trim()}
                          className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-medium disabled:bg-slate-300 hover:bg-slate-700"
                        >
                          추가
                        </button>
                      </div>
                    </div>
                    {allLabels.length === 0 ? (
                      <div className="p-3 text-sm text-slate-400 text-center">라벨이 없습니다</div>
                    ) : (
                      allLabels.map(label => {
                        const isSelected = issue.labels.some(l => l.id === label.id);
                        return (
                          <button
                            key={label.id}
                            onClick={() => handleLabelToggle(label.id)}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center gap-2 ${isSelected ? 'bg-slate-50' : ''}`}
                          >
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            <span>{label.name}</span>
                            {isSelected && <Check size={14} className="text-brand-500 ml-auto" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
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
    </div>
  );
};

export default IssueDetailWithDB;
