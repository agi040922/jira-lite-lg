-- ============================================
-- Soft Delete 패턴 구현을 위한 테이블 및 정책 설정
-- ============================================

-- 1. documents 테이블 생성
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMPTZ, -- Soft Delete를 위한 컬럼 (null = 활성, not null = 삭제됨)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 인덱스 생성 (deleted_at 기반 쿼리 성능 향상)
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 4. 모든 사용자가 읽기 가능하도록 설정
-- deleted_at 상태와 관계없이 모든 문서를 읽을 수 있음
-- (클라이언트에서 필터링하여 사용)
CREATE POLICY "Anyone can view documents"
  ON documents
  FOR SELECT
  USING (true);

-- 5. 모든 사용자가 문서 생성 가능
CREATE POLICY "Anyone can create documents"
  ON documents
  FOR INSERT
  WITH CHECK (true);

-- 6. 모든 사용자가 문서 업데이트 가능
-- Soft Delete(deleted_at 업데이트) 및 복구(deleted_at을 null로 변경)에 사용
CREATE POLICY "Anyone can update documents"
  ON documents
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 7. 모든 사용자가 영구 삭제 가능
-- 실제 DELETE 쿼리 실행 시 사용
CREATE POLICY "Anyone can delete documents"
  ON documents
  FOR DELETE
  USING (true);

-- ============================================
-- 설명
-- ============================================
--
-- Soft Delete 패턴:
-- - deleted_at이 NULL이면 "활성 상태"
-- - deleted_at에 값이 있으면 "삭제된 상태"
--
-- 주요 쿼리 패턴:
--
-- 1. 활성 문서만 조회:
--    SELECT * FROM documents WHERE deleted_at IS NULL;
--
-- 2. 삭제된 문서만 조회:
--    SELECT * FROM documents WHERE deleted_at IS NOT NULL;
--
-- 3. Soft Delete (일반 삭제):
--    UPDATE documents SET deleted_at = NOW() WHERE id = '...';
--
-- 4. 복구:
--    UPDATE documents SET deleted_at = NULL WHERE id = '...';
--
-- 5. 영구 삭제 (Hard Delete):
--    DELETE FROM documents WHERE id = '...';
--
-- ============================================
-- 실제 프로덕션 환경에서는:
-- ============================================
--
-- 1. RLS 정책을 더 세밀하게 설정:
--    - user_id 컬럼 추가
--    - 본인이 생성한 문서만 수정/삭제 가능하도록 제한
--
-- 2. deleted_by 컬럼 추가:
--    - 누가 삭제했는지 추적
--
-- 3. 자동 정리 함수 (선택사항):
--    - 삭제된 지 30일 이상 지난 문서는 자동으로 영구 삭제
--    - PostgreSQL의 pg_cron 확장을 사용하거나
--    - 백엔드 스케줄러로 구현
--
-- 예시:
-- CREATE OR REPLACE FUNCTION auto_hard_delete_old_documents()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM documents
--   WHERE deleted_at IS NOT NULL
--     AND deleted_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;
--
-- ============================================

-- 테스트 데이터 삽입 (선택사항)
INSERT INTO documents (name, content) VALUES
  ('첫 번째 문서', '이것은 테스트 문서입니다.'),
  ('두 번째 문서', 'Soft Delete 패턴 테스트용 문서입니다.'),
  ('세 번째 문서', '복구 기능을 테스트하기 위한 문서입니다.');
