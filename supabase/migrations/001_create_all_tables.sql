-- =============================================
-- Jira Lite - 전체 데이터베이스 스키마 생성
-- =============================================
-- 이 스크립트는 Supabase Dashboard의 SQL Editor에서 실행하세요.
-- 순서대로 실행해야 합니다 (외래 키 의존성 때문)

-- =============================================
-- 0. 공통 함수 정의
-- =============================================

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. users 테이블 (Supabase Auth 확장)
-- =============================================
-- 참고: Supabase Auth의 auth.users와 연동됩니다

CREATE TABLE IF NOT EXISTS public.users (
  -- Supabase Auth user id와 동일하게 사용
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 이메일 (최대 255자)
  email VARCHAR(255) NOT NULL UNIQUE,

  -- 이름 (1~50자)
  name VARCHAR(50) NOT NULL,

  -- 프로필 이미지 URL
  profile_image TEXT,

  -- 인증 방식 (email 또는 google)
  provider VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google')),

  -- 생성/수정/삭제 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft Delete용
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);

-- updated_at 트리거
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자는 모든 사용자 조회 가능
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- RLS 정책: 본인 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 코멘트
COMMENT ON TABLE public.users IS '사용자 프로필 정보';
COMMENT ON COLUMN public.users.provider IS '인증 방식: email(이메일/비밀번호) 또는 google(Google OAuth)';


-- =============================================
-- 2. teams 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 팀 이름 (1~50자)
  name VARCHAR(50) NOT NULL,

  -- 팀 소유자
  owner_id UUID NOT NULL REFERENCES public.users(id),

  -- 생성/수정/삭제 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft Delete용 (30일간 복구 가능)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON public.teams(deleted_at);

-- updated_at 트리거
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 조회 가능
CREATE POLICY "Team members can view teams"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 인증된 사용자는 팀 생성 가능
CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- RLS 정책: OWNER/ADMIN만 팀 수정 가능
CREATE POLICY "Owners and admins can update teams"
  ON public.teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

COMMENT ON TABLE public.teams IS '팀 정보';


-- =============================================
-- 3. team_members 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 팀 ID
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- 사용자 ID
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 역할: OWNER(팀당 1명), ADMIN(관리자), MEMBER(일반)
  role VARCHAR(10) NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),

  -- 가입일
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 같은 팀에 같은 사용자 중복 방지
  UNIQUE(team_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- RLS 활성화
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 같은 팀 멤버 조회 가능
CREATE POLICY "Team members can view team members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members my_membership
      WHERE my_membership.team_id = team_members.team_id
        AND my_membership.user_id = auth.uid()
    )
  );

-- RLS 정책: OWNER/ADMIN만 멤버 관리 가능
CREATE POLICY "Owners and admins can manage team members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

COMMENT ON TABLE public.team_members IS '팀 멤버십 정보';
COMMENT ON COLUMN public.team_members.role IS 'OWNER: 팀 소유자(팀당 1명), ADMIN: 관리자, MEMBER: 일반 멤버';


-- =============================================
-- 4. team_invitations 테이블 (기존 확장)
-- =============================================

-- 기존 team_invitations 테이블이 있다면 team_id 컬럼 추가
-- 새로 만드는 경우를 위한 전체 스키마

DROP TABLE IF EXISTS public.team_invitations CASCADE;

CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 팀 ID
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- 초대받을 이메일
  email VARCHAR(255) NOT NULL,

  -- 초대 토큰 (링크에 사용)
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- 초대 상태
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),

  -- 초대한 사람
  invited_by_id UUID NOT NULL REFERENCES public.users(id),

  -- 만료 시간 (7일)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- 생성/수정 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON public.team_invitations(expires_at);

-- updated_at 트리거
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view invitations to their email"
  ON public.team_invitations FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Owners and admins can create invitations"
  ON public.team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

COMMENT ON TABLE public.team_invitations IS '팀 초대 정보 (만료: 7일)';


-- =============================================
-- 5. team_activity_logs 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.team_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 팀 ID
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- 활동 수행자
  user_id UUID NOT NULL REFERENCES public.users(id),

  -- 활동 유형
  action_type VARCHAR(50) NOT NULL,

  -- 대상 유형 (member, project, team 등)
  target_type VARCHAR(50),

  -- 대상 ID
  target_id UUID,

  -- 활동 설명
  description TEXT NOT NULL,

  -- 추가 메타데이터 (JSON)
  metadata JSONB,

  -- 발생 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_team_id ON public.team_activity_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_created_at ON public.team_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_action_type ON public.team_activity_logs(action_type);

-- RLS 활성화
ALTER TABLE public.team_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 활동 로그 조회 가능
CREATE POLICY "Team members can view activity logs"
  ON public.team_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_activity_logs.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 시스템이 자동으로 로그 생성 (서비스 역할)
CREATE POLICY "System can insert activity logs"
  ON public.team_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.team_activity_logs IS '팀 활동 로그';
COMMENT ON COLUMN public.team_activity_logs.action_type IS 'member_joined, member_left, member_kicked, role_changed, project_created, project_deleted, project_archived, team_updated';


-- =============================================
-- 6. projects 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 팀 ID
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- 프로젝트명 (1~100자)
  name VARCHAR(100) NOT NULL,

  -- 설명 (최대 2000자)
  description VARCHAR(2000),

  -- 소유자 (생성자)
  owner_id UUID NOT NULL REFERENCES public.users(id),

  -- 아카이브 여부
  is_archived BOOLEAN NOT NULL DEFAULT false,

  -- 생성/수정/삭제 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft Delete용
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON public.projects(is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_team_deleted_archived ON public.projects(team_id, deleted_at, is_archived);

-- updated_at 트리거
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 프로젝트 조회 가능
CREATE POLICY "Team members can view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 팀 멤버는 프로젝트 생성 가능
CREATE POLICY "Team members can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: OWNER/ADMIN 또는 프로젝트 소유자만 수정 가능
CREATE POLICY "Owners, admins, and project owners can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
        AND (tm.role IN ('OWNER', 'ADMIN') OR projects.owner_id = auth.uid())
    )
  );

COMMENT ON TABLE public.projects IS '프로젝트 정보 (팀당 최대 15개)';


-- =============================================
-- 7. project_favorites 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.project_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 프로젝트 ID
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- 사용자 ID
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 추가 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 중복 방지
  UNIQUE(project_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_project_favorites_user_id ON public.project_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_project_favorites_project_id ON public.project_favorites(project_id);

-- RLS 활성화
ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 즐겨찾기만 조회/관리 가능
CREATE POLICY "Users can manage own favorites"
  ON public.project_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.project_favorites IS '프로젝트 즐겨찾기 (사용자별)';


-- =============================================
-- 8. project_statuses 테이블 (커스텀 상태/칸반 컬럼)
-- =============================================

CREATE TABLE IF NOT EXISTS public.project_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 프로젝트 ID
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- 상태명 (1~30자)
  name VARCHAR(30) NOT NULL,

  -- 색상 (HEX)
  color VARCHAR(7),

  -- 컬럼 순서
  position INTEGER NOT NULL,

  -- 기본 상태 여부 (Backlog, In Progress, Done)
  is_default BOOLEAN NOT NULL DEFAULT false,

  -- WIP 제한 (1~50, null=무제한)
  wip_limit INTEGER CHECK (wip_limit IS NULL OR (wip_limit >= 1 AND wip_limit <= 50)),

  -- 생성 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 프로젝트 내 상태명 중복 방지
  UNIQUE(project_id, name)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_project_statuses_project_id ON public.project_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_statuses_position ON public.project_statuses(project_id, position);

-- RLS 활성화
ALTER TABLE public.project_statuses ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 상태 조회 가능
CREATE POLICY "Team members can view project statuses"
  ON public.project_statuses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_statuses.project_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 팀 멤버는 커스텀 상태 관리 가능
CREATE POLICY "Team members can manage custom statuses"
  ON public.project_statuses FOR ALL
  TO authenticated
  USING (
    is_default = false AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_statuses.project_id
        AND tm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.project_statuses IS '프로젝트 상태 (칸반 컬럼). 기본 3개 + 커스텀 최대 5개';
COMMENT ON COLUMN public.project_statuses.is_default IS '기본 상태 여부. 기본 상태는 삭제 불가';
COMMENT ON COLUMN public.project_statuses.wip_limit IS 'WIP 제한 (1~50). NULL이면 무제한';


-- =============================================
-- 9. labels 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 프로젝트 ID
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- 라벨명 (1~30자)
  name VARCHAR(30) NOT NULL,

  -- 색상 (HEX)
  color VARCHAR(7) NOT NULL DEFAULT '#6366f1',

  -- 생성 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 프로젝트 내 라벨명 중복 방지
  UNIQUE(project_id, name)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_labels_project_id ON public.labels(project_id);

-- RLS 활성화
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 라벨 조회/관리 가능
CREATE POLICY "Team members can view and manage labels"
  ON public.labels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = labels.project_id
        AND tm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.labels IS '이슈 라벨 (프로젝트당 최대 20개)';


-- =============================================
-- 10. issues 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 프로젝트 ID
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- 이슈 번호 (프로젝트 내 순번)
  issue_number SERIAL,

  -- 이슈 키 (예: LIG-325)
  issue_key VARCHAR(20) UNIQUE,

  -- 제목 (1~200자)
  title VARCHAR(200) NOT NULL,

  -- 설명 (최대 5000자)
  description TEXT CHECK (description IS NULL OR length(description) <= 5000),

  -- 상태 ID
  status_id UUID REFERENCES public.project_statuses(id),

  -- 우선순위
  priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),

  -- 담당자
  assignee_id UUID REFERENCES public.users(id),

  -- 생성자 (소유자)
  owner_id UUID NOT NULL REFERENCES public.users(id),

  -- 마감일
  due_date DATE,

  -- 컬럼 내 순서
  position INTEGER NOT NULL DEFAULT 0,

  -- 생성/수정/삭제 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft Delete용
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON public.issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status_id ON public.issues(status_id);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON public.issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_owner_id ON public.issues(owner_id);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON public.issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_due_date ON public.issues(due_date);
CREATE INDEX IF NOT EXISTS idx_issues_deleted_at ON public.issues(deleted_at);
CREATE INDEX IF NOT EXISTS idx_issues_position ON public.issues(project_id, status_id, position);
CREATE INDEX IF NOT EXISTS idx_issues_issue_key ON public.issues(issue_key);

-- updated_at 트리거
CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 이슈 조회 가능
CREATE POLICY "Team members can view issues"
  ON public.issues FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = issues.project_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 팀 멤버는 이슈 생성 가능
CREATE POLICY "Team members can create issues"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = issues.project_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 팀 멤버는 이슈 수정 가능
CREATE POLICY "Team members can update issues"
  ON public.issues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE p.id = issues.project_id
        AND tm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.issues IS '이슈 (프로젝트당 최대 200개)';
COMMENT ON COLUMN public.issues.issue_key IS '이슈 키 (예: LIG-325). 자동 생성';


-- =============================================
-- 11. issue_labels 테이블 (이슈-라벨 연결)
-- =============================================

CREATE TABLE IF NOT EXISTS public.issue_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이슈 ID
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,

  -- 라벨 ID
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,

  -- 추가 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 중복 방지
  UNIQUE(issue_id, label_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_issue_labels_issue_id ON public.issue_labels(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_labels_label_id ON public.issue_labels(label_id);

-- RLS 활성화
ALTER TABLE public.issue_labels ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 관리 가능
CREATE POLICY "Team members can manage issue labels"
  ON public.issue_labels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      JOIN public.projects p ON p.id = i.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE i.id = issue_labels.issue_id
        AND tm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.issue_labels IS '이슈-라벨 연결 (이슈당 최대 5개)';


-- =============================================
-- 12. subtasks 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이슈 ID
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,

  -- 제목 (1~200자)
  title VARCHAR(200) NOT NULL,

  -- 완료 여부
  is_completed BOOLEAN NOT NULL DEFAULT false,

  -- 순서
  position INTEGER NOT NULL DEFAULT 0,

  -- 생성/수정 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subtasks_issue_id ON public.subtasks(issue_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_position ON public.subtasks(issue_id, position);

-- updated_at 트리거
CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 관리 가능
CREATE POLICY "Team members can manage subtasks"
  ON public.subtasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      JOIN public.projects p ON p.id = i.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE i.id = subtasks.issue_id
        AND tm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.subtasks IS '서브태스크 (이슈당 최대 20개)';


-- =============================================
-- 13. comments 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이슈 ID
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,

  -- 작성자
  user_id UUID NOT NULL REFERENCES public.users(id),

  -- 내용 (1~1000자)
  content VARCHAR(1000) NOT NULL,

  -- 생성/수정/삭제 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft Delete용
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON public.comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at);

-- updated_at 트리거
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 댓글 조회 가능
CREATE POLICY "Team members can view comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.issues i
      JOIN public.projects p ON p.id = i.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE i.id = comments.issue_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 팀 멤버는 댓글 작성 가능
CREATE POLICY "Team members can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.issues i
      JOIN public.projects p ON p.id = i.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE i.id = comments.issue_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 본인 댓글만 수정 가능
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.comments IS '이슈 댓글';


-- =============================================
-- 14. issue_history 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.issue_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이슈 ID
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,

  -- 변경자
  user_id UUID NOT NULL REFERENCES public.users(id),

  -- 변경된 필드명
  field_name VARCHAR(50) NOT NULL,

  -- 이전 값
  old_value TEXT,

  -- 새 값
  new_value TEXT,

  -- 변경 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_issue_history_issue_id ON public.issue_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_history_created_at ON public.issue_history(created_at DESC);

-- RLS 활성화
ALTER TABLE public.issue_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 히스토리 조회 가능
CREATE POLICY "Team members can view issue history"
  ON public.issue_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      JOIN public.projects p ON p.id = i.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE i.id = issue_history.issue_id
        AND tm.user_id = auth.uid()
    )
  );

-- RLS 정책: 시스템이 자동으로 히스토리 생성
CREATE POLICY "System can insert issue history"
  ON public.issue_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.issue_history IS '이슈 변경 이력';
COMMENT ON COLUMN public.issue_history.field_name IS 'status, assignee, priority, title, due_date';


-- =============================================
-- 15. notifications 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 수신자
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 알림 유형
  type VARCHAR(50) NOT NULL,

  -- 알림 제목
  title VARCHAR(200) NOT NULL,

  -- 알림 내용
  message TEXT,

  -- 참조 타입 (issue, team, project 등)
  reference_type VARCHAR(50),

  -- 참조 ID
  reference_id UUID,

  -- 읽음 여부
  is_read BOOLEAN NOT NULL DEFAULT false,

  -- 생성 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 알림만 조회/관리 가능
CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS '인앱 알림';
COMMENT ON COLUMN public.notifications.type IS 'issue_assigned, comment_added, due_date_approaching, due_date_today, team_invited, role_changed';


-- =============================================
-- 16. ai_cache 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이슈 ID
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,

  -- 캐시 유형
  cache_type VARCHAR(30) NOT NULL,

  -- AI 결과 내용
  content TEXT NOT NULL,

  -- 입력값 해시 (무효화 판단용)
  input_hash VARCHAR(64) NOT NULL,

  -- 생성 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 만료 시간
  expires_at TIMESTAMPTZ,

  -- 이슈당 캐시 유형 중복 방지
  UNIQUE(issue_id, cache_type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_cache_issue_id ON public.ai_cache(issue_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_cache_type ON public.ai_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_input_hash ON public.ai_cache(input_hash);

-- RLS 활성화
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 팀 멤버만 캐시 접근 가능
CREATE POLICY "Team members can access ai cache"
  ON public.ai_cache FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      JOIN public.projects p ON p.id = i.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE i.id = ai_cache.issue_id
        AND tm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.ai_cache IS 'AI 결과 캐시';
COMMENT ON COLUMN public.ai_cache.cache_type IS 'summary, suggestion, auto_label, duplicate, comment_summary';
COMMENT ON COLUMN public.ai_cache.input_hash IS 'description 변경 시 캐시 무효화 판단용';


-- =============================================
-- 17. ai_rate_limits 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 ID
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 요청 횟수
  request_count INTEGER NOT NULL DEFAULT 1,

  -- 윈도우 시작 시간
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 윈도우 타입 (minute 또는 day)
  window_type VARCHAR(10) NOT NULL CHECK (window_type IN ('minute', 'day')),

  -- 사용자별 윈도우 타입 중복 방지
  UNIQUE(user_id, window_type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_id ON public.ai_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_window_start ON public.ai_rate_limits(window_start);

-- RLS 활성화
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 rate limit만 조회/관리 가능
CREATE POLICY "Users can manage own rate limits"
  ON public.ai_rate_limits FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.ai_rate_limits IS 'AI Rate Limiting (분당 10회, 일당 100회)';


-- =============================================
-- 18. password_reset_tokens 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 사용자 ID
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 재설정 토큰
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- 만료 시간 (1시간)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),

  -- 사용 시간
  used_at TIMESTAMPTZ,

  -- 생성 시간
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- RLS 활성화
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 시스템만 접근 가능 (서비스 역할로만)
CREATE POLICY "Service role only"
  ON public.password_reset_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.password_reset_tokens IS '비밀번호 재설정 토큰 (만료: 1시간)';


-- =============================================
-- 완료 메시지
-- =============================================
-- 이 스크립트 실행 후, 002_create_functions.sql을 실행하세요.
