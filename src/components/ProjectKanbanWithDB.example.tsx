// 사용 예시 (예: app/projects/[id]/board/page.tsx 에서)

'use client';

import { useState } from 'react';
import ProjectKanbanWithDB from '@/components/ProjectKanbanWithDB';
import IssueDetail from '@/components/IssueDetail'; // 이슈 상세 모달 컴포넌트

export default function ProjectBoardPage({ params }: { params: { id: string } }) {
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  return (
    <div className="h-screen">
      <ProjectKanbanWithDB 
        projectId={params.id}
        onOpenIssue={(issue) => setSelectedIssue(issue)}
      />

      {/* 이슈 상세 모달 */}
      {selectedIssue && (
        <IssueDetail 
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
