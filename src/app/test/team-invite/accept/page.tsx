'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { TeamInvitation } from '@/types/team-invite';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 토큰으로 초대 정보 조회
  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 초대 링크입니다.');
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    if (!token) return;

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .single();

    setLoading(false);

    if (fetchError || !data) {
      setError('초대를 찾을 수 없습니다.');
      return;
    }

    const inviteData = data as TeamInvitation;

    // 만료 확인
    const expiresAt = new Date(inviteData.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      setError('이 초대는 만료되었습니다.');
      // 만료 상태로 업데이트
      await supabase
        .from('team_invitations')
        .update({ status: 'expired' })
        .eq('token', token);
      return;
    }

    // 이미 수락된 초대인지 확인
    if (inviteData.status === 'accepted') {
      setError('이미 수락된 초대입니다.');
      return;
    }

    if (inviteData.status === 'expired') {
      setError('이 초대는 만료되었습니다.');
      return;
    }

    setInvitation(inviteData);
  };

  // 초대 수락 처리
  const handleAcceptInvite = async () => {
    if (!token || !invitation) return;

    setAccepting(true);
    setError(null);

    try {
      const supabase = createClient();

      // 초대 상태를 'accepted'로 업데이트
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('token', token);

      if (updateError) {
        throw new Error('초대 수락에 실패했습니다.');
      }

      // 여기서 실제로는 사용자를 팀에 추가하는 로직이 필요합니다
      // 예: users 테이블에 추가, team_members 테이블에 추가 등

      setSuccess(true);

      // 3초 후 홈으로 리다이렉트
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setAccepting(false);
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">초대 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 성공 상태
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">초대가 수락되었습니다!</h1>
          <p className="text-gray-600 mb-4">팀에 오신 것을 환영합니다.</p>
          <p className="text-sm text-gray-500">잠시 후 홈페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">초대를 수락할 수 없습니다</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 초대 정보 표시 및 수락 버튼
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">팀 초대</h1>
          <p className="text-gray-600">
            {invitation?.invited_by || '관리자'}님이 팀에 초대했습니다.
          </p>
        </div>

        <div className="bg-gray-50 rounded-md p-4 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">이메일:</span>
              <span className="font-medium text-gray-800">{invitation?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">만료일:</span>
              <span className="font-medium text-gray-800">
                {invitation?.expires_at
                  ? new Date(invitation.expires_at).toLocaleDateString('ko-KR')
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleAcceptInvite}
          disabled={accepting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {accepting ? '처리 중...' : '초대 수락하기'}
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-3 bg-white text-gray-700 py-3 px-4 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
