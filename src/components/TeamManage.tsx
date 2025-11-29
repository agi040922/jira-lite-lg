'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Shield, Trash2, MoreVertical, Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// 타입 정의
interface User {
  id: string;
  name: string;
  email: string;
  profile_image: string | null;
}

interface Team {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
  user: User;
  team: Team;
}

interface TeamManageProps {
  teamId?: string; // 선택적: 특정 팀 ID 지정 가능
}

const TeamManage: React.FC<TeamManageProps> = ({ teamId }) => {
  const supabase = createClient();

  // 상태 관리
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('인증 오류:', authError);
        return;
      }

      let targetTeamId = teamId;

      // teamId가 없으면 사용자가 속한 첫 번째 팀 사용
      if (!targetTeamId) {
        const { data: myMembership, error: membershipError } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (membershipError || !myMembership) {
          console.error('팀 멤버십 조회 오류:', membershipError);
          return;
        }

        targetTeamId = myMembership.team_id;
        setCurrentUserRole(myMembership.role);
      } else {
        // teamId가 있으면 해당 팀에서의 역할 확인
        const { data: myMembership } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', targetTeamId)
          .eq('user_id', user.id)
          .single();

        setCurrentUserRole(myMembership?.role || null);
      }

      // 해당 팀의 모든 멤버 조회 (user와 team 정보 조인)
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          role,
          joined_at,
          user:users!team_members_user_id_fkey (
            id,
            name,
            email,
            profile_image
          ),
          team:teams!team_members_team_id_fkey (
            id,
            name,
            description,
            owner_id
          )
        `)
        .eq('team_id', targetTeamId)
        .order('role', { ascending: true }) // OWNER, ADMIN, MEMBER 순
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('팀 멤버 조회 오류:', membersError);
        return;
      }

      if (members && members.length > 0) {
        setTeamMembers(members as TeamMember[]);
        setCurrentTeam((members[0] as TeamMember).team);
      }
    } catch (error) {
      console.error('데이터 로드 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 멤버 삭제
  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (!currentTeam) return;

    // OWNER는 삭제할 수 없음
    if (memberRole === 'OWNER') {
      alert('팀 소유자는 삭제할 수 없습니다.');
      return;
    }

    // 권한 확인: OWNER 또는 ADMIN만 삭제 가능
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      alert('멤버를 삭제할 권한이 없습니다.');
      return;
    }

    if (!confirm('정말 이 멤버를 팀에서 제거하시겠습니까?')) {
      return;
    }

    try {
      setProcessingAction(memberId);

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('멤버 삭제 오류:', error);
        alert('멤버 삭제 중 오류가 발생했습니다.');
        return;
      }

      // 상태 업데이트
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      alert('멤버가 성공적으로 제거되었습니다.');
    } catch (error) {
      console.error('멤버 삭제 중 오류:', error);
      alert('멤버 삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingAction(null);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-2" />
          <p className="text-slate-500">팀 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">팀 멤버 관리</h2>
                    <p className="text-slate-500 mt-1">프로젝트에 참여하는 멤버들의 권한을 관리하세요.</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium">
                    <Plus size={16} />
                    <span>멤버 초대하기</span>
                </button>
            </div>

            {/* Team Profile Section */}
            {currentTeam && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Profile</h3>
                    <div className="flex items-start gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-20 h-20 bg-brand-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold relative group cursor-pointer overflow-hidden">
                                {currentTeam.name.charAt(0).toUpperCase()}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-medium">Upload</span>
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                            <span className="text-xs text-slate-500">Recommended 200x200</span>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Team Name</label>
                                <input
                                    type="text"
                                    value={currentTeam.name}
                                    readOnly
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={currentTeam.description || ''}
                                    readOnly
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 min-h-[80px] bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">이름 / 이메일</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">역할</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {teamMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {member.user.profile_image ? (
                                            <img
                                                src={member.user.profile_image}
                                                alt={member.user.name}
                                                className="w-10 h-10 rounded-full border border-slate-200"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full border border-slate-200 bg-brand-100 flex items-center justify-center text-brand-600 font-semibold">
                                                {member.user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium text-slate-900">{member.user.name}</div>
                                            <div className="text-sm text-slate-500">{member.user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        member.role === 'OWNER'
                                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                                        : member.role === 'ADMIN'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                        <Shield size={12} />
                                        {member.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && member.role !== 'OWNER' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id, member.role)}
                                            disabled={processingAction === member.id}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        >
                                            {processingAction === member.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    )}
                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors ml-1">
                                        <MoreVertical size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite Box Visual */}
            <div className="mt-8 bg-brand-50 rounded-xl p-6 border border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-900">동료와 함께 일하세요!</h4>
                        <p className="text-sm text-brand-700">팀원들을 초대하고 Jira Lite의 모든 기능을 함께 활용해보세요.</p>
                    </div>
                </div>
                <button className="text-brand-600 font-semibold text-sm hover:underline">
                    초대 링크 복사하기
                </button>
            </div>
        </div>
    );
};

export default TeamManage;

