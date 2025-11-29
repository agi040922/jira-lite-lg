-- =============================================
-- AI Feature Types 업데이트
-- =============================================
-- PRD 요구사항에 맞게 feature_type 추가

-- ai_cache 테이블의 feature_type 제약조건 업데이트
ALTER TABLE public.ai_cache DROP CONSTRAINT IF EXISTS ai_cache_feature_type_check;

ALTER TABLE public.ai_cache ADD CONSTRAINT ai_cache_feature_type_check
  CHECK (feature_type IN (
    'SUGGEST_SUBTASKS',
    'SUMMARIZE_COMMENTS',
    'SUGGEST_ASSIGNEE',
    'PREDICT_COMPLETION',
    'TITLE_AUTOCOMPLETE',
    'AI_SUMMARY',           -- FR-040: 이슈 설명 요약
    'AI_SUGGESTION',        -- FR-041: 해결 전략 제안
    'AI_AUTO_LABEL',        -- FR-043: 라벨 자동 추천
    'AI_DUPLICATE',         -- FR-044: 중복 이슈 탐지
    'AI_COMMENT_SUMMARY'    -- FR-045: 댓글 요약
  ));

-- ai_rate_limits 테이블의 feature_type 제약조건 업데이트
ALTER TABLE public.ai_rate_limits DROP CONSTRAINT IF EXISTS ai_rate_limits_feature_type_check;

ALTER TABLE public.ai_rate_limits ADD CONSTRAINT ai_rate_limits_feature_type_check
  CHECK (feature_type IN (
    'SUGGEST_SUBTASKS',
    'SUMMARIZE_COMMENTS',
    'SUGGEST_ASSIGNEE',
    'PREDICT_COMPLETION',
    'TITLE_AUTOCOMPLETE',
    'AI_SUMMARY',
    'AI_SUGGESTION',
    'AI_AUTO_LABEL',
    'AI_DUPLICATE',
    'AI_COMMENT_SUMMARY'
  ));

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ AI Feature Types 업데이트 완료';
END $$;
