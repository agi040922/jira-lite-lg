-- =============================================
-- STEP 3: 이슈 관련 테이블
-- =============================================
-- projects에 의존하는 이슈 관련 테이블들
-- 실행 순서: 3번째 (step2 실행 후)

-- =============================================
-- 1. issues 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_key VARCHAR(20) NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(5000),
  type VARCHAR(10) NOT NULL CHECK (type IN ('TASK', 'BUG', 'FEATURE')),
  status_id UUID NOT NULL REFERENCES public.project_statuses(id),
  priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assignee_id UUID REFERENCES public.users(id),
  reporter_id UUID NOT NULL REFERENCES public.users(id),
  parent_issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  story_points INTEGER CHECK (story_points IS NULL OR (story_points >= 1 AND story_points <= 100)),
  start_date DATE,
  due_date DATE,
  actual_hours DECIMAL(10,2) CHECK (actual_hours IS NULL OR actual_hours >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_dates CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date)
);

CREATE INDEX IF NOT EXISTS idx_issues_project_id ON public.issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_issue_key ON public.issues(issue_key);
CREATE INDEX IF NOT EXISTS idx_issues_status_id ON public.issues(status_id);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON public.issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_reporter_id ON public.issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_parent_issue_id ON public.issues(parent_issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_deleted_at ON public.issues(deleted_at);
CREATE INDEX IF NOT EXISTS idx_issues_project_status ON public.issues(project_id, status_id, deleted_at);

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE public.issues IS '이슈 정보 (프로젝트당 최대 200개)';


-- =============================================
-- 2. issue_labels 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.issue_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(issue_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_labels_issue_id ON public.issue_labels(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_labels_label_id ON public.issue_labels(label_id);

ALTER TABLE public.issue_labels ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE public.issue_labels IS '이슈-라벨 매핑 (이슈당 최대 5개)';


-- =============================================
-- 3. subtasks 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtasks_parent_issue_id ON public.subtasks(parent_issue_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_position ON public.subtasks(parent_issue_id, position);

CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can manage subtasks"
  ON public.subtasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      JOIN public.projects p ON p.id = i.project_id
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE i.id = subtasks.parent_issue_id
        AND tm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.subtasks IS '서브태스크 (이슈당 최대 10개)';


-- =============================================
-- 4. comments 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  content VARCHAR(2000) NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON public.comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.comments IS '이슈 댓글 (답글 1단계까지)';


-- =============================================
-- 5. issue_history 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.issue_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  field_name VARCHAR(30) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_history_issue_id ON public.issue_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_history_created_at ON public.issue_history(created_at DESC);

ALTER TABLE public.issue_history ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "System can insert history"
  ON public.issue_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.issue_history IS '이슈 변경 이력 (최근 50개만)';


-- =============================================
-- 완료 메시지
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 3 완료: 이슈 관련 테이블 생성 성공';
  RAISE NOTICE '다음 파일 실행: step4_ai_and_notification_tables.sql';
END $$;
