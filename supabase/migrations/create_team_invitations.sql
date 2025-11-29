-- 팀 초대 테이블 생성
-- 이 테이블은 팀 멤버 초대 정보를 저장합니다

CREATE TABLE IF NOT EXISTS team_invitations (
  -- 기본 키 (UUID 자동 생성)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 초대받는 사람의 이메일 주소
  email TEXT NOT NULL,

  -- 초대 토큰 (UUID, 초대 링크에 사용)
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- 초대 상태 (pending: 대기중, accepted: 수락됨, expired: 만료됨)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),

  -- 초대를 보낸 사람의 이름 또는 이메일
  invited_by TEXT,

  -- 초대 만료 시간
  expires_at TIMESTAMPTZ NOT NULL,

  -- 생성 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 수정 시간
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 이메일과 상태로 검색하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_team_invitations_email_status
ON team_invitations(email, status);

-- 토큰으로 빠른 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_team_invitations_token
ON team_invitations(token);

-- 상태별로 검색하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_team_invitations_status
ON team_invitations(status);

-- 만료 시간으로 정렬/검색하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at
ON team_invitations(expires_at);

-- updated_at 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
CREATE TRIGGER update_team_invitations_updated_at
BEFORE UPDATE ON team_invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) 활성화
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 허용 (테스트용)
-- 실제 프로덕션에서는 인증된 사용자만 접근하도록 수정 필요
CREATE POLICY "Allow read access to all users"
ON team_invitations
FOR SELECT
USING (true);

-- 모든 사용자가 삽입할 수 있도록 허용 (테스트용)
-- 실제 프로덕션에서는 인증된 관리자만 초대를 생성하도록 수정 필요
CREATE POLICY "Allow insert access to all users"
ON team_invitations
FOR INSERT
WITH CHECK (true);

-- 모든 사용자가 업데이트할 수 있도록 허용 (테스트용)
-- 실제 프로덕션에서는 적절한 권한 제어 필요
CREATE POLICY "Allow update access to all users"
ON team_invitations
FOR UPDATE
USING (true);

-- 모든 사용자가 삭제할 수 있도록 허용 (테스트용)
-- 실제 프로덕션에서는 적절한 권한 제어 필요
CREATE POLICY "Allow delete access to all users"
ON team_invitations
FOR DELETE
USING (true);

-- 코멘트 추가
COMMENT ON TABLE team_invitations IS '팀 멤버 초대 정보를 저장하는 테이블';
COMMENT ON COLUMN team_invitations.id IS '초대 고유 ID';
COMMENT ON COLUMN team_invitations.email IS '초대받는 사람의 이메일 주소';
COMMENT ON COLUMN team_invitations.token IS '초대 토큰 (링크에 사용)';
COMMENT ON COLUMN team_invitations.status IS '초대 상태 (pending, accepted, expired)';
COMMENT ON COLUMN team_invitations.invited_by IS '초대를 보낸 사람';
COMMENT ON COLUMN team_invitations.expires_at IS '초대 만료 시간';
COMMENT ON COLUMN team_invitations.created_at IS '초대 생성 시간';
COMMENT ON COLUMN team_invitations.updated_at IS '초대 정보 수정 시간';
