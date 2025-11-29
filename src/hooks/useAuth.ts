'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

/**
 * 인증 상태를 관리하는 커스텀 훅
 *
 * test/auth 페이지의 패턴을 참고하여 만든 모듈화된 인증 훅
 *
 * @param requireAuth - true일 경우 로그인하지 않으면 홈으로 리다이렉트
 * @returns { user, session, loading, signOut }
 *
 * @example
 * // 로그인 필수 페이지
 * const { user, loading } = useAuth(true);
 *
 * @example
 * // 로그인 선택 페이지
 * const { user, session, signOut } = useAuth(false);
 */
export function useAuth(requireAuth = false) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 초기 세션 가져오기 (test/auth 패턴)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // 인증 필수인데 로그인하지 않았으면 홈으로 리다이렉트
      if (requireAuth && !session) {
        router.push('/');
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변화 감지 (로그인, 로그아웃, 토큰 갱신 등)
    // test/auth 페이지와 동일한 패턴
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // 로그아웃 시 홈으로 리다이렉트
      if (requireAuth && !session) {
        router.push('/');
      }
    });

    // 컴포넌트 언마운트 시 구독 해제 (메모리 누수 방지)
    return () => subscription.unsubscribe();
  }, [requireAuth, router, supabase.auth]);

  /**
   * 로그아웃 처리
   * test/auth 페이지의 handleSignOut 패턴과 동일
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('로그아웃 실패:', error);
      return { error };
    }
    router.push('/');
    return { error: null };
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}

/**
 * 현재 로그인한 사용자 ID만 빠르게 가져오는 훅
 * Dashboard, Inbox 등에서 userId만 필요할 때 사용
 *
 * @param requireAuth - true일 경우 로그인하지 않으면 홈으로 리다이렉트
 * @returns { userId, loading }
 *
 * @example
 * const { userId, loading } = useUserId(true);
 * if (loading) return <div>Loading...</div>;
 * return <Dashboard userId={userId!} />;
 */
export function useUserId(requireAuth = true) {
  const { user, loading } = useAuth(requireAuth);
  return {
    userId: user?.id ?? null,
    loading,
  };
}

/**
 * 세션 수동 갱신
 * test/auth 페이지의 handleRefreshSession과 동일한 로직
 *
 * @example
 * const { refreshSession } = useAuthActions();
 * await refreshSession();
 */
export function useAuthActions() {
  const supabase = createClient();

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('세션 갱신 실패:', error);
      return { error };
    }
    return { data, error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('로그아웃 실패:', error);
      return { error };
    }
    return { error: null };
  };

  return {
    refreshSession,
    signOut,
  };
}
