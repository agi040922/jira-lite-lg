'use client';

import React from 'react';
import { issues } from '../mockData';
import { Status, Issue, Priority } from '../types';
import { CheckCircle2, Circle, AlertCircle, Clock, Plus, Filter, SlidersHorizontal, LayoutPanelLeft } from 'lucide-react';

interface IssueGroupProps {
  status: Status;
  issues: Issue[];
  icon: React.ReactNode;
  label: string;
}

const getPriorityIcon = (priority: Priority) => {
    switch(priority) {
        case Priority.HIGH: return <div className="text-red-500"><AlertCircle size={14} /></div>;
        case Priority.MEDIUM: return <div className="text-orange-400"><div className="w-3 h-0.5 bg-orange-400 rounded-full"></div><div className="w-3 h-0.5 bg-orange-400 rounded-full mt-0.5"></div></div>;
        case Priority.LOW: return <div className="text-slate-400"><div className="w-3 h-0.5 bg-slate-400 rounded-full"></div></div>;
        default: return null;
    }
};

const IssueGroup: React.FC<IssueGroupProps> = ({ status, issues, icon, label }) => {
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
                    <div key={issue.id} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-default">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 text-slate-400 pt-0.5">
                           {issue.status === Status.DONE ? <CheckCircle2 size={16} className="text-brand-500" /> : <Circle size={16} />}
                        </div>
                        
                        {/* ID */}
                        <div className="flex-shrink-0 w-20 text-xs text-slate-500 font-mono">
                            {issue.id}
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-800 font-medium truncate block">{issue.title}</span>
                        </div>

                        {/* Labels (Desktop) */}
                        <div className="hidden md:flex gap-1.5">
                             {issue.labels.map(label => (
                                 <span key={label} className="px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-500">
                                     {label}
                                 </span>
                             ))}
                        </div>

                        {/* Priority */}
                        <div className="flex-shrink-0 px-2" title={issue.priority}>
                            {getPriorityIcon(issue.priority)}
                        </div>

                        {/* Assignee */}
                        <div className="flex-shrink-0">
                            <img src={issue.assignee?.avatar} alt="" className="w-5 h-5 rounded-full" />
                        </div>

                        {/* Date */}
                        <div className="flex-shrink-0 w-20 text-right text-xs text-slate-400">
                            {issue.createdAt}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
  // Sort issues into groups based on screenshot structure
  const inReviewIssues = issues.filter(i => i.status === Status.IN_REVIEW);
  const todoIssues = issues.filter(i => i.status === Status.TODO);
  const backlogIssues = issues.filter(i => i.status === Status.BACKLOG);
  const doneIssues = issues.filter(i => i.status === Status.DONE);

  return (
    <div className="flex flex-col h-full bg-white">
        {/* View Header */}
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-purple-100 rounded text-purple-600 flex items-center justify-center">
                    <CheckCircle2 size={14} />
                </div>
                <span className="font-semibold text-sm text-slate-800">My issues</span>
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
                <IssueGroup 
                    label="In Review" 
                    status={Status.IN_REVIEW} 
                    issues={inReviewIssues}
                    icon={<Clock size={16} className="text-yellow-500" />}
                />
                <IssueGroup 
                    label="Todo" 
                    status={Status.TODO} 
                    issues={todoIssues}
                    icon={<Circle size={16} className="text-slate-400" />}
                />
                <IssueGroup 
                    label="Backlog" 
                    status={Status.BACKLOG} 
                    issues={backlogIssues}
                    icon={<Circle size={16} style={{strokeDasharray: '2 2'}} className="text-slate-300" />}
                />
                 <IssueGroup 
                    label="Done" 
                    status={Status.DONE} 
                    issues={doneIssues}
                    icon={<CheckCircle2 size={16} className="text-brand-500" />}
                />
            </div>
        </div>
    </div>
  );
};

export default Dashboard;

