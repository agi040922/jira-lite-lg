'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, XCircle, UserPlus } from 'lucide-react';

function TeamJoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('초대를 확인하는 중...');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('유효하지 않은 초대 링크입니다.');
      return;
    }

    handleInviteAccept(token);
  }, [searchParams]);

  const handleInviteAccept = async (token: string) => {
    try {
      // 현재 로그인한 사용자 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setStatus('error');
        setMessage('로그인이 필요합니다. 먼저 로그인해주세요.');
        setTimeout(() => {
          router.push('/login?redirect=/team/join?token=' + token);
        }, 2000);
        return;
      }

      // 초대 정보 조회
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select(`
          *,
          team:teams (
            id,
            name
          )
        `)
        .eq('token', token)
        .single();

      if (inviteError || !invitation) {
        setStatus('error');
        setMessage('초대 정보를 찾을 수 없습니다.');
        return;
      }

      // 이메일 확인
      if (invitation.email !== user.email) {
        setStatus('error');
        setMessage('이 초대는 다른 이메일 주소로 발송되었습니다.');
        return;
      }

      // 만료 확인
      if (new Date(invitation.expires_at) < new Date()) {
        setStatus('expired');
        setMessage('이 초대는 만료되었습니다.');

        // 만료된 초대 상태 업데이트
        await supabase
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        return;
      }

      // 이미 수락된 초대인지 확인
      if (invitation.status === 'accepted') {
        setStatus('error');
        setMessage('이미 수락된 초대입니다.');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      }

      // 이미 팀 멤버인지 확인
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', invitation.team_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        setStatus('error');
        setMessage('이미 이 팀의 멤버입니다.');

        // 초대 상태를 수락으로 변경
        await supabase
          .from('team_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitation.id);

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      }

      // 팀 멤버로 추가
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role || 'MEMBER',
        });

      if (insertError) {
        console.error('팀 멤버 추가 오류:', insertError);
        setStatus('error');
        setMessage('팀 가입 중 오류가 발생했습니다.');
        return;
      }

      // 초대 상태를 수락으로 변경
      await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      setTeamName((invitation.team as any)?.name || '팀');
      setStatus('success');
      setMessage(`${(invitation.team as any)?.name || '팀'}에 성공적으로 가입되었습니다!`);

      // 2초 후 대시보드로 이동
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('초대 수락 중 오류:', error);
      setStatus('error');
      setMessage('예상치 못한 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-brand-500 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">초대 확인 중</h2>
              <p className="text-slate-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">환영합니다!</h2>
              <p className="text-slate-600 mb-4">{message}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>대시보드로 이동 중...</span>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">오류 발생</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600 transition-colors"
              >
                대시보드로 이동
              </button>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">초대 만료</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <p className="text-sm text-slate-500 mb-6">
                팀 관리자에게 새로운 초대를 요청해주세요.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600 transition-colors"
              >
                대시보드로 이동
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamJoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-50 flex items-center justify-center p-4">
        <Loader2 className="w-16 h-16 text-brand-500 animate-spin" />
      </div>
    }>
      <TeamJoinContent />
    </Suspense>
  );
}
