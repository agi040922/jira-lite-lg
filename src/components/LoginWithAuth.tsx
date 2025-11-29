'use client';

import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LoginWithAuthProps {
    onLoginSuccess: () => void;
}

/**
 * Supabase Auth와 연결된 로그인 컴포넌트
 *
 * 기능:
 * 1. Google OAuth 로그인
 * 2. 이메일/비밀번호 로그인
 * 3. 회원가입
 * 4. 자동으로 users 테이블에 프로필 생성 (트리거)
 */
const LoginWithAuth: React.FC<LoginWithAuthProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const supabase = createClient();

    /**
     * Google OAuth 로그인
     */
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Google 로그인에 실패했습니다.');
            setIsLoading(false);
        }
    };

    /**
     * 이메일/비밀번호 로그인
     */
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (isSignUp) {
                // 회원가입
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        data: {
                            name: email.split('@')[0], // 이메일 앞부분을 이름으로 사용
                        }
                    },
                });

                if (error) throw error;

                if (data.user && !data.session) {
                    setError('회원가입 성공! 이메일을 확인해주세요.');
                } else {
                    onLoginSuccess();
                }
            } else {
                // 로그인
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                onLoginSuccess();
            }
        } catch (err: any) {
            setError(err.message || (isSignUp ? '회원가입' : '로그인') + '에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-in fade-in zoom-in duration-300">
                {/* Logo Area */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-brand-500 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-brand-200">
                        L
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isSignUp ? 'Create Account' : 'Welcome back'}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {isSignUp ? 'Sign up for your Lightsoft account' : 'Sign in to your Lightsoft account'}
                    </p>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Social Login */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                    Continue with Google
                </button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400">Or continue with email</span>
                    </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50"
                            placeholder="name@company.com"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            {!isSignUp && (
                                <a href="/test/auth" className="text-xs text-brand-600 hover:underline">
                                    Forgot password?
                                </a>
                            )}
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        {isSignUp && (
                            <p className="text-xs text-slate-500 mt-1">최소 6자 이상 입력해주세요</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? '처리 중...' : (isSignUp ? 'Sign up' : 'Sign in')}
                        <ArrowRight size={16} />
                    </button>
                </form>

                {/* Footer */}
                <div className="text-center text-sm text-slate-500">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                        }}
                        className="text-brand-600 font-medium hover:underline"
                    >
                        {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-400">
                &copy; 2024 Lightsoft Inc. All rights reserved.
            </div>
        </div>
    );
};

export default LoginWithAuth;
