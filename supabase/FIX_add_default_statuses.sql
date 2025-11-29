-- =============================================
-- 기존 프로젝트에 기본 상태 추가
-- =============================================
-- 이 스크립트는 project_statuses가 없는 프로젝트에 기본 상태를 추가합니다.

-- 1. project_statuses가 없는 프로젝트 확인
SELECT p.id, p.name, p.key
FROM public.projects p
LEFT JOIN public.project_statuses ps ON ps.project_id = p.id
WHERE ps.id IS NULL
AND p.deleted_at IS NULL;

-- 2. 기본 상태 추가
INSERT INTO public.project_statuses (project_id, name, color, position, is_default)
SELECT
  p.id,
  unnest(ARRAY['Backlog', 'In Progress', 'Done']) AS name,
  unnest(ARRAY['#6b7280', '#3b82f6', '#22c55e']) AS color,
  unnest(ARRAY[0, 1, 2]) AS position,
  true AS is_default
FROM public.projects p
LEFT JOIN public.project_statuses ps ON ps.project_id = p.id
WHERE ps.id IS NULL
AND p.deleted_at IS NULL;

-- 3. 결과 확인
SELECT p.name AS project_name, ps.name AS status_name, ps.position
FROM public.projects p
JOIN public.project_statuses ps ON ps.project_id = p.id
WHERE p.deleted_at IS NULL
ORDER BY p.name, ps.position;
