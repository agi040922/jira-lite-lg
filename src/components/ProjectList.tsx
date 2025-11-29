'use client';

import React from 'react';
import { projects } from '../mockData';
import { Health, Priority } from '../types';
import { Activity, AlertTriangle, CheckCircle, BarChart3, Plus, Filter, SlidersHorizontal, Calendar, LayoutGrid, List } from 'lucide-react';

const getHealthBadge = (health: Health) => {
    switch(health) {
        case Health.ON_TRACK:
            return <div className="flex items-center gap-1.5 text-green-600"><div className="bg-green-500 w-2 h-2 rounded-full"></div><span className="text-xs font-medium">On track</span></div>;
        case Health.AT_RISK:
            return <div className="flex items-center gap-1.5 text-orange-500"><div className="bg-orange-400 w-2 h-2 rounded-full border-2 border-orange-100"></div><span className="text-xs font-medium">At risk</span></div>;
        case Health.OFF_TRACK:
            return <div className="flex items-center gap-1.5 text-red-500"><div className="bg-red-500 w-2 h-2 rounded-full"></div><span className="text-xs font-medium">Off track</span></div>;
        default: return null;
    }
};

const getPriorityIcon = (priority: Priority) => {
    switch(priority) {
        case Priority.HIGH: return <BarChart3 size={14} className="text-slate-700" />; // Simplified visual from screenshot
        case Priority.MEDIUM: return <BarChart3 size={14} className="text-slate-400" />;
        case Priority.LOW: return <span className="text-slate-300">---</span>;
        default: return null;
    }
};

const ProjectList: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-white">
         {/* View Header */}
         <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer">
                    <div className="w-4 h-4 bg-brand-500 rounded-sm flex items-center justify-center text-[8px] text-white">L</div>
                    <span className="font-semibold text-sm text-slate-800">Lightsoft</span>
                </div>
                <span className="text-slate-300">/</span>
                <span className="text-sm font-medium text-slate-600">Active projects</span>
            </div>
            <div className="flex items-center gap-2">
                 <button className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded">
                    <Filter size={14} />
                    <span>Filter</span>
                </button>
                <button className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200">
                    <SlidersHorizontal size={14} />
                    <span>Display</span>
                </button>
                <button className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs font-medium hover:bg-slate-800 flex items-center gap-1">
                    <Plus size={14} />
                    Add project
                </button>
            </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-500">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Health</div>
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-1 text-center">Lead</div>
            <div className="col-span-2">Target date</div>
            <div className="col-span-2">Status</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
            {projects.map((project) => (
                <div key={project.id} className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-50 hover:bg-slate-50 items-center group transition-colors cursor-pointer">
                    {/* Name */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <div className="p-1 rounded bg-indigo-50 text-indigo-600">
                            <LayoutGrid size={14} />
                        </div>
                        <span className="text-sm font-medium text-slate-800 truncate">{project.name}</span>
                        {/* Status chip if implied by design */}
                        {project.health === Health.ON_TRACK && <div className="text-[10px] text-green-600 bg-green-50 px-1.5 rounded hidden xl:block">6w</div>}
                    </div>

                    {/* Health */}
                    <div className="col-span-2">
                        {getHealthBadge(project.health)}
                    </div>

                    {/* Priority */}
                    <div className="col-span-1 flex justify-center">
                        {getPriorityIcon(project.priority)}
                    </div>

                    {/* Lead */}
                    <div className="col-span-1 flex justify-center">
                         <img src={project.lead.avatar} alt={project.lead.name} className="w-5 h-5 rounded-full border border-slate-100" />
                    </div>

                    {/* Target Date */}
                    <div className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{project.targetDate}</span>
                    </div>

                    {/* Status Progress */}
                    <div className="col-span-2 flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-brand-500 border-r-brand-500 transform -rotate-45"></div>
                        <span className="text-xs font-medium text-slate-600">{project.statusPercent}%</span>
                        <div className="h-0.5 w-12 bg-slate-100 rounded-full overflow-hidden ml-auto hidden md:block">
                            <div className="h-full bg-brand-500" style={{width: `${project.statusPercent}%`}}></div>
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Add New Row Visual */}
             <div className="grid grid-cols-12 gap-4 px-6 py-3 items-center group cursor-pointer hover:bg-slate-50">
                 <div className="col-span-12 text-sm text-slate-400 flex items-center gap-2">
                     <Plus size={16} />
                     <span>New project...</span>
                 </div>
             </div>
        </div>
    </div>
  );
};

export default ProjectList;

