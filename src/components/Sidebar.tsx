'use client';

import React, { useState } from 'react';
import { 
  Inbox, 
  CheckCircle2, 
  Layers, 
  Search, 
  Edit, 
  MoreHorizontal, 
  ChevronRight, 
  ChevronDown, 
  Box, 
  LayoutGrid,
  Zap,
  RotateCcw,
  Users,
  Settings,
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { currentUser } from '../mockData';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  onCompose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onCompose }) => {
  const [isTeamExpanded, setIsTeamExpanded] = useState(true);

  const NavItem = ({ id, icon: Icon, label, count, onClick, active }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors group
        ${active 
          ? 'bg-slate-100 text-slate-900' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon size={16} className={active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'} />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-slate-400 font-normal">{count}</span>
      )}
    </button>
  );

  return (
    <aside className="w-[260px] h-screen bg-[#F7F8F9] border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50">
      {/* Top Header */}
      <div className="h-14 flex items-center justify-between px-4 mt-1">
        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/50 p-1.5 rounded-lg transition-colors">
            <div className="w-5 h-5 bg-brand-500 rounded text-white flex items-center justify-center font-bold text-xs">
                L
            </div>
            <span className="font-semibold text-sm text-slate-800">Lightsoft</span>
            <ChevronDown size={14} className="text-slate-400" />
        </div>
        <div className="flex items-center gap-1">
            <button className="p-1.5 text-slate-500 hover:bg-slate-200/50 rounded-md">
                <Search size={16} />
            </button>
            <button 
                onClick={onCompose}
                className="p-1.5 text-slate-500 hover:bg-slate-200/50 rounded-md" 
                title="Create Issue"
            >
                <Edit size={16} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
        {/* Primary Nav */}
        <div className="space-y-0.5">
            <NavItem id="pulse" icon={Zap} label="Pulse" count={4} />
            <NavItem id="inbox" icon={Inbox} label="Inbox" count={58} />
            <NavItem 
                id="my_issues" 
                icon={CheckCircle2} 
                label="My issues" 
                active={currentView === 'my_issues' || currentView === 'dashboard'} 
                onClick={() => onChangeView('my_issues')}
            />
            <NavItem id="reviews" icon={RotateCcw} label="Reviews" count={2} />
        </div>

        {/* Workspace */}
        <div>
            <div className="px-3 mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                Workspace
                <ChevronDown size={12} />
            </div>
            <div className="space-y-0.5">
                <NavItem 
                    id="projects" 
                    icon={Box} 
                    label="Projects" 
                    active={currentView === 'projects'}
                    onClick={() => onChangeView('projects')}
                />
                <NavItem 
                    id="stats" 
                    icon={BarChart2} 
                    label="Insights" 
                    active={currentView === 'stats'}
                    onClick={() => onChangeView('stats')}
                />
                <NavItem id="views" icon={Layers} label="Views" />
                <NavItem id="more" icon={MoreHorizontal} label="More" />
            </div>
        </div>

        {/* Your Teams */}
        <div>
            <div className="px-3 mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                Your teams
                <ChevronDown size={12} />
            </div>
            <div className="space-y-0.5">
                {/* Locked Teams */}
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-slate-500 opacity-75 cursor-not-allowed">
                    <div className="w-4 h-4 bg-red-400 rounded-sm flex items-center justify-center text-[8px] text-white">K</div>
                    <span className="flex-1 text-left">kits</span>
                    <span className="text-[10px] text-slate-400">🔒</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-slate-500 opacity-75 cursor-not-allowed">
                    <div className="w-4 h-4 bg-green-400 rounded-sm flex items-center justify-center text-[8px] text-white">P</div>
                    <span className="flex-1 text-left">porterx</span>
                    <span className="text-[10px] text-slate-400">🔒</span>
                </button>
                
                {/* Active Team */}
                <div className="mt-2">
                     <button 
                        onClick={() => setIsTeamExpanded(!isTeamExpanded)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-900 hover:bg-slate-100"
                    >
                        <div className="w-4 h-4 bg-brand-500 rounded-sm flex items-center justify-center text-[8px] text-white">L</div>
                        <span className="flex-1 text-left">Lightsoft</span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTeamExpanded ? '' : '-rotate-90'}`} />
                    </button>
                    
                    {isTeamExpanded && (
                        <div className="ml-2 pl-2 border-l border-slate-200 mt-1 space-y-0.5">
                            <NavItem 
                                id="team_issues" 
                                icon={LayoutGrid} 
                                label="Issues" 
                                active={currentView === 'team_issues'}
                                onClick={() => onChangeView('team_issues')}
                            />
                            <NavItem 
                                id="team_projects" 
                                icon={Box} 
                                label="Projects" 
                                active={currentView === 'projects'}
                                onClick={() => onChangeView('projects')}
                            />
                             <NavItem 
                                id="team_views" 
                                icon={Layers} 
                                label="Views" 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-[#F7F8F9]">
         <div className="mb-3 px-1">
             <div className="flex items-center gap-2 text-xs font-medium text-slate-700 mb-1">
                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[10px]">?</span>
                <span>Try Pro</span>
             </div>
             <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm">
                 <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">!</div>
                 <span className="text-[11px] font-semibold text-slate-700">Business trial ends <span className="text-slate-400">5d</span></span>
             </div>
         </div>
         <button className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-200/50 rounded-md text-sm text-slate-700">
             <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">K</div>
             <span className="flex-1 text-left font-medium">kimchulsoo</span>
         </button>
      </div>
    </aside>
  );
};

export default Sidebar;

