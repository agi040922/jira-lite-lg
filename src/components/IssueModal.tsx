'use client';

import React from 'react';
import { X, Calendar, User as UserIcon, Tag, Sparkles, MessageSquare, CheckSquare, Paperclip, Share2, Plus } from 'lucide-react';
import { Issue, Priority } from '../types';

interface IssueModalProps {
  issue: Issue | null;
  onClose: () => void;
}

const IssueModal: React.FC<IssueModalProps> = ({ issue, onClose }) => {
  if (!issue) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="font-mono text-slate-400">#{issue.id}</span>
                    <span className="text-slate-300">/</span>
                    <span className="hover:underline cursor-pointer">차세대 이커머스</span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Share2 size={18} />
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
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
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
                    </div>
                </div>

                {/* Subtasks */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <CheckSquare size={16} />
                        서브태스크
                        <span className="text-slate-400 font-normal ml-1">
                            {issue.subtasks.filter(t => t.done).length}/{issue.subtasks.length}
                        </span>
                    </h3>
                    <div className="space-y-2">
                        {issue.subtasks.length > 0 ? issue.subtasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={task.done} 
                                    readOnly 
                                    className="w-4 h-4 text-brand-500 rounded border-slate-300 focus:ring-brand-500 cursor-pointer" 
                                />
                                <span className={`text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
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

                {/* Comments (Mock) */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <MessageSquare size={16} />
                        활동
                    </h3>
                    <div className="flex gap-4 mb-6">
                        <img src="https://picsum.photos/100/100" className="w-8 h-8 rounded-full" alt="me" />
                        <div className="flex-1 relative">
                            <textarea 
                                placeholder="댓글을 남겨주세요..." 
                                className="w-full border border-slate-200 rounded-lg p-3 min-h-[80px] text-sm focus:ring-2 focus:ring-brand-100 focus:border-brand-500 outline-none resize-none"
                            ></textarea>
                            <div className="absolute bottom-2 right-2 flex gap-2">
                                <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                                    <Paperclip size={16} />
                                </button>
                                <button className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-medium hover:bg-slate-700">
                                    등록
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Mock Comment Item */}
                    <div className="flex gap-4">
                        <img src={issue.assignee?.avatar} className="w-8 h-8 rounded-full" alt="User" />
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-slate-900">{issue.assignee?.name}</span>
                                <span className="text-xs text-slate-400">2시간 전</span>
                            </div>
                            <p className="text-sm text-slate-600">
                                피그마 시안 확인했습니다. 헤더 컴포넌트 높이값이 모바일에서 조금 다른 것 같은데 확인 부탁드려요.
                            </p>
                        </div>
                    </div>
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
                        defaultValue={issue.status}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-brand-500 shadow-sm"
                    >
                        <option value="BACKLOG">백로그</option>
                        <option value="IN_PROGRESS">진행중</option>
                        <option value="REVIEW">리뷰</option>
                        <option value="DONE">완료</option>
                    </select>
                </div>

                {/* Assignee */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">담당자</label>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 cursor-pointer hover:border-brand-300 transition-colors shadow-sm">
                        <img src={issue.assignee?.avatar} className="w-6 h-6 rounded-full" alt="Assignee" />
                        <span className="text-sm text-slate-700">{issue.assignee?.name}</span>
                    </div>
                </div>

                {/* Priority */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">우선순위</label>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${issue.priority === Priority.HIGH ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {issue.priority}
                        </span>
                    </div>
                </div>

                {/* Dates */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">마감일</label>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                        <Calendar size={16} className="text-slate-400" />
                        <span>{issue.dueDate}</span>
                    </div>
                </div>

                 {/* Labels */}
                 <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">라벨</label>
                    <div className="flex flex-wrap gap-2">
                        {issue.labels.map(label => (
                            <span key={label} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-medium border border-indigo-100">
                                {label}
                            </span>
                        ))}
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

export default IssueModal;

