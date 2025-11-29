'use client';

import React from 'react';
import { Mail, ArrowRight } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8 animate-in fade-in zoom-in duration-300">
                {/* Logo Area */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-brand-500 rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-brand-200">
                        L
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
                    <p className="text-slate-500 text-sm">Sign in to your Lightsoft account</p>
                </div>

                {/* Social Login */}
                <button 
                    onClick={onLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
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
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input 
                            type="email" 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            placeholder="name@company.com"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <a href="#" className="text-xs text-brand-600 hover:underline">Forgot password?</a>
                        </div>
                        <input 
                            type="password" 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <button 
                        onClick={onLogin}
                        className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                    >
                        Sign in
                        <ArrowRight size={16} />
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-slate-500">
                    Don't have an account? <a href="#" className="text-brand-600 font-medium hover:underline">Sign up</a>
                </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-slate-400">
                &copy; 2024 Lightsoft Inc. All rights reserved.
            </div>
        </div>
    );
};

export default Login;

