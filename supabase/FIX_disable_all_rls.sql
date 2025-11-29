-- 모든 테이블의 RLS를 완전히 해제
-- 개발 환경에서 테스트용 - 프로덕션에서는 사용하지 마세요!

-- ============================================
-- 1. 사용자 및 팀 관련 테이블
-- ============================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 프로젝트 관련 테이블
-- ============================================
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_statuses DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. 이슈 관련 테이블
-- ============================================
ALTER TABLE public.issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_labels DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. AI 및 알림 테이블
-- ============================================
ALTER TABLE public.ai_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rate_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '모든 테이블의 RLS가 비활성화되었습니다.';
  RAISE NOTICE '개발 환경에서만 사용하세요!';
END $$;
