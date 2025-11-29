-- =============================================
-- 🚨 긴급 수정: 모든 RLS 정책 제거 및 비활성화
-- =============================================
-- Supabase Dashboard → SQL Editor에서 실행하세요!
-- ⚠️ 개발 환경 전용 - 프로덕션에서는 RLS를 활성화하세요!

-- =============================================
-- 1. 모든 정책 일괄 삭제
-- =============================================

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

-- team_invitations
DROP POLICY IF EXISTS "Users can view invitations to their email" ON public.team_invitations;
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON public.team_invitations;

-- team_activity_logs
DROP POLICY IF EXISTS "Team members can view activity logs" ON public.team_activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.team_activity_logs;

-- projects
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Owners, admins, and project owners can update projects" ON public.projects;

-- project_favorites
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.project_favorites;

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

-- issue_labels
DROP POLICY IF EXISTS "Team members can manage issue labels" ON public.issue_labels;

-- subtasks
DROP POLICY IF EXISTS "Team members can view subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Team members can manage subtasks" ON public.subtasks;

-- comments
DROP POLICY IF EXISTS "Team members can view comments" ON public.comments;
DROP POLICY IF EXISTS "Team members can create comments" ON public.comments;
DROP POLICY IF EXISTS "Comment owners can update their comments" ON public.comments;
DROP POLICY IF EXISTS "Comment owners can delete their comments" ON public.comments;

-- issue_history
DROP POLICY IF EXISTS "Team members can view issue history" ON public.issue_history;

-- notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- ai_cache
DROP POLICY IF EXISTS "Team members can view ai cache" ON public.ai_cache;
DROP POLICY IF EXISTS "Team members can create ai cache" ON public.ai_cache;

-- =============================================
-- 2. 모든 테이블의 RLS 완전 비활성화
-- =============================================

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
ALTER TABLE public.password_reset_tokens DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. 확인: RLS 상태 체크
-- =============================================

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
    'notifications', 'ai_cache', 'ai_rate_limits', 'password_reset_tokens'
  )
ORDER BY tablename;

-- =============================================
-- 4. 남아있는 정책 확인
-- =============================================

SELECT 
  schemaname,
  tablename, 
  policyname,
  COUNT(*) OVER (PARTITION BY tablename) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- 5. 완료 메시지
-- =============================================

SELECT '✅ 모든 RLS 정책 제거 및 비활성화 완료!' as result;

