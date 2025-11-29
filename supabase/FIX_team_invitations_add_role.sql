-- team_invitations 테이블에 role 컬럼 추가
-- 초대 시 멤버의 역할을 지정할 수 있도록 함

ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'MEMBER'
CHECK (role IN ('ADMIN', 'MEMBER'));

-- invited_by를 문자열로 저장하기 위해 컬럼 추가
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS invited_by VARCHAR(255);

-- 기존 데이터가 있다면 기본값 설정
UPDATE public.team_invitations
SET invited_by = '관리자'
WHERE invited_by IS NULL;

COMMENT ON COLUMN public.team_invitations.role IS '초대된 멤버의 역할 (ADMIN 또는 MEMBER)';
COMMENT ON COLUMN public.team_invitations.invited_by IS '초대한 사람의 이름 또는 이메일';
