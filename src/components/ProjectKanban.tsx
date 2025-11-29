'use client';

import React, { useEffect, useState } from 'react';
import { Priority, Issue } from '../types';
import { MoreHorizontal, Plus, Filter, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProjectStatus {
    id: string;
    name: string;
    order_number: number;
}

interface ProjectKanbanProps {
    projectId: string;
    onOpenIssue: (issue: Issue) => void;
}

const ProjectKanban: React.FC<ProjectKanbanProps> = ({ projectId, onOpenIssue }) => {
    const [columns, setColumns] = useState<ProjectStatus[]>([]);
    const [issuesByStatus, setIssuesByStatus] = useState<Record<string, Issue[]>>({});
    const [loading, setLoading] = useState(true);
    const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
    const supabase = createClient();

    // 칸반 컬럼 및 이슈 조회
    const fetchKanbanData = async () => {
        try {
            setLoading(true);

            // 1. 프로젝트 상태(칸반 컬럼) 조회
            const { data: statusesData, error: statusError } = await supabase
                .from('project_statuses')
                .select('*')
                .eq('project_id', projectId)
                .order('order_number', { ascending: true });

            if (statusError) throw statusError;

            // 2. 이슈 조회 (assignee, labels 조인)
            const { data: issuesData, error: issuesError } = await supabase
                .from('issues')
                .select(`
                    *,
                    assignee:assigned_to(id, email, full_name, avatar_url),
                    issue_labels(
                        label:labels(id, name, color)
                    )
                `)
                .eq('project_id', projectId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (issuesError) throw issuesError;

            setColumns(statusesData || []);

            // 이슈를 상태별로 그룹화
            const grouped: Record<string, Issue[]> = {};
            (statusesData || []).forEach(status => {
                grouped[status.id] = [];
            });

            (issuesData || []).forEach((issue: any) => {
                const mappedIssue: Issue = {
                    id: issue.issue_key,
                    title: issue.title,
                    description: issue.description || '',
                    status: issue.status_id,
                    priority: issue.priority || Priority.MEDIUM,
                    assignee: issue.assignee ? {
                        id: issue.assignee.id,
                        name: issue.assignee.full_name || issue.assignee.email,
                        email: issue.assignee.email,
                        avatar: issue.assignee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${issue.assignee.email}`,
                        role: issue.assignee.role || 'member'
                    } : undefined,
                    labels: (issue.issue_labels || []).map((il: any) => il.label?.name).filter(Boolean),
                    createdAt: issue.created_at,
                    projectId: issue.project_id,
                    subtasks: [],
                    commentsCount: 0
                };

                if (grouped[issue.status_id]) {
                    grouped[issue.status_id].push(mappedIssue);
                }
            });

            setIssuesByStatus(grouped);
        } catch (error) {
            console.error('칸반 데이터 조회 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchKanbanData();
        }
    }, [projectId]);

    // Drag & Drop 핸들러
    const handleDragStart = (e: React.DragEvent, issue: Issue) => {
        setDraggedIssue(issue);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
        e.preventDefault();

        if (!draggedIssue) return;

        const sourceStatusId = draggedIssue.status;
        if (sourceStatusId === targetStatusId) {
            setDraggedIssue(null);
            return;
        }

        try {
            // 낙관적 UI 업데이트
            setIssuesByStatus(prev => {
                const newState = { ...prev };

                // 이전 컬럼에서 제거
                newState[sourceStatusId] = newState[sourceStatusId].filter(
                    issue => issue.id !== draggedIssue.id
                );

                // 새 컬럼에 추가
                const updatedIssue = { ...draggedIssue, status: targetStatusId as any };
                newState[targetStatusId] = [...(newState[targetStatusId] || []), updatedIssue];

                return newState;
            });

            // DB 업데이트
            const { error } = await supabase
                .from('issues')
                .update({ status_id: targetStatusId })
                .eq('issue_key', draggedIssue.id);

            if (error) {
                console.error('이슈 상태 업데이트 실패:', error);
                // 실패 시 롤백
                await fetchKanbanData();
            }
        } catch (error) {
            console.error('Drag & Drop 처리 실패:', error);
            await fetchKanbanData();
        } finally {
            setDraggedIssue(null);
        }
    };

    // 아이콘 렌더링 함수
    const getStatusIcon = (statusName: string) => {
        const lowerName = statusName.toLowerCase();
        if (lowerName.includes('backlog')) {
            return <div className="w-3 h-3 rounded-full border border-slate-400 border-dashed"></div>;
        } else if (lowerName.includes('progress') || lowerName.includes('doing')) {
            return <div className="w-3 h-3 rounded-full bg-yellow-400"></div>;
        } else if (lowerName.includes('done') || lowerName.includes('complete')) {
            return <div className="w-3 h-3 rounded-full bg-brand-500"></div>;
        } else {
            return <div className="w-3 h-3 rounded-full border border-slate-400"></div>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-white">
                <p className="text-slate-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Kanban Header */}
            <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
                 <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-brand-500 rounded-sm flex items-center justify-center text-[8px] text-white">L</div>
                    <span className="font-semibold text-sm text-slate-800">Lightsoft Issues</span>
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

            <div className="flex-1 overflow-x-auto p-0 flex">
                {columns.map((col) => {
                    const columnIssues = issuesByStatus[col.id] || [];

                    return (
                        <div
                            key={col.id}
                            className="min-w-[300px] w-[300px] flex flex-col h-full border-r border-slate-100 bg-[#F7F8F9]"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            <div className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(col.name)}
                                    <span className="font-medium text-sm text-slate-700">{col.name}</span>
                                    <span className="text-slate-400 text-xs font-normal">{columnIssues.length}</span>
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
                                        onDragStart={(e) => handleDragStart(e, issue)}
                                        onClick={() => onOpenIssue(issue)}
                                        className="bg-white p-3 rounded-md border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                             <span className="text-[10px] text-slate-400 font-mono">{issue.id}</span>
                                             {issue.assignee?.avatar && (
                                                <img src={issue.assignee.avatar} alt="" className="w-4 h-4 rounded-full" />
                                             )}
                                        </div>

                                        <h4 className="font-medium text-slate-800 mb-2 text-sm leading-snug">{issue.title}</h4>

                                        <div className="flex items-center gap-1 mt-2">
                                            {issue.priority === Priority.HIGH && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="High Priority"></span>
                                            )}
                                             {issue.labels && issue.labels.map(label => (
                                                <span key={label} className="text-[10px] text-slate-500 border border-slate-100 px-1 rounded-sm bg-slate-50">
                                                    {label}
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
                 <div className="w-8 shrink-0 bg-[#F7F8F9] border-r border-slate-100 flex items-start justify-center pt-3">
                     <button className="p-1 hover:bg-slate-200 rounded text-slate-400">
                        <Plus size={16} />
                     </button>
                 </div>
            </div>
        </div>
    );
};

export default ProjectKanban;

