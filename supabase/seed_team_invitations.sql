-- 팀 초대 테스트 데이터 생성
-- 이 스크립트는 개발/테스트용입니다

-- 기존 데이터 삭제 (선택사항)
-- TRUNCATE team_invitations CASCADE;

-- 샘플 초대 데이터 삽입
INSERT INTO team_invitations (email, status, invited_by, expires_at)
VALUES
  -- 대기중인 초대
  (
    'test1@example.com',
    'pending',
    '정경훈',
    NOW() + INTERVAL '7 days'
  ),
  (
    'test2@example.com',
    'pending',
    '관리자',
    NOW() + INTERVAL '5 days'
  ),
  -- 수락된 초대
  (
    'accepted@example.com',
    'accepted',
    '정경훈',
    NOW() + INTERVAL '7 days'
  ),
  -- 만료된 초대
  (
    'expired@example.com',
    'expired',
    '관리자',
    NOW() - INTERVAL '1 day'
  );

-- 삽입된 데이터 확인
SELECT
  id,
  email,
  status,
  invited_by,
  expires_at,
  created_at
FROM team_invitations
ORDER BY created_at DESC;
