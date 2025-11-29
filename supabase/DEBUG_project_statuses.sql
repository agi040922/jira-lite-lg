-- =============================================
-- project_statuses 테이블 디버깅
-- =============================================

-- 1. 테이블 구조 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'project_statuses'
ORDER BY ordinal_position;

-- 2. 제약 조건 확인
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'project_statuses';

-- 3. RLS 상태 확인
SELECT 
  tablename,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
  AND tablename = 'project_statuses';

-- 4. 현재 정책 확인
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'project_statuses';

-- 5. 기존 데이터 확인
SELECT 
  id,
  project_id,
  name,
  color,
  position,
  is_default,
  created_at
FROM public.project_statuses
ORDER BY created_at DESC
LIMIT 10;

-- 6. 테스트 삽입 (수동으로 프로젝트 ID 입력 필요)
-- 아래 주석을 해제하고 실제 project_id를 입력하세요
/*
INSERT INTO public.project_statuses (
  project_id,
  name,
  color,
  position,
  is_default
) VALUES (
  'YOUR_PROJECT_ID_HERE',  -- 실제 프로젝트 ID로 변경
  'Test Status',
  '#FF0000',
  999,
  false
) RETURNING *;
*/

-- 7. 트리거 확인
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'project_statuses';

