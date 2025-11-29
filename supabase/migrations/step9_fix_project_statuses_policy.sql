-- =============================================
-- STEP 9: RLS 완전 비활성화 (개발 환경)
-- =============================================
-- 정책이 복잡도만 높이고 디버깅을 어렵게 만들므로
-- 개발 환경에서는 RLS를 완전히 비활성화합니다.
-- ⚠️ 프로덕션 환경에서는 RLS를 활성화하고 적절한 정책을 설정해야 합니다.

-- 1. 모든 테이블의 기존 정책 삭제
-- teams
DROP POLICY IF EXISTS "Team members can view teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Owners and admins can update teams" ON public.teams;

-- team_members
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can add team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Authenticated users can remove team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can add themselves as team owner or admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and admins can remove team members" ON public.team_members;

-- projects
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Owners, admins, and project owners can update projects" ON public.projects;

-- project_statuses
DROP POLICY IF EXISTS "Team members can view project statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Team members can manage custom statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Team members can create project statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Team members can update custom statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Team members can delete custom statuses" ON public.project_statuses;

-- labels
DROP POLICY IF EXISTS "Team members can view and manage labels" ON public.labels;

-- issues
DROP POLICY IF EXISTS "Team members can view issues" ON public.issues;
DROP POLICY IF EXISTS "Team members can create issues" ON public.issues;
DROP POLICY IF EXISTS "Team members can update issues" ON public.issues;

-- 2. 모든 테이블의 RLS 비활성화
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rate_limits DISABLE ROW LEVEL SECURITY;

-- 3. 확인
SELECT 
  tablename, 
  CASE 
    WHEN relrowsecurity THEN '❌ RLS 활성화됨' 
    ELSE '✅ RLS 비활성화됨' 
  END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'teams', 'team_members', 'team_invitations', 'team_activity_logs',
    'projects', 'project_favorites', 'project_statuses', 'labels',
    'issues', 'issue_labels', 'subtasks', 'comments', 'issue_history',
    'notifications', 'ai_cache', 'ai_rate_limits'
  )
ORDER BY tablename;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ STEP 9 완료: 모든 테이블의 RLS 비활성화 성공';
  RAISE NOTICE '⚠️  주의: 개발 환경 전용입니다. 프로덕션에서는 RLS를 활성화하세요!';
END $$;

