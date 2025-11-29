-- team_invitations 테이블의 RLS 완전히 해제
-- 개발 환경에서는 RLS 없이 자유롭게 테스트 가능

-- 기존 RLS 정책 모두 삭제
DROP POLICY IF EXISTS "team_invitations_select_policy" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_insert_policy" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_update_policy" ON public.team_invitations;
DROP POLICY IF EXISTS "team_invitations_delete_policy" ON public.team_invitations;

-- RLS 비활성화 (완전히 해제)
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;

-- 또는 RLS는 유지하되 모든 작업 허용하는 정책 (주석 해제 시 사용)
-- ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "team_invitations_allow_all" ON public.team_invitations
-- FOR ALL
-- TO public
-- USING (true)
-- WITH CHECK (true);

COMMENT ON TABLE public.team_invitations IS 'RLS 비활성화 - 개발 환경에서 자유롭게 접근 가능';
