'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, ArrowRight, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CreateIssueModalProps {
    onClose: () => void;
    onSuccess?: () => void; // 생성 성공 시 콜백
}

interface Project {
    id: string;
    name: string;
}

interface SimilarIssue {
    id: string;
    issue_key: string;
    title: string;
}

const CreateIssueModalWithDB: React.FC<CreateIssueModalProps> = ({ onClose, onSuccess }) => {
    const supabase = createClient();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedPriority, setSelectedPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [createAnother, setCreateAnother] = useState(false);

    // Projects list
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    // AI features state
    const [duplicates, setDuplicates] = useState<SimilarIssue[]>([]);
    const [aiLabels, setAiLabels] = useState<string[]>([]);
    const [showAiSuggestion, setShowAiSuggestion] = useState(false);

    // Loading state
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // =============================================
    // 1. 프로젝트 목록 조회
    // =============================================
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('id, name')
                    .is('deleted_at', null)
                    .eq('is_archived', false)
                    .order('name');

                if (error) throw error;

                setProjects(data || []);

                // 첫 번째 프로젝트를 기본 선택
                if (data && data.length > 0) {
                    setSelectedProjectId(data[0].id);
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
                setError('프로젝트 목록을 불러오는데 실패했습니다.');
            } finally {
                setLoadingProjects(false);
            }
        };

        fetchProjects();
    }, []);

    // =============================================
    // 2. AI 중복 검사 - 실제 DB에서 유사 이슈 검색
    // =============================================
    useEffect(() => {
        const checkDuplicates = async () => {
            if (title.length <= 3 || !selectedProjectId) {
                setDuplicates([]);
                return;
            }

            try {
                // 제목에서 의미있는 단어 추출 (2글자 이상)
                const keywords = title
                    .split(' ')
                    .filter(word => word.length > 2)
                    .join(' | '); // PostgreSQL Full Text Search 문법

                if (!keywords) {
                    setDuplicates([]);
                    return;
                }

                // 같은 프로젝트 내에서 유사한 제목을 가진 이슈 검색
                // ILIKE를 사용해서 대소문자 구분 없이 검색
                const { data, error } = await supabase
                    .from('issues')
                    .select('id, issue_key, title')
                    .eq('project_id', selectedProjectId)
                    .is('deleted_at', null)
                    .ilike('title', `%${title.split(' ')[0]}%`) // 첫 단어로 검색
                    .limit(3);

                if (error) throw error;

                setDuplicates(data || []);
            } catch (err) {
                console.error('Error checking duplicates:', err);
                // 중복 검사 실패는 에러로 표시하지 않음 (선택적 기능)
            }
        };

        // 디바운싱: 입력 후 500ms 후에 검색
        const timer = setTimeout(() => {
            checkDuplicates();
        }, 500);

        return () => clearTimeout(timer);
    }, [title, selectedProjectId]);

    // =============================================
    // 3. AI 라벨 제안 (기존 로직 유지)
    // =============================================
    useEffect(() => {
        if (description.length > 10) {
            setShowAiSuggestion(true);

            // 간단한 키워드 매칭으로 라벨 제안
            const suggestions: string[] = [];

            if (description.includes('UI') || description.includes('화면') || description.includes('디자인')) {
                suggestions.push('Design');
            }
            if (description.includes('API') || description.includes('서버') || description.includes('백엔드')) {
                suggestions.push('Backend');
            }
            if (description.includes('오류') || description.includes('버그') || description.includes('에러')) {
                suggestions.push('Bug');
            }
            if (description.includes('기능') || description.includes('추가')) {
                suggestions.push('Feature');
            }

            if (suggestions.length === 0) {
                suggestions.push('General');
            }

            setAiLabels(suggestions);
        } else {
            setShowAiSuggestion(false);
        }
    }, [description]);

    // =============================================
    // 4. 이슈 생성 처리
    // =============================================
    const handleCreateIssue = async () => {
        // 유효성 검사
        if (!title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }

        if (!selectedProjectId) {
            setError('프로젝트를 선택해주세요.');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            // 현재 로그인한 사용자 가져오기
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }

            // 프로젝트의 기본 status 조회 (is_default=true 또는 position이 가장 작은 것)
            const { data: defaultStatus, error: statusError } = await supabase
                .from('project_statuses')
                .select('id')
                .eq('project_id', selectedProjectId)
                .order('position', { ascending: true })
                .limit(1)
                .single();

            if (statusError || !defaultStatus) {
                throw new Error('프로젝트의 기본 상태를 찾을 수 없습니다.');
            }

            // 이슈 생성
            // issue_key는 트리거로 자동 생성됨
            const { data, error } = await supabase
                .from('issues')
                .insert({
                    project_id: selectedProjectId,
                    title: title.trim(),
                    description: description.trim() || null,
                    type: 'TASK', // 기본 타입
                    priority: selectedPriority,
                    reporter_id: user.id,
                    status_id: defaultStatus.id,
                })
                .select('id, issue_key')
                .single();

            if (error) throw error;

            console.log('Issue created successfully:', data);

            // 성공 콜백 호출
            if (onSuccess) {
                onSuccess();
            }

            // "Create another" 체크박스에 따라 처리
            if (createAnother) {
                // 폼 초기화
                setTitle('');
                setDescription('');
                setDuplicates([]);
                setAiLabels([]);
                setShowAiSuggestion(false);
            } else {
                // 모달 닫기
                onClose();
            }
        } catch (err: any) {
            console.error('Error creating issue:', err);
            setError(err.message || '이슈 생성에 실패했습니다.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">Create new issue</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded"
                        disabled={isCreating}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            type="text"
                            className="w-full text-lg font-medium border-b border-slate-200 pb-2 focus:outline-none focus:border-brand-500 placeholder:text-slate-300 transition-colors disabled:opacity-50"
                            placeholder="Issue title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isCreating}
                            autoFocus
                        />
                    </div>

                    {/* AI Duplicate Warning */}
                    {duplicates.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 animate-in slide-in-from-top-2 fade-in">
                            <div className="flex items-center gap-2 text-yellow-700 font-semibold text-sm mb-2">
                                <AlertTriangle size={16} />
                                <span>Similar issues detected</span>
                            </div>
                            <div className="space-y-2">
                                {duplicates.map(d => (
                                    <div key={d.id} className="flex items-center justify-between bg-white/50 p-2 rounded border border-yellow-100 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-mono text-xs">{d.issue_key}</span>
                                            <span className="text-slate-700">{d.title}</span>
                                        </div>
                                        <a
                                            href={`/issues/${d.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-600 hover:underline text-xs flex items-center gap-1"
                                        >
                                            View <ArrowRight size={10} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 text-xs text-yellow-600 text-right">
                                Please check if your issue is already reported.
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg p-3 h-32 focus:ring-2 focus:ring-brand-100 focus:border-brand-500 outline-none resize-none text-sm leading-relaxed disabled:opacity-50"
                            placeholder="Describe the issue..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isCreating}
                        />
                    </div>

                    {/* AI Label Suggestion */}
                    {showAiSuggestion && (
                        <div className="flex items-start gap-3 bg-brand-50/50 p-3 rounded-lg border border-brand-100/50">
                            <div className="p-1.5 bg-brand-100 rounded-md text-brand-600 mt-0.5">
                                <Sparkles size={14} />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-brand-900">AI Suggestions</h4>
                                <p className="text-xs text-brand-600 mb-2">Based on your description, we recommend these labels:</p>
                                <div className="flex flex-wrap gap-2">
                                    {aiLabels.map(label => (
                                        <button
                                            key={label}
                                            className="flex items-center gap-1 px-2 py-1 bg-white border border-brand-200 rounded shadow-sm text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50"
                                            disabled={isCreating}
                                        >
                                            <Tag size={10} />
                                            {label}
                                            <span className="text-brand-300 ml-1">|</span>
                                            <span className="text-brand-500 hover:font-bold">+</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Properties Row */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                Project
                            </label>
                            {loadingProjects ? (
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-sm text-slate-400">
                                    Loading...
                                </div>
                            ) : projects.length === 0 ? (
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-sm text-slate-400">
                                    No projects available
                                </div>
                            ) : (
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-sm text-slate-700 focus:outline-none focus:border-slate-300 disabled:opacity-50"
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    disabled={isCreating}
                                >
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                Priority
                            </label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-sm text-slate-700 focus:outline-none focus:border-slate-300 disabled:opacity-50"
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                                disabled={isCreating}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 disabled:opacity-50"
                                checked={createAnother}
                                onChange={(e) => setCreateAnother(e.target.checked)}
                                disabled={isCreating}
                            />
                            <span className="text-sm text-slate-600">Create another</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateIssue}
                            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            disabled={isCreating || !title.trim() || !selectedProjectId}
                        >
                            {isCreating ? 'Creating...' : 'Create Issue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateIssueModalWithDB;
