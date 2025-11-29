'use client';

import React from 'react';
import { issues } from '../mockData';
import { Status, Priority, Issue } from '../types';
import { MoreHorizontal, Plus, Filter, SlidersHorizontal } from 'lucide-react';

interface ProjectKanbanProps {
    onOpenIssue: (issue: Issue) => void;
}

const ProjectKanban: React.FC<ProjectKanbanProps> = ({ onOpenIssue }) => {
    // Columns config
    const columns = [
        { id: Status.BACKLOG, title: 'Backlog', icon: <div className="w-3 h-3 rounded-full border border-slate-400 border-dashed"></div> },
        { id: Status.TODO, title: 'Todo', icon: <div className="w-3 h-3 rounded-full border border-slate-400"></div> },
        { id: Status.IN_REVIEW, title: 'In Review', icon: <div className="w-3 h-3 rounded-full bg-yellow-400"></div> },
        { id: Status.DONE, title: 'Done', icon: <div className="w-3 h-3 rounded-full bg-brand-500"></div> },
    ];

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
                    const columnIssues = issues.filter(i => i.status === col.id);
                    
                    return (
                        <div key={col.id} className="min-w-[300px] w-[300px] flex flex-col h-full border-r border-slate-100 bg-[#F7F8F9]">
                            {/* Column Header */}
                            <div className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {col.icon}
                                    <span className="font-medium text-sm text-slate-700">{col.title}</span>
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
                                        onClick={() => onOpenIssue(issue)}
                                        className="bg-white p-3 rounded-md border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                             <span className="text-[10px] text-slate-400 font-mono">{issue.id}</span>
                                             <img src={issue.assignee?.avatar} alt="" className="w-4 h-4 rounded-full" />
                                        </div>
                                        
                                        <h4 className="font-medium text-slate-800 mb-2 text-sm leading-snug">{issue.title}</h4>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                            {issue.priority === Priority.HIGH && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="High Priority"></span>
                                            )}
                                             {issue.labels.map(label => (
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

