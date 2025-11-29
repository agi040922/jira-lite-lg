'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TeamInvitation, SendInviteRequest, SendInviteResponse } from '@/types/team-invite';

export default function TeamInvitePage() {
  const [email, setEmail] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 컴포넌트 마운트 시 초대 목록 불러오기
  useEffect(() => {
    fetchInvitations();
  }, []);

  // 초대 목록 가져오기
  const fetchInvitations = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvitations(data as TeamInvitation[]);
    }
  };

  // 초대 이메일 발송
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const requestBody: SendInviteRequest = {
        email,
        invitedBy: invitedBy || '관리자',
      };

      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result: SendInviteResponse = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setEmail('');
        setInvitedBy('');
        // 초대 목록 새로고침
        await fetchInvitations();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '초대 발송 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 초대 삭제
  const handleDeleteInvite = async (id: string) => {
    if (!confirm('이 초대를 삭제하시겠습니까?')) return;

    const supabase = createClient();
    const { error } = await supabase.from('team_invitations').delete().eq('id', id);

    if (!error) {
      setMessage({ type: 'success', text: '초대가 삭제되었습니다.' });
      await fetchInvitations();
    } else {
      setMessage({ type: 'error', text: '초대 삭제에 실패했습니다.' });
    }
  };

  // 초대 재발송
  const handleResendInvite = async (invitation: TeamInvitation) => {
    setLoading(true);
    setMessage(null);

    try {
      const requestBody: SendInviteRequest = {
        email: invitation.email,
        invitedBy: invitation.invited_by || '관리자',
      };

      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result: SendInviteResponse = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: '초대가 재발송되었습니다.' });
        await fetchInvitations();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '초대 재발송 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 상태에 따른 배지 색상
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 상태 한글 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'accepted':
        return '수락됨';
      case 'expired':
        return '만료됨';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">팀 멤버 초대</h1>

          {/* 메시지 표시 */}
          {message && (
            <div
              className={`mb-4 p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 초대 폼 */}
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                초대할 이메일 *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="invitedBy" className="block text-sm font-medium text-gray-700 mb-1">
                초대자 이름 (선택)
              </label>
              <input
                type="text"
                id="invitedBy"
                value={invitedBy}
                onChange={(e) => setInvitedBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="홍길동"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '발송 중...' : '초대 발송'}
            </button>
          </form>
        </div>

        {/* 초대 목록 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">초대 목록</h2>

          {invitations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">아직 발송된 초대가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">이메일</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">초대자</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">상태</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">생성일</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">만료일</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-800">{invitation.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{invitation.invited_by || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
                            invitation.status
                          )}`}
                        >
                          {getStatusText(invitation.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(invitation.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(invitation.expires_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {invitation.status === 'pending' && (
                            <button
                              onClick={() => handleResendInvite(invitation)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:text-gray-400"
                            >
                              재발송
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvite(invitation.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
