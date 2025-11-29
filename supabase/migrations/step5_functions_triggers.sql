-- =============================================
-- STEP 5: 함수 및 트리거 정의
-- =============================================
-- step1~4 실행 후 이 스크립트를 실행하세요.
-- 실행 순서: 5번째 (step4 실행 후)

-- =============================================
-- 1. 이슈 키 자동 생성 함수
-- =============================================
-- 프로젝트별로 "LIG-1", "LIG-2" 형태의 이슈 키를 자동 생성

CREATE OR REPLACE FUNCTION generate_issue_key()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT := 'LIG'; -- 프로젝트 접두어 (필요시 수정)
  next_number INTEGER;
BEGIN
  -- 해당 프로젝트의 다음 이슈 번호 계산
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(issue_key FROM '[0-9]+$') AS INTEGER)), 0
  ) + 1 INTO next_number
  FROM public.issues
  WHERE project_id = NEW.project_id
    AND issue_key ~ ('^' || prefix || '-[0-9]+$');

  NEW.issue_key := prefix || '-' || next_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 이슈 생성 시 이슈 키 자동 생성 트리거
CREATE TRIGGER trigger_generate_issue_key
  BEFORE INSERT ON public.issues
  FOR EACH ROW
  WHEN (NEW.issue_key IS NULL)
  EXECUTE FUNCTION generate_issue_key();


-- =============================================
-- 2. 프로젝트 생성 시 기본 상태 자동 생성 함수
-- =============================================

CREATE OR REPLACE FUNCTION create_default_project_statuses()
RETURNS TRIGGER AS $$
BEGIN
  -- 기본 상태 3개 생성: Backlog, In Progress, Done
  INSERT INTO public.project_statuses (project_id, name, color, position, is_default)
  VALUES
    (NEW.id, 'Backlog', '#6b7280', 0, true),
    (NEW.id, 'In Progress', '#3b82f6', 1, true),
    (NEW.id, 'Done', '#22c55e', 2, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로젝트 생성 시 기본 상태 자동 생성 트리거
CREATE TRIGGER trigger_create_default_statuses
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION create_default_project_statuses();


-- =============================================
-- 3. 팀당 프로젝트 개수 제한 함수 (최대 15개)
-- =============================================

CREATE OR REPLACE FUNCTION check_project_limit()
RETURNS TRIGGER AS $$
DECLARE
  project_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO project_count
  FROM public.projects
  WHERE team_id = NEW.team_id
    AND deleted_at IS NULL;

  IF project_count >= 15 THEN
    RAISE EXCEPTION '팀당 최대 15개의 프로젝트만 생성할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_project_limit
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_limit();


-- =============================================
-- 4. 프로젝트당 이슈 개수 제한 함수 (최대 200개)
-- =============================================

CREATE OR REPLACE FUNCTION check_issue_limit()
RETURNS TRIGGER AS $$
DECLARE
  issue_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO issue_count
  FROM public.issues
  WHERE project_id = NEW.project_id
    AND deleted_at IS NULL;

  IF issue_count >= 200 THEN
    RAISE EXCEPTION '프로젝트당 최대 200개의 이슈만 생성할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_issue_limit
  BEFORE INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION check_issue_limit();


-- =============================================
-- 5. 이슈당 서브태스크 개수 제한 함수 (최대 10개)
-- =============================================

CREATE OR REPLACE FUNCTION check_subtask_limit()
RETURNS TRIGGER AS $$
DECLARE
  subtask_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO subtask_count
  FROM public.subtasks
  WHERE parent_issue_id = NEW.parent_issue_id;

  IF subtask_count >= 10 THEN
    RAISE EXCEPTION '이슈당 최대 10개의 서브태스크만 생성할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_subtask_limit
  BEFORE INSERT ON public.subtasks
  FOR EACH ROW
  EXECUTE FUNCTION check_subtask_limit();


-- =============================================
-- 6. 프로젝트당 라벨 개수 제한 함수 (최대 20개)
-- =============================================

CREATE OR REPLACE FUNCTION check_label_limit()
RETURNS TRIGGER AS $$
DECLARE
  label_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO label_count
  FROM public.labels
  WHERE project_id = NEW.project_id;

  IF label_count >= 20 THEN
    RAISE EXCEPTION '프로젝트당 최대 20개의 라벨만 생성할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_label_limit
  BEFORE INSERT ON public.labels
  FOR EACH ROW
  EXECUTE FUNCTION check_label_limit();


-- =============================================
-- 7. 이슈당 라벨 개수 제한 함수 (최대 5개)
-- =============================================

CREATE OR REPLACE FUNCTION check_issue_label_limit()
RETURNS TRIGGER AS $$
DECLARE
  label_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO label_count
  FROM public.issue_labels
  WHERE issue_id = NEW.issue_id;

  IF label_count >= 5 THEN
    RAISE EXCEPTION '이슈당 최대 5개의 라벨만 적용할 수 있습니다.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_issue_label_limit
  BEFORE INSERT ON public.issue_labels
  FOR EACH ROW
  EXECUTE FUNCTION check_issue_label_limit();


-- =============================================
-- 8. 프로젝트당 커스텀 상태 개수 제한 함수 (최대 5개, 총 8개)
-- =============================================

CREATE OR REPLACE FUNCTION check_custom_status_limit()
RETURNS TRIGGER AS $$
DECLARE
  custom_status_count INTEGER;
BEGIN
  -- 기본 상태가 아닌 경우에만 체크
  IF NEW.is_default = false THEN
    SELECT COUNT(*) INTO custom_status_count
    FROM public.project_statuses
    WHERE project_id = NEW.project_id
      AND is_default = false;

    IF custom_status_count >= 5 THEN
      RAISE EXCEPTION '프로젝트당 최대 5개의 커스텀 상태만 생성할 수 있습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_custom_status_limit
  BEFORE INSERT ON public.project_statuses
  FOR EACH ROW
  EXECUTE FUNCTION check_custom_status_limit();


-- =============================================
-- 9. 이슈 변경 히스토리 자동 기록 함수
-- =============================================

CREATE OR REPLACE FUNCTION record_issue_history()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태 변경
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO public.issue_history (issue_id, user_id, field_name, old_value, new_value)
    SELECT NEW.id, auth.uid(), 'status',
      (SELECT name FROM public.project_statuses WHERE id = OLD.status_id),
      (SELECT name FROM public.project_statuses WHERE id = NEW.status_id);
  END IF;

  -- 담당자 변경
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.issue_history (issue_id, user_id, field_name, old_value, new_value)
    SELECT NEW.id, auth.uid(), 'assignee',
      (SELECT name FROM public.users WHERE id = OLD.assignee_id),
      (SELECT name FROM public.users WHERE id = NEW.assignee_id);
  END IF;

  -- 우선순위 변경
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.issue_history (issue_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority', OLD.priority, NEW.priority);
  END IF;

  -- 제목 변경
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.issue_history (issue_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'title', OLD.title, NEW.title);
  END IF;

  -- 마감일 변경
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.issue_history (issue_id, user_id, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'due_date', OLD.due_date::TEXT, NEW.due_date::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_record_issue_history
  AFTER UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION record_issue_history();


-- =============================================
-- 10. AI Rate Limit 체크 함수
-- =============================================

CREATE OR REPLACE FUNCTION check_ai_rate_limit(
  p_user_id UUID,
  p_feature_type VARCHAR(30)
)
RETURNS TABLE (
  allowed BOOLEAN,
  minute_remaining INTEGER,
  day_remaining INTEGER,
  reset_minute TIMESTAMPTZ,
  reset_day TIMESTAMPTZ
) AS $$
DECLARE
  minute_limit INTEGER := 10;
  day_limit INTEGER := 100;
  minute_count INTEGER := 0;
  day_count INTEGER := 0;
  minute_start TIMESTAMPTZ;
  day_start TIMESTAMPTZ;
BEGIN
  -- 분당 제한 체크 (최근 1분간)
  SELECT COALESCE(SUM(request_count), 0) INTO minute_count
  FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND feature_type = p_feature_type
    AND window_start >= NOW() - INTERVAL '1 minute';

  -- 일당 제한 체크 (최근 24시간)
  SELECT COALESCE(SUM(request_count), 0) INTO day_count
  FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND feature_type = p_feature_type
    AND window_start >= NOW() - INTERVAL '1 day';

  -- 결과 반환
  RETURN QUERY SELECT
    (minute_count < minute_limit AND day_count < day_limit) AS allowed,
    (minute_limit - minute_count) AS minute_remaining,
    (day_limit - day_count) AS day_remaining,
    NOW() + INTERVAL '1 minute' AS reset_minute,
    NOW() + INTERVAL '1 day' AS reset_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 11. AI Rate Limit 증가 함수
-- =============================================

CREATE OR REPLACE FUNCTION increment_ai_rate_limit(
  p_user_id UUID,
  p_feature_type VARCHAR(30)
)
RETURNS VOID AS $$
BEGIN
  -- 현재 윈도우(1분 단위)에 대한 카운터 증가 또는 생성
  INSERT INTO public.ai_rate_limits (user_id, feature_type, request_count, window_start)
  VALUES (p_user_id, p_feature_type, 1, DATE_TRUNC('minute', NOW()))
  ON CONFLICT (user_id, feature_type, window_start)
  DO UPDATE SET request_count = ai_rate_limits.request_count + 1;

  -- 오래된 레코드 정리 (24시간 이전)
  DELETE FROM public.ai_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 12. 이슈 description 해시 생성 함수 (AI 캐시 무효화용)
-- =============================================

CREATE OR REPLACE FUNCTION generate_content_hash(content TEXT)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(sha256(content::bytea), 'hex');
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- 13. AI 캐시 무효화 함수 (description 변경 시)
-- =============================================

CREATE OR REPLACE FUNCTION invalidate_ai_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- description이 변경되면 해당 이슈 관련 AI 캐시 삭제
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    DELETE FROM public.ai_cache
    WHERE feature_type IN ('SUGGEST_SUBTASKS', 'SUMMARIZE_COMMENTS')
      AND input_hash = generate_content_hash(OLD.description);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_ai_cache
  AFTER UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_ai_cache();


-- =============================================
-- 14. 댓글 추가 시 comment_summary 캐시 무효화
-- =============================================

CREATE OR REPLACE FUNCTION invalidate_comment_summary_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.ai_cache
  WHERE feature_type = 'SUMMARIZE_COMMENTS';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_comment_summary_cache
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_comment_summary_cache();


-- =============================================
-- 15. 팀 활동 로그 기록 헬퍼 함수
-- =============================================

CREATE OR REPLACE FUNCTION log_team_activity(
  p_team_id UUID,
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_target_type VARCHAR(50),
  p_target_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.team_activity_logs (team_id, user_id, action_type, target_type, target_id, description, metadata)
  VALUES (p_team_id, p_user_id, p_action_type, p_target_type, p_target_id, p_description, p_metadata)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 16. 알림 생성 헬퍼 함수
-- =============================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(30),
  p_title VARCHAR(100),
  p_message VARCHAR(500),
  p_link VARCHAR(500) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- 17. 담당자 변경 시 알림 생성
-- =============================================

CREATE OR REPLACE FUNCTION notify_on_assignee_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 담당자에게 알림 전송 (담당자가 설정되고, 본인이 아닌 경우)
  IF NEW.assignee_id IS NOT NULL
     AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
     AND NEW.assignee_id != auth.uid() THEN
    PERFORM create_notification(
      NEW.assignee_id,
      'issue_assigned',
      '새로운 이슈가 할당되었습니다',
      '이슈 "' || NEW.title || '"가 당신에게 할당되었습니다.',
      '/issues/' || NEW.issue_key
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_assignee_change
  AFTER UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_assignee_change();


-- =============================================
-- 18. 댓글 작성 시 알림 생성
-- =============================================

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  issue_reporter_id UUID;
  issue_assignee_id UUID;
  issue_title VARCHAR(100);
  issue_key VARCHAR(20);
BEGIN
  -- 이슈 정보 조회
  SELECT reporter_id, assignee_id, title, issues.issue_key
  INTO issue_reporter_id, issue_assignee_id, issue_title, issue_key
  FROM public.issues
  WHERE id = NEW.issue_id;

  -- 이슈 작성자에게 알림 (댓글 작성자가 아닌 경우)
  IF issue_reporter_id IS NOT NULL AND issue_reporter_id != NEW.user_id THEN
    PERFORM create_notification(
      issue_reporter_id,
      'comment_added',
      '새로운 댓글이 작성되었습니다',
      '이슈 "' || issue_title || '"에 새로운 댓글이 달렸습니다.',
      '/issues/' || issue_key
    );
  END IF;

  -- 담당자에게 알림 (작성자가 아니고, 리포터와 다른 경우)
  IF issue_assignee_id IS NOT NULL
     AND issue_assignee_id != NEW.user_id
     AND issue_assignee_id != issue_reporter_id THEN
    PERFORM create_notification(
      issue_assignee_id,
      'comment_added',
      '새로운 댓글이 작성되었습니다',
      '담당 이슈 "' || issue_title || '"에 새로운 댓글이 달렸습니다.',
      '/issues/' || issue_key
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();


-- =============================================
-- 19. 커스텀 상태 삭제 시 이슈 Backlog로 이동
-- =============================================

CREATE OR REPLACE FUNCTION move_issues_to_backlog_on_status_delete()
RETURNS TRIGGER AS $$
DECLARE
  backlog_status_id UUID;
BEGIN
  -- 기본 상태는 삭제 불가
  IF OLD.is_default = true THEN
    RAISE EXCEPTION '기본 상태는 삭제할 수 없습니다.';
  END IF;

  -- Backlog 상태 ID 조회
  SELECT id INTO backlog_status_id
  FROM public.project_statuses
  WHERE project_id = OLD.project_id
    AND name = 'Backlog'
    AND is_default = true;

  -- 해당 상태의 이슈들을 Backlog로 이동
  UPDATE public.issues
  SET status_id = backlog_status_id
  WHERE status_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_move_issues_on_status_delete
  BEFORE DELETE ON public.project_statuses
  FOR EACH ROW
  EXECUTE FUNCTION move_issues_to_backlog_on_status_delete();


-- =============================================
-- 20. Supabase Auth 유저 생성 시 users 테이블 자동 생성
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      ELSE 'email'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- =============================================
-- 21. 이슈 생성 시 기본 상태(Backlog) 자동 설정
-- =============================================

CREATE OR REPLACE FUNCTION set_default_issue_status()
RETURNS TRIGGER AS $$
BEGIN
  -- status_id가 없으면 Backlog로 설정
  IF NEW.status_id IS NULL THEN
    SELECT id INTO NEW.status_id
    FROM public.project_statuses
    WHERE project_id = NEW.project_id
      AND name = 'Backlog'
      AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_default_issue_status
  BEFORE INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION set_default_issue_status();


-- =============================================
-- 22. 팀 생성 시 자동으로 팀 멤버에 추가
-- =============================================

CREATE OR REPLACE FUNCTION add_owner_to_team()
RETURNS TRIGGER AS $$
BEGIN
  -- 팀 생성자를 자동으로 OWNER로 추가
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'OWNER');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_owner_to_team
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_team();


-- =============================================
-- 완료 메시지
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 5 완료: 함수 및 트리거 생성 성공';
  RAISE NOTICE '다음 파일 실행 (선택사항): step6_seed_data.sql';
END $$;
