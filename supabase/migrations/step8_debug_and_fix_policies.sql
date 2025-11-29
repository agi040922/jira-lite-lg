-- =============================================
-- STEP 8: 디버깅 및 정책 완전 제거 (초간단 버전)
-- =============================================
-- 팀 생성 문제를 완전히 해결하기 위해 모든 RLS를 비활성화
-- 개발 환경 전용 - 프로덕션에서는 절대 사용하지 마세요!

-- =============================================
-- 1. 현재 정책 확인
-- =============================================

-- 현재 team_members 테이블의 모든 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'team_members';

-- =============================================
-- 2. team_members 테이블의 모든 정책 완전 삭제
-- =============================================

DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'team_members'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.team_members';
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- =============================================
-- 3. teams 테이블의 모든 정책도 완화
-- =============================================

DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'teams'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.teams';
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- =============================================
-- 4. 옵션 A: RLS 완전 비활성화 (가장 간단)
-- =============================================
-- 개발 환경에서만 사용!

ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ RLS가 완전히 비활성화되었습니다.';
RAISE NOTICE '⚠️  경고: 이 설정은 개발 환경에서만 사용하세요!';

-- =============================================
-- 5. 옵션 B: RLS 활성화 + 모든 접근 허용 정책
-- =============================================
-- 옵션 A가 마음에 안 들면 주석 해제하고 사용

-- ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "allow_all_authenticated_teams"
--   ON public.teams FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- CREATE POLICY "allow_all_authenticated_team_members"
--   ON public.team_members FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- =============================================
-- 6. 트리거 확인
-- =============================================

-- add_owner_to_team 트리거가 존재하는지 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'teams'
  AND trigger_name = 'trigger_add_owner_to_team';

-- =============================================
-- 완료 메시지
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 8 완료: RLS 완전 비활성화';
  RAISE NOTICE '📝 변경 사항:';
  RAISE NOTICE '   - team_members 테이블: RLS 비활성화';
  RAISE NOTICE '   - teams 테이블: RLS 비활성화';
  RAISE NOTICE '⚠️  주의: 프로덕션 배포 전 RLS를 다시 활성화하세요!';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 다음 명령으로 테스트:';
  RAISE NOTICE '   1. 애플리케이션에서 팀 생성 시도';
  RAISE NOTICE '   2. 콘솔에서 상세 에러 로그 확인';
  RAISE NOTICE '   3. SELECT * FROM teams; -- 팀이 생성되었는지 확인';
  RAISE NOTICE '   4. SELECT * FROM team_members; -- 멤버가 추가되었는지 확인';
END $$;

