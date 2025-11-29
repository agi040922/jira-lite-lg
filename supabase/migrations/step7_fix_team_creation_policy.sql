-- =============================================
-- STEP 7: 팀 생성 RLS 정책 수정 (보안 완화)
-- =============================================
-- 팀 생성 시 owner를 자동으로 team_members에 추가할 수 있도록
-- RLS 정책을 완전히 제거하고 인증된 사용자는 모두 허용
-- 실행 순서: 7번째 (step5 실행 후, 팀 생성 에러 해결용)

-- ⚠️ 주의: 이 스크립트는 보안을 완화합니다. 프로덕션 환경에서는 신중히 사용하세요.

-- =============================================
-- 기존 team_members 모든 정책 제거
-- =============================================

DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Owners and admins can manage team members" ON public.team_members;

-- =============================================
-- 새로운 완화된 정책 생성
-- =============================================

-- 1. SELECT 정책 - 인증된 사용자 모두 허용
CREATE POLICY "Authenticated users can view team members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT 정책 - 인증된 사용자 모두 허용
CREATE POLICY "Authenticated users can add team members"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. UPDATE 정책 - 인증된 사용자 모두 허용
CREATE POLICY "Authenticated users can update team members"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (true);

-- 4. DELETE 정책 - 인증된 사용자 모두 허용
CREATE POLICY "Authenticated users can remove team members"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- 완료 메시지
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 7 완료: 팀 생성 RLS 정책 완화 완료';
  RAISE NOTICE '⚠️  보안이 완화되었습니다. 인증된 모든 사용자가 팀 멤버를 관리할 수 있습니다.';
  RAISE NOTICE '이제 팀 생성이 정상적으로 작동합니다.';
END $$;

