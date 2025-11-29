-- =============================================
-- Jira Lite - 시드 데이터 (테스트용)
-- =============================================
-- 002_create_functions.sql 실행 후 이 스크립트를 실행하세요.
--
-- 주의: 이 스크립트는 테스트 환경에서만 사용하세요.
-- Supabase Auth로 사용자를 먼저 생성한 후 실행해야 합니다.
--
-- 테스트 계정 (미리 Supabase Auth에서 생성 필요):
-- - chulsoo@lightsoft.com (OWNER)
-- - yh@lightsoft.com (ADMIN)
-- - jm@lightsoft.com (MEMBER)
-- - ms@lightsoft.com (MEMBER)

-- =============================================
-- 1. 테스트 사용자 데이터 (auth.users 생성 후 수동 실행)
-- =============================================
-- 참고: Supabase Auth에서 사용자 생성 시 자동으로 users 테이블에 추가됨
-- 아래는 직접 users 테이블에 데이터를 넣는 예시 (테스트용)

-- UUID 변수 선언 (실제 auth.users의 ID로 교체 필요)
DO $$
DECLARE
  user1_id UUID := gen_random_uuid();
  user2_id UUID := gen_random_uuid();
  user3_id UUID := gen_random_uuid();
  user4_id UUID := gen_random_uuid();
  team1_id UUID;
  project1_id UUID;
  project2_id UUID;
  project3_id UUID;
  project4_id UUID;
  project5_id UUID;
  status_backlog UUID;
  status_in_progress UUID;
  status_done UUID;
  status_todo UUID;
  status_in_review UUID;
  label_devops UUID;
  label_design UUID;
  label_frontend UUID;
  label_backend UUID;
  label_sales UUID;
  label_refactor UUID;
  label_feature UUID;
BEGIN

  -- =============================================
  -- 테스트 사용자 생성 (auth.users 연동 없이 테스트용)
  -- =============================================

  -- 주의: 실제 환경에서는 auth.users에서 사용자를 생성하고
  -- 트리거로 자동 생성되도록 해야 합니다.

  INSERT INTO public.users (id, email, name, profile_image, provider) VALUES
    (user1_id, 'chulsoo@lightsoft.com', '김철수', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', 'email'),
    (user2_id, 'yh@lightsoft.com', '이영희', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', 'email'),
    (user3_id, 'jm@lightsoft.com', '박지민', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jimin', 'email'),
    (user4_id, 'ms@lightsoft.com', '최민수', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minsoo', 'email')
  ON CONFLICT (email) DO NOTHING;

  -- =============================================
  -- 팀 생성
  -- =============================================

  INSERT INTO public.teams (id, name, owner_id)
  VALUES (gen_random_uuid(), 'LightSoft 개발팀', user1_id)
  RETURNING id INTO team1_id;

  -- =============================================
  -- 팀 멤버 추가
  -- =============================================

  INSERT INTO public.team_members (team_id, user_id, role) VALUES
    (team1_id, user1_id, 'OWNER'),
    (team1_id, user2_id, 'ADMIN'),
    (team1_id, user3_id, 'MEMBER'),
    (team1_id, user4_id, 'MEMBER');

  -- =============================================
  -- 프로젝트 생성 (기본 상태는 트리거로 자동 생성됨)
  -- =============================================

  INSERT INTO public.projects (id, team_id, name, description, owner_id)
  VALUES (gen_random_uuid(), team1_id, '제이콘 토목 산업 작업', '토목 산업 관련 플랫폼 구축', user2_id)
  RETURNING id INTO project1_id;

  INSERT INTO public.projects (id, team_id, name, description, owner_id)
  VALUES (gen_random_uuid(), team1_id, '돌핀 CRM', '고객 관리 시스템 고도화', user3_id)
  RETURNING id INTO project2_id;

  INSERT INTO public.projects (id, team_id, name, description, owner_id)
  VALUES (gen_random_uuid(), team1_id, '동문 모임 관리 웹사이트', '일단 신경끌것', user1_id)
  RETURNING id INTO project3_id;

  INSERT INTO public.projects (id, team_id, name, description, owner_id)
  VALUES (gen_random_uuid(), team1_id, '수퍼 퍼플 프로젝트 (학원 CRM)', '학원 관리 시스템', user4_id)
  RETURNING id INTO project4_id;

  INSERT INTO public.projects (id, team_id, name, description, owner_id)
  VALUES (gen_random_uuid(), team1_id, '안과용 설문조사 웹페이지 개선', '견적 전송 중', user2_id)
  RETURNING id INTO project5_id;

  -- =============================================
  -- 프로젝트1에 커스텀 상태 추가 (Todo, In Review)
  -- =============================================

  -- 기본 상태 ID 조회
  SELECT id INTO status_backlog FROM public.project_statuses
    WHERE project_id = project1_id AND name = 'Backlog';
  SELECT id INTO status_in_progress FROM public.project_statuses
    WHERE project_id = project1_id AND name = 'In Progress';
  SELECT id INTO status_done FROM public.project_statuses
    WHERE project_id = project1_id AND name = 'Done';

  -- 커스텀 상태 추가
  INSERT INTO public.project_statuses (id, project_id, name, color, position, is_default)
  VALUES
    (gen_random_uuid(), project1_id, 'Todo', '#f59e0b', 1, false),
    (gen_random_uuid(), project1_id, 'In Review', '#8b5cf6', 3, false);

  SELECT id INTO status_todo FROM public.project_statuses
    WHERE project_id = project1_id AND name = 'Todo';
  SELECT id INTO status_in_review FROM public.project_statuses
    WHERE project_id = project1_id AND name = 'In Review';

  -- 기존 상태 position 업데이트
  UPDATE public.project_statuses SET position = 2 WHERE id = status_in_progress;
  UPDATE public.project_statuses SET position = 4 WHERE id = status_done;

  -- =============================================
  -- 라벨 생성
  -- =============================================

  INSERT INTO public.labels (id, project_id, name, color) VALUES
    (gen_random_uuid(), project1_id, 'DevOps', '#3b82f6')
  RETURNING id INTO label_devops;

  INSERT INTO public.labels (id, project_id, name, color) VALUES
    (gen_random_uuid(), project1_id, 'Design', '#ec4899')
  RETURNING id INTO label_design;

  INSERT INTO public.labels (id, project_id, name, color) VALUES
    (gen_random_uuid(), project1_id, 'Frontend', '#10b981')
  RETURNING id INTO label_frontend;

  INSERT INTO public.labels (id, project_id, name, color) VALUES
    (gen_random_uuid(), project2_id, 'Backend', '#f59e0b')
  RETURNING id INTO label_backend;

  INSERT INTO public.labels (id, project_id, name, color) VALUES
    (gen_random_uuid(), project3_id, 'Sales', '#6366f1')
  RETURNING id INTO label_sales;

  INSERT INTO public.labels (id, project_id, name, color) VALUES
    (gen_random_uuid(), project1_id, 'Refactor', '#8b5cf6')
  RETURNING id INTO label_refactor;

  INSERT INTO public.labels (id, project_id, name, color) VALUES
    (gen_random_uuid(), project1_id, 'Feature', '#22c55e')
  RETURNING id INTO label_feature;

  -- =============================================
  -- 이슈 생성 (mockData 기반)
  -- =============================================

  -- LIG-325: 배포 스크립트 or 커맨드 제작
  WITH inserted_issue AS (
    INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id, due_date)
    VALUES (
      project1_id,
      '배포 스크립트 or 커맨드 제작',
      '자동 배포를 위한 스크립트를 작성해야 합니다.',
      status_in_review,
      'HIGH',
      user1_id,
      user1_id,
      NULL
    )
    RETURNING id
  )
  INSERT INTO public.issue_labels (issue_id, label_id)
  SELECT id, label_devops FROM inserted_issue;

  -- LIG-337: 홈페이지 개편
  WITH inserted_issue AS (
    INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id, due_date)
    VALUES (
      project1_id,
      '홈페이지 개편',
      '메인 페이지 UI를 전면 개편합니다.',
      status_todo,
      'MEDIUM',
      user3_id,
      user1_id,
      '2025-12-02'
    )
    RETURNING id
  )
  INSERT INTO public.issue_labels (issue_id, label_id)
  SELECT id, label_design FROM inserted_issue
  UNION ALL
  SELECT id, label_frontend FROM inserted_issue;

  -- LIG-235: 토스 페이먼츠 결제 기능 확인
  WITH project2_backlog AS (
    SELECT id FROM public.project_statuses
    WHERE project_id = project2_id AND name = 'Backlog'
  ),
  inserted_issue AS (
    INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id)
    SELECT
      project2_id,
      '토스 페이먼츠 결제 기능 확인',
      '결제 모듈 연동 테스트',
      (SELECT id FROM project2_backlog),
      'HIGH',
      user4_id,
      user1_id
    RETURNING id
  )
  INSERT INTO public.issue_labels (issue_id, label_id)
  SELECT id, label_backend FROM inserted_issue;

  -- LIG-311: ivma 견적 보내기
  WITH project3_backlog AS (
    SELECT id FROM public.project_statuses
    WHERE project_id = project3_id AND name = 'Backlog'
  )
  INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id)
  SELECT
    project3_id,
    'ivma 견적 보내기',
    '견적서 작성 및 발송',
    (SELECT id FROM project3_backlog),
    'LOW',
    user4_id,
    user1_id;

  -- LIG-279: 개발현황 공유
  WITH project3_backlog AS (
    SELECT id FROM public.project_statuses
    WHERE project_id = project3_id AND name = 'Backlog'
  )
  INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id)
  SELECT
    project3_id,
    '개발현황 공유',
    '주간 개발 현황 보고',
    (SELECT id FROM project3_backlog),
    'LOW',
    user4_id,
    user1_id;

  -- LIG-252: 하드코딩된 계좌번호 수정
  WITH inserted_issue AS (
    INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id)
    VALUES (
      project1_id,
      '하드코딩된 계좌번호 수정',
      '환경변수로 분리 필요',
      status_done,
      'HIGH',
      user1_id,
      user1_id
    )
    RETURNING id
  )
  INSERT INTO public.issue_labels (issue_id, label_id)
  SELECT id, label_refactor FROM inserted_issue;

  -- LIG-246: 신규 게시글 추가
  WITH inserted_issue AS (
    INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id)
    VALUES (
      project1_id,
      '신규 게시글 추가',
      '게시판 CRUD 구현',
      status_done,
      'MEDIUM',
      user1_id,
      user1_id
    )
    RETURNING id
  )
  INSERT INTO public.issue_labels (issue_id, label_id)
  SELECT id, label_feature FROM inserted_issue;

  -- LIG-275: 팝업 생성
  WITH project2_done AS (
    SELECT id FROM public.project_statuses
    WHERE project_id = project2_id AND name = 'Done'
  ),
  inserted_issue AS (
    INSERT INTO public.issues (project_id, title, description, status_id, priority, assignee_id, owner_id)
    SELECT
      project2_id,
      '팝업 생성 - 창 1개만 만들어지고 탭 구분으로만 공지를 볼 수 있어서 창 여러개로 올라오도록 변경',
      '멀티 윈도우 지원 필요',
      (SELECT id FROM project2_done),
      'LOW',
      user3_id,
      user1_id
    RETURNING id
  )
  INSERT INTO public.issue_labels (issue_id, label_id)
  SELECT id, label_feature FROM inserted_issue;

  -- =============================================
  -- 샘플 댓글 추가
  -- =============================================

  -- LIG-252에 댓글 추가 (완료된 이슈)
  INSERT INTO public.comments (issue_id, user_id, content)
  SELECT i.id, user1_id, '환경변수로 분리 완료했습니다.'
  FROM public.issues i WHERE i.title = '하드코딩된 계좌번호 수정';

  INSERT INTO public.comments (issue_id, user_id, content)
  SELECT i.id, user2_id, '확인했습니다. 잘 동작하네요!'
  FROM public.issues i WHERE i.title = '하드코딩된 계좌번호 수정';

  INSERT INTO public.comments (issue_id, user_id, content)
  SELECT i.id, user1_id, '.env.example 파일도 업데이트해주세요.'
  FROM public.issues i WHERE i.title = '하드코딩된 계좌번호 수정';

  INSERT INTO public.comments (issue_id, user_id, content)
  SELECT i.id, user1_id, '추가 완료!'
  FROM public.issues i WHERE i.title = '하드코딩된 계좌번호 수정';

  INSERT INTO public.comments (issue_id, user_id, content)
  SELECT i.id, user3_id, 'LGTM 👍'
  FROM public.issues i WHERE i.title = '하드코딩된 계좌번호 수정';

  -- =============================================
  -- 샘플 서브태스크 추가
  -- =============================================

  -- 홈페이지 개편 이슈에 서브태스크 추가
  INSERT INTO public.subtasks (issue_id, title, is_completed, position)
  SELECT i.id, '디자인 시안 검토', true, 0
  FROM public.issues i WHERE i.title = '홈페이지 개편';

  INSERT INTO public.subtasks (issue_id, title, is_completed, position)
  SELECT i.id, '반응형 레이아웃 구현', true, 1
  FROM public.issues i WHERE i.title = '홈페이지 개편';

  INSERT INTO public.subtasks (issue_id, title, is_completed, position)
  SELECT i.id, '애니메이션 효과 추가', false, 2
  FROM public.issues i WHERE i.title = '홈페이지 개편';

  INSERT INTO public.subtasks (issue_id, title, is_completed, position)
  SELECT i.id, 'SEO 최적화', false, 3
  FROM public.issues i WHERE i.title = '홈페이지 개편';

  INSERT INTO public.subtasks (issue_id, title, is_completed, position)
  SELECT i.id, '브라우저 호환성 테스트', false, 4
  FROM public.issues i WHERE i.title = '홈페이지 개편';

  -- =============================================
  -- 프로젝트 즐겨찾기 추가
  -- =============================================

  INSERT INTO public.project_favorites (project_id, user_id)
  VALUES (project1_id, user1_id);

  INSERT INTO public.project_favorites (project_id, user_id)
  VALUES (project2_id, user1_id);

  -- =============================================
  -- 팀 활동 로그 추가
  -- =============================================

  INSERT INTO public.team_activity_logs (team_id, user_id, action_type, target_type, target_id, description)
  VALUES
    (team1_id, user1_id, 'team_created', 'team', team1_id, '팀 "LightSoft 개발팀"이 생성되었습니다.'),
    (team1_id, user1_id, 'member_joined', 'member', user2_id, '이영희님이 팀에 합류했습니다.'),
    (team1_id, user1_id, 'member_joined', 'member', user3_id, '박지민님이 팀에 합류했습니다.'),
    (team1_id, user1_id, 'member_joined', 'member', user4_id, '최민수님이 팀에 합류했습니다.'),
    (team1_id, user1_id, 'role_changed', 'member', user2_id, '이영희님의 역할이 ADMIN으로 변경되었습니다.'),
    (team1_id, user2_id, 'project_created', 'project', project1_id, '프로젝트 "제이콘 토목 산업 작업"이 생성되었습니다.'),
    (team1_id, user3_id, 'project_created', 'project', project2_id, '프로젝트 "돌핀 CRM"이 생성되었습니다.');

  RAISE NOTICE '시드 데이터가 성공적으로 추가되었습니다.';
END $$;


-- =============================================
-- 실행 확인 쿼리
-- =============================================

-- 사용자 확인
-- SELECT * FROM public.users;

-- 팀 확인
-- SELECT * FROM public.teams;

-- 팀 멤버 확인
-- SELECT tm.*, u.name as user_name
-- FROM public.team_members tm
-- JOIN public.users u ON u.id = tm.user_id;

-- 프로젝트 확인
-- SELECT * FROM public.projects;

-- 프로젝트 상태 확인
-- SELECT ps.*, p.name as project_name
-- FROM public.project_statuses ps
-- JOIN public.projects p ON p.id = ps.project_id
-- ORDER BY p.name, ps.position;

-- 이슈 확인
-- SELECT i.issue_key, i.title, i.priority, ps.name as status, u.name as assignee
-- FROM public.issues i
-- LEFT JOIN public.project_statuses ps ON ps.id = i.status_id
-- LEFT JOIN public.users u ON u.id = i.assignee_id
-- WHERE i.deleted_at IS NULL;

-- 이슈 라벨 확인
-- SELECT i.issue_key, l.name as label
-- FROM public.issue_labels il
-- JOIN public.issues i ON i.id = il.issue_id
-- JOIN public.labels l ON l.id = il.label_id;

-- 댓글 확인
-- SELECT i.issue_key, u.name, c.content
-- FROM public.comments c
-- JOIN public.issues i ON i.id = c.issue_id
-- JOIN public.users u ON u.id = c.user_id
-- WHERE c.deleted_at IS NULL;
