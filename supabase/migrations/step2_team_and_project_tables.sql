-- =============================================
-- STEP 2: 팀 관련 테이블 & 프로젝트 테이블
-- =============================================
-- users, teams, team_members에 의존하는 테이블들
-- 실행 순서: 2번째 (step1 실행 후)

-- =============================================
-- 1. team_invitations 테이블 (기존 테이블 업데이트)
-- =============================================

-- 기존 team_invitations 테이블 삭제 후 재생성 (team_id 추가)
DROP TABLE IF EXISTS public.team_invitations CASCADE;

CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by_id UUID NOT NULL REFERENCES public.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON public.team_invitations(expires_at);

CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

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
-- 2. team_activity_logs 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.team_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_activity_logs_team_id ON public.team_activity_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_created_at ON public.team_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_activity_logs_action_type ON public.team_activity_logs(action_type);

ALTER TABLE public.team_activity_logs ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "System can insert activity logs"
  ON public.team_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.team_activity_logs IS '팀 활동 로그';


-- =============================================
-- 3. projects 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(2000),
  owner_id UUID NOT NULL REFERENCES public.users(id),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_archived ON public.projects(is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_team_deleted_archived ON public.projects(team_id, deleted_at, is_archived);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

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
-- 4. project_favorites 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.project_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_favorites_user_id ON public.project_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_project_favorites_project_id ON public.project_favorites(project_id);

ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
  ON public.project_favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.project_favorites IS '프로젝트 즐겨찾기 (사용자별)';


-- =============================================
-- 5. project_statuses 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.project_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  color VARCHAR(7),
  position INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  wip_limit INTEGER CHECK (wip_limit IS NULL OR (wip_limit >= 1 AND wip_limit <= 50)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_statuses_project_id ON public.project_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_statuses_position ON public.project_statuses(project_id, position);

ALTER TABLE public.project_statuses ENABLE ROW LEVEL SECURITY;

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


-- =============================================
-- 6. labels 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_labels_project_id ON public.labels(project_id);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

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
-- 완료 메시지
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 2 완료: 팀 관련 및 프로젝트 테이블 생성 성공';
  RAISE NOTICE '다음 파일 실행: step3_issue_tables.sql';
END $$;
