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
  BarChart2,
  Plus,
  Trash2,
  PenSquare
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types/database.types';
import { useTeam } from '@/components/providers/TeamContext';
import Link from 'next/link';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  onCompose: () => void;
}

interface SidebarData {
  user: User | null;
  unreadNotifications: number;
  myIssuesCount: number;
  reviewsCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onCompose }) => {
  const [isTeamExpanded, setIsTeamExpanded] = useState(true);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [sidebarData, setSidebarData] = useState<SidebarData>({
    user: null,
    unreadNotifications: 0,
    myIssuesCount: 0,
    reviewsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  
  const { currentTeam, teams, switchTeam, isLoading: isTeamLoading } = useTeam();
  const supabase = createClient();

  // DB에서 사이드바 데이터 불러오기 (팀 정보 제외)
  React.useEffect(() => {
    fetchSidebarData();
  }, [currentTeam]); // 팀이 변경되면 데이터 다시 로드 (필요시)

  const fetchSidebarData = async () => {
    try {
      setLoading(true);

      // 1. 현재 사용자 정보 가져오기
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('No authenticated user');
        return;
      }

      // 2. users 테이블에서 프로필 정보 가져오기
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // 3. 읽지 않은 알림 개수
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('is_read', false);

      // 4. 내 이슈 개수 (할당된 이슈)
      let myIssuesQuery = supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', authUser.id)
        .is('deleted_at', null);
      
      // 팀이 선택되어 있다면 해당 팀의 프로젝트 이슈만 카운트 (선택적)
      // 현재 구조상 이슈는 프로젝트에 속하고 프로젝트는 팀에 속함.
      // 복잡한 조인이 필요하므로 일단 전체 이슈 카운트로 유지하거나 추후 개선

      const { count: myIssuesCount } = await myIssuesQuery;

      // 5. 리뷰 대기 중인 이슈 개수 (임시로 HIGH priority 이슈)
      const { count: reviewsCount } = await supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'HIGH')
        .is('deleted_at', null);

      setSidebarData({
        user: userProfile as User,
        unreadNotifications: unreadCount || 0,
        myIssuesCount: myIssuesCount || 0,
        reviewsCount: reviewsCount || 0,
      });

    } catch (error) {
      console.error('Failed to fetch sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Top Header (Team Switcher) */}
      <div className="h-14 flex items-center justify-between px-4 mt-1 relative">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/50 p-1.5 rounded-lg transition-colors flex-1"
          onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
        >
            <div className="w-5 h-5 bg-brand-500 rounded text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentTeam?.name?.charAt(0).toUpperCase() || 'L'}
            </div>
            <span className="font-semibold text-sm text-slate-800 truncate max-w-[120px]">
              {currentTeam?.name || 'Select Team'}
            </span>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </div>
        
        {/* Team Dropdown */}
        {isTeamDropdownOpen && (
          <div className="absolute top-12 left-4 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Switch Team
            </div>
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  switchTeam(team.id);
                  setIsTeamDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${currentTeam?.id === team.id ? 'text-brand-600 font-medium bg-brand-50' : 'text-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] text-white ${currentTeam?.id === team.id ? 'bg-brand-500' : 'bg-slate-400'}`}>
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{team.name}</span>
                {currentTeam?.id === team.id && <CheckCircle2 size={14} className="ml-auto" />}
              </button>
            ))}
            <div className="border-t border-slate-100 my-1"></div>
            <Link 
              href="/team/create" 
              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 hover:text-brand-600"
              onClick={() => setIsTeamDropdownOpen(false)}
            >
              <Plus size={14} />
              Create New Team
            </Link>
          </div>
        )}

        {/* Overlay to close dropdown */}
        {isTeamDropdownOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setIsTeamDropdownOpen(false)} />
        )}
        </div>




      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
        {/* Primary Nav */}
        <div className="space-y-0.5">

            <NavItem 
                id="inbox" 
                icon={Inbox} 
                label="Inbox" 
                count={loading ? '...' : sidebarData.unreadNotifications || undefined}
                active={currentView === 'inbox'}
                onClick={() => onChangeView('inbox')}
            />
            <NavItem 
                id="my_issues" 
                icon={CheckCircle2} 
                label="My issues"
                count={loading ? '...' : sidebarData.myIssuesCount || undefined}
                active={currentView === 'my_issues' || currentView === 'dashboard'} 
                onClick={() => onChangeView('my_issues')}
            />
            <NavItem 
                id="reviews" 
                icon={RotateCcw} 
                label="Reviews" 
                count={loading ? '...' : sidebarData.reviewsCount || undefined}
                active={currentView === 'reviews'}
                onClick={() => onChangeView('reviews')}
            />
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
                <NavItem 
                    id="views" 
                    icon={Layers} 
                    label="Views" 
                    active={currentView === 'views'}
                    onClick={() => onChangeView('views')}
                />
                <NavItem id="more" icon={MoreHorizontal} label="More" />
            </div>
        </div>

        {/* Settings at bottom of list */}


        {/* Your Teams (Current Team Context) */}
        <div>
            <div className="px-3 mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                Current Team
                <ChevronDown size={12} />
            </div>
            <div className="space-y-0.5">
                {isTeamLoading ? (
                  <div className="px-3 py-2 text-xs text-slate-400">Loading team...</div>
                ) : !currentTeam ? (
                  <div className="px-3 py-2 text-xs text-slate-400">No team selected</div>
                ) : (
                  <div className="mt-2">
                    <button 
                      onClick={() => setIsTeamExpanded(!isTeamExpanded)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-900 hover:bg-slate-100"
                    >
                      <div className="w-4 h-4 bg-brand-500 rounded-sm flex items-center justify-center text-[8px] text-white">
                        {currentTeam.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left truncate">{currentTeam.name}</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isTeamExpanded ? '' : '-rotate-90'}`} />
                    </button>
                    
                    {isTeamExpanded && (
                      <div className="ml-2 pl-2 border-l border-slate-200 mt-1 space-y-0.5">
                        <NavItem 
                          id="team_issues" 
                          icon={LayoutGrid} 
                          label="Team Issues" 
                          active={currentView === 'team_issues'}
                          onClick={() => onChangeView('team_issues')}
                        />
                        <NavItem 
                          id="team_projects" 
                          icon={Box} 
                          label="Team Projects" 
                          active={currentView === 'projects'}
                          onClick={() => onChangeView('projects')}
                        />
                        <NavItem 
                          id="team_manage" 
                          icon={Users} 
                          label="Manage Members" 
                          active={currentView === 'team_manage'}
                          onClick={() => onChangeView('team_manage')}
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>
        </div>


        {/* Settings at bottom of list */}
        <div>
             <div className="space-y-0.5">
                <NavItem 
                    id="trash" 
                    icon={Trash2} 
                    label="Trash" 
                    active={currentView === 'trash'}
                    onClick={() => onChangeView('trash')}
                />
                <NavItem 
                    id="settings" 
                    icon={Settings} 
                    label="Settings" 
                    active={currentView === 'settings'}
                    onClick={() => onChangeView('settings')}
                />
             </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-[#F7F8F9]">
         <div className="mb-3 px-1">
             {/* Try Pro removed */}
         </div>
          <div className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700">
              {sidebarData.user?.profile_image ? (
                <img 
                  src={sidebarData.user.profile_image} 
                  alt={sidebarData.user.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  {sidebarData.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="flex-1 text-left font-medium truncate">
                {loading ? 'Loading...' : sidebarData.user?.name || 'User'}
              </span>
          </div>
      </div>
    </aside>
  );
};

export default Sidebar;


