'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Team, TeamMember } from '@/types/database.types';

interface TeamWithMembers extends Team {
  members?: TeamMember[];
}

interface TeamContextType {
  currentTeam: TeamWithMembers | null;
  teams: TeamWithMembers[];
  isLoading: boolean;
  createTeam: (name: string, description?: string) => Promise<Team | null>;
  switchTeam: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTeam, setCurrentTeam] = useState<TeamWithMembers | null>(null);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setTeams([]);
        setCurrentTeam(null);
        return;
      }

      // Fetch teams the user belongs to
      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          team:teams(*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }

      const fetchedTeams = (teamMembers?.map(tm => tm.team).filter(Boolean) as unknown as TeamWithMembers[]) || [];
      setTeams(fetchedTeams);

      // Determine current team
      // 1. Try to get from localStorage
      const savedTeamId = localStorage.getItem('jira-lite-current-team-id');
      const savedTeam = fetchedTeams.find(t => t.id === savedTeamId);

      if (savedTeam) {
        setCurrentTeam(savedTeam);
      } else if (fetchedTeams.length > 0) {
        // 2. Default to the first team
        setCurrentTeam(fetchedTeams[0]);
        localStorage.setItem('jira-lite-current-team-id', fetchedTeams[0].id);
      } else {
        setCurrentTeam(null);
      }

    } catch (error) {
      console.error('Error in fetchTeams:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Redirect if no team (and not on create page or auth pages)
  useEffect(() => {
    if (!isLoading && teams.length === 0 && !pathname?.startsWith('/team/create') && !pathname?.startsWith('/auth') && !pathname?.startsWith('/login')) {
      // Check if user is logged in before redirecting
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          router.push('/team/create');
        }
      });
    }
  }, [isLoading, teams, pathname, router, supabase]);

  const createTeam = async (name: string, description?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('Creating team for user:', user.id, 'Team name:', name);

      // 1. Create Team (트리거가 자동으로 owner를 team_members에 추가함)
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name,
          owner_id: user.id
        })
        .select()
        .single();

      if (teamError) {
        console.error('❌ Team creation error details:', {
          message: teamError.message,
          details: teamError.details,
          hint: teamError.hint,
          code: teamError.code,
          fullError: JSON.stringify(teamError, null, 2)
        });
        throw teamError;
      }

      console.log('✅ Team created successfully:', newTeam);

      // 2. 잠시 대기 (트리거 실행 시간 확보)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Refresh teams
      await fetchTeams();
      
      // 4. Switch to new team
      switchTeam(newTeam.id);
      
      return newTeam;
    } catch (error: any) {
      console.error('❌ Error creating team (detailed):', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack,
        fullError: JSON.stringify(error, null, 2)
      });
      return null;
    }
  };

  const switchTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      localStorage.setItem('jira-lite-current-team-id', team.id);
      // Optional: Reload page or trigger data refresh if needed
      // window.location.reload(); // Might be too aggressive
    }
  };

  return (
    <TeamContext.Provider value={{ currentTeam, teams, isLoading, createTeam, switchTeam, refreshTeams: fetchTeams }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
