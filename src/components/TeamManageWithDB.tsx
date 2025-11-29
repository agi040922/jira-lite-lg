'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Shield, Trash2, MoreVertical, Plus, Loader2, X, Copy, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTeam } from '@/components/providers/TeamContext';

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

const TeamManageWithDB: React.FC = () => {
  const supabase = createClient();
  const { currentTeam, isLoading: isTeamLoading } = useTeam();

  // 상태 관리
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (currentTeam) {
      loadTeamMembers();
    } else {
      setTeamMembers([]);
      setCurrentUserRole(null);
    }
  }, [currentTeam]);

  const loadTeamMembers = async () => {
    if (!currentTeam) return;
    
    try {
      setLoadingMembers(true);

      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('인증 오류:', authError);
        return;
      }

      // 현재 팀에서의 내 역할 조회
      const { data: myMembership, error: membershipError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', currentTeam.id)
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        console.error('팀 멤버십 조회 오류:', membershipError);
      } else {
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
            owner_id
          )
        `)
        .eq('team_id', currentTeam.id)
        .order('role', { ascending: true }) // OWNER, ADMIN, MEMBER 순으로 정렬
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('팀 멤버 조회 오류:', membersError);
        return;
      }

      if (members) {
        setTeamMembers(members as unknown as TeamMember[]);
      }
    } catch (error) {
      console.error('데이터 로드 중 오류:', error);
    } finally {
      setLoadingMembers(false);
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

  // 멤버 초대 (실제로는 이메일로 사용자를 찾아서 team_members에 추가)
  const handleInviteMember = async () => {
    if (!currentTeam || !inviteEmail.trim()) {
      showToast('이메일을 입력해주세요.');
      return;
    }

    // 권한 확인
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      showToast('멤버를 초대할 권한이 없습니다.');
      return;
    }

    try {
      setProcessingAction('invite');

      // 이메일로 사용자 찾기
      const { data: inviteUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail.trim())
        .single();

      if (userError || !inviteUser) {
        showToast('해당 이메일의 사용자를 찾을 수 없습니다. 먼저 회원가입이 필요합니다.');
        return;
      }

      // 이미 팀에 속해있는지 확인
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', currentTeam.id)
        .eq('user_id', inviteUser.id)
        .single();

      if (existingMember) {
        showToast('이미 팀에 속한 멤버입니다.');
        return;
      }

      // team_members 테이블에 추가
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          team_id: currentTeam.id,
          user_id: inviteUser.id,
          role: inviteRole
        });

      if (insertError) {
        console.error('멤버 추가 오류:', insertError);
        showToast('멤버 초대 중 오류가 발생했습니다.');
        return;
      }

      // 성공 후 데이터 새로고침 및 모달 닫기
      showToast('멤버가 성공적으로 초대되었습니다.');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      await loadTeamMembers();
    } catch (error) {
      console.error('멤버 초대 중 오류:', error);
      showToast('멤버 초대 중 오류가 발생했습니다.');
    } finally {
      setProcessingAction(null);
    }
  };

  // 초대 링크 생성 및 복사
  const handleGenerateInviteLink = async () => {
    if (!currentTeam || !inviteEmail.trim()) {
      showToast('이메일을 입력해주세요.');
      return;
    }

    // 권한 확인
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      showToast('멤버를 초대할 권한이 없습니다.');
      return;
    }

    try {
      setProcessingAction('generate-link');

      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      const invitedBy = user?.email || '관리자';

      // API 호출하여 초대 링크 생성
      const response = await fetch('/api/generate-invite-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          invitedBy,
          teamId: currentTeam.id,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        showToast(data.message);
        return;
      }

      // 클립보드에 복사
      if (data.inviteLink) {
        await navigator.clipboard.writeText(data.inviteLink);
        setCopiedLink(true);
        showToast('초대 링크가 클립보드에 복사되었습니다! 📋');

        // 2초 후 체크 아이콘 제거
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (error) {
      console.error('초대 링크 생성 중 오류:', error);
      showToast('초대 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setProcessingAction(null);
    }
  };

  // 토스트 메시지 표시
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 역할 배지 스타일 결정
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'ADMIN':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // 로딩 상태
  if (isTeamLoading || (loadingMembers && teamMembers.length === 0)) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-2" />
          <p className="text-slate-500">팀 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 팀이 없을 때 (신규 사용자)
  if (!currentTeam) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">팀이 없습니다</h2>
          <p className="text-slate-500 mb-6">
            먼저 팀을 생성하고 프로젝트를 시작하세요.<br />
            팀원들을 초대하여 함께 협업할 수 있습니다.
          </p>
          <button
            onClick={() => window.location.href = '/team/create'}
            className="bg-brand-500 text-white px-6 py-3 rounded-lg hover:bg-brand-600 transition-colors shadow-sm font-medium"
          >
            첫 팀 만들기
          </button>
          <p className="text-xs text-slate-400 mt-4">
            또는 다른 팀원의 초대를 기다려주세요
          </p>
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
        {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={16} />
            <span>멤버 초대하기</span>
          </button>
        )}
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
            </div>
          </div>
        </div>
      )}
      {/* Team Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">이름 / 이메일</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">역할</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">가입일</th>
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
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeStyle(member.role)}`}>
                    <Shield size={12} />
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600">
                    {new Date(member.joined_at).toLocaleDateString('ko-KR')}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">멤버 초대하기</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">역할</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleInviteMember}
                    disabled={processingAction === 'invite'}
                    className="flex-1 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingAction === 'invite' && <Loader2 size={16} className="animate-spin" />}
                    직접 초대하기
                  </button>
                  <button
                    onClick={handleGenerateInviteLink}
                    disabled={processingAction === 'generate-link'}
                    className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingAction === 'generate-link' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : copiedLink ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                    {copiedLink ? '복사됨!' : '링크 복사'}
                  </button>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="text-brand-600 font-semibold text-sm hover:underline"
        >
          멤버 초대하기
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5">
          <span className="text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default TeamManageWithDB;
