'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const Login = dynamic(() => import('@/components/Login'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { session, loading } = useAuth(false); // 로그인 필수 아님

  // 이미 로그인한 사용자는 대시보드로 자동 리다이렉트
  useEffect(() => {
    if (!loading && session) {
      router.push('/dashboard');
    }
  }, [loading, session, router]);

  // 로딩 중이거나 이미 로그인한 경우 빈 화면 표시
  if (loading || session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  const handleLogin = () => {
    router.push('/dashboard');
  };

  return <Login onLogin={handleLogin} />;
}
