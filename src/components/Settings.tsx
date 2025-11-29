'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  User,
  Bell,
  Shield,
  Link as LinkIcon,
  Tag,
  FileText,
  Flame,
  Layout,
  CheckCircle2,
  Globe,
  Monitor,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const Settings: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('preferences');
  const { user, loading, signOut } = useAuth(true); // 인증 필수 페이지

  // 로그아웃 핸들러
  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      router.push('/');
    }
  };

  // 로딩 중일 때 표시
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const SidebarItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${activeTab === id 
          ? 'bg-slate-100 text-slate-900' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
    >
      <Icon size={16} className={activeTab === id ? 'text-slate-900' : 'text-slate-500'} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-white">
      {/* Settings Sidebar */}
      <aside className="w-[240px] bg-[#F7F8F9] border-r border-slate-200 flex flex-col h-full">
        <div className="p-4 flex-1 flex flex-col">
            <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
            >
                <ChevronLeft size={16} />
                Back to app
            </button>

            <div className="space-y-6 flex-1">
                <div className="space-y-0.5">
                    <SidebarItem id="preferences" icon={Layout} label="Preferences" />
                    <SidebarItem id="profile" icon={User} label="Profile" />
                    <SidebarItem id="notifications" icon={Bell} label="Notifications" />
                    <SidebarItem id="security" icon={Shield} label="Security & access" />
                    <SidebarItem id="connected" icon={LinkIcon} label="Connected accounts" />
                </div>

                <div>
                    <div className="px-3 mb-2 text-xs font-semibold text-slate-500">Issues</div>
                    <div className="space-y-0.5">
                        <SidebarItem id="labels" icon={Tag} label="Labels" />
                        <SidebarItem id="templates" icon={FileText} label="Templates" />
                        <SidebarItem id="slas" icon={Flame} label="SLAs" />
                    </div>
                </div>

                <div>
                    <div className="px-3 mb-2 text-xs font-semibold text-slate-500">Projects</div>
                    <div className="space-y-0.5">
                        <SidebarItem id="project_labels" icon={Tag} label="Labels" />
                        <SidebarItem id="project_templates" icon={FileText} label="Templates" />
                        <SidebarItem id="statuses" icon={CheckCircle2} label="Statuses" />
                        <SidebarItem id="updates" icon={Globe} label="Updates" />
                    </div>
                </div>
            </div>

            {/* 로그아웃 버튼 - 사이드바 하단에 고정 */}
            <div className="pt-4 border-t border-slate-200">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={16} />
                    <span className="flex-1 text-left">Log out</span>
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto py-12 px-8">
            <h1 className="text-2xl font-semibold text-slate-900 mb-8">Preferences</h1>

            {/* General Section */}
            <section className="mb-10">
                <h2 className="text-sm font-medium text-slate-500 mb-4">General</h2>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">Default home view</div>
                            <div className="text-sm text-slate-500">Which view is opened when you open up Linear</div>
                        </div>
                        <select className="text-sm border-slate-200 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500">
                            <option>Active issues</option>
                            <option>My issues</option>
                            <option>Inbox</option>
                        </select>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">Display full names</div>
                            <div className="text-sm text-slate-500">Show full names of users instead of shorter usernames</div>
                        </div>
                        <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 bg-brand-500">
                            <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">First day of the week</div>
                            <div className="text-sm text-slate-500">Used for date pickers</div>
                        </div>
                        <select className="text-sm border-slate-200 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500">
                            <option>Sunday</option>
                            <option>Monday</option>
                        </select>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">Convert text emoticons into emojis</div>
                            <div className="text-sm text-slate-500">Strings like :) will be converted to 🙂</div>
                        </div>
                        <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 bg-brand-500">
                            <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interface and theme Section */}
            <section>
                <h2 className="text-sm font-medium text-slate-500 mb-4">Interface and theme</h2>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">App sidebar</div>
                            <div className="text-sm text-slate-500">Customize sidebar item visibility, ordering, and badge style</div>
                        </div>
                        <button className="text-sm font-medium text-slate-900 hover:text-brand-600">Customize</button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">Font size</div>
                            <div className="text-sm text-slate-500">Adjust the size of text across the app</div>
                        </div>
                        <select className="text-sm border-slate-200 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500">
                            <option>Default</option>
                            <option>Large</option>
                        </select>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">Use pointer cursors</div>
                            <div className="text-sm text-slate-500">Change the cursor to a pointer when hovering over any interactive elements</div>
                        </div>
                        <div className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 bg-slate-200">
                            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">Interface theme</div>
                            <div className="text-sm text-slate-500">Select or customize your interface color scheme</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">
                                <span className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></span>
                                System preference
                                <ChevronLeft size={14} className="-rotate-90" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
      </main>
    </div>
  );
};

export default Settings;
