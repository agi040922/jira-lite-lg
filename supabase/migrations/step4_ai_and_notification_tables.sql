-- =============================================
-- STEP 4: AI 및 알림 테이블
-- =============================================
-- AI 캐싱, 레이트 리미팅, 알림 관련 테이블들
-- 실행 순서: 4번째 (step3 실행 후)

-- =============================================
-- 1. notifications 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(100) NOT NULL,
  message VARCHAR(500) NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.notifications IS '사용자 알림 (최근 100개만)';


-- =============================================
-- 2. ai_cache 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type VARCHAR(30) NOT NULL CHECK (feature_type IN ('SUGGEST_SUBTASKS', 'SUMMARIZE_COMMENTS', 'SUGGEST_ASSIGNEE', 'PREDICT_COMPLETION', 'TITLE_AUTOCOMPLETE')),
  input_hash VARCHAR(64) NOT NULL,
  input_data JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  hit_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(feature_type, input_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_feature_type ON public.ai_cache(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_input_hash ON public.ai_cache(feature_type, input_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON public.ai_cache(expires_at);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for AI cache"
  ON public.ai_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.ai_cache IS 'AI 응답 캐시 (만료: 24시간, SHA256 해시 기반)';


-- =============================================
-- 3. ai_rate_limits 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_type VARCHAR(30) NOT NULL CHECK (feature_type IN ('SUGGEST_SUBTASKS', 'SUMMARIZE_COMMENTS', 'SUGGEST_ASSIGNEE', 'PREDICT_COMPLETION', 'TITLE_AUTOCOMPLETE')),
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_id ON public.ai_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_window_start ON public.ai_rate_limits(user_id, feature_type, window_start);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for rate limits"
  ON public.ai_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.ai_rate_limits IS 'AI 사용량 제한 (분당 10회, 일당 100회)';


-- =============================================
-- 완료 메시지
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 4 완료: AI 및 알림 테이블 생성 성공';
  RAISE NOTICE '다음 파일 실행: step5_functions_triggers.sql';
END $$;
