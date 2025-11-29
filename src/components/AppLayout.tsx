'use client';

import React, { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import IssueModal from './IssueModal';
import CreateIssueModal from './CreateIssueModal';
import { Issue } from '@/types';
import { useRouter } from 'next/navigation';

interface AppLayoutProps {
  children: ReactNode;
  currentView: string;
  title: string;
}

export default function AppLayout({ children, currentView, title }: AppLayoutProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const handleChangeView = (view: string) => {
    switch (view) {
      case 'my_issues':
        router.push('/dashboard');
        break;
      case 'inbox':
        router.push('/inbox');
        break;
      case 'projects':
        router.push('/projects');
        break;
      case 'team_issues':
        router.push('/issues');
        break;
      case 'team_manage':
        router.push('/team/manage');
        break;
      case 'stats':
        router.push('/insights');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'reviews':
        router.push('/reviews');
        break;
      case 'views':
        router.push('/views');
        break;
      case 'trash':
        router.push('/trash');
        break;
      default:
        break;
    }
  };

  // 이슈 모달 열기 함수를 children에 전달하기 위한 context
  const handleOpenIssue = (issue: Issue) => {
    router.push(`/issues/${issue.id}`);
  };

  return (
    <div className="flex bg-white min-h-screen font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        onChangeView={handleChangeView} 
        onCompose={() => setShowCreateModal(true)}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 ml-0 md:ml-[260px] flex flex-col h-screen">
        {/* Mobile Header */}
        <Header title={title} />
        
        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-hidden">
          {typeof children === 'object' && children && 'type' in children
            ? React.cloneElement(children as React.ReactElement, { onOpenIssue: handleOpenIssue } as any)
            : children}
        </main>
      </div>

      {/* Global Modals */}
      {showCreateModal && (
        <CreateIssueModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
