'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const Login = dynamic(() => import('@/components/Login'), { ssr: false });

export default function Home() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/dashboard');
  };

  return <Login onLogin={handleLogin} />;
}
