# Supabase 마이그레이션 실행 가이드

이 가이드는 Jira Lite 프로젝트의 Supabase 데이터베이스 마이그레이션을 순서대로 실행하는 방법을 설명합니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [실행 순서](#실행-순서)
3. [마이그레이션 파일 설명](#마이그레이션-파일-설명)
4. [실행 방법](#실행-방법)
5. [문제 해결](#문제-해결)
6. [확인 쿼리](#확인-쿼리)

---

## 🔧 사전 준비사항

### 1. Supabase 프로젝트 확인
- Supabase 대시보드에 로그인합니다
- 대상 프로젝트 (`lightsoft-litmers`)를 선택합니다
- 왼쪽 메뉴에서 **SQL Editor**를 클릭합니다

### 2. 백업 (선택사항)
기존 데이터베이스에 중요한 데이터가 있다면 백업을 권장합니다:
```bash
# Supabase CLI로 백업 (선택사항)
supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. 주의사항
- ⚠️ **기존 테이블 확인**: 일부 테이블이 이미 존재할 수 있습니다
- ⚠️ **team_invitations 테이블**: Step 2에서 DROP 후 재생성됩니다
- ⚠️ **의존성 순서**: 반드시 Step 1 → Step 2 → ... 순서대로 실행해야 합니다

---

## 📝 실행 순서

총 6개의 스텝이 있으며, **순서대로 실행**해야 합니다:

| 순서 | 파일명 | 설명 | 필수여부 |
|------|--------|------|----------|
| 1 | `step1_basic_tables.sql` | 기본 테이블 (users, teams, team_members) | ✅ 필수 |
| 2 | `step2_team_and_project_tables.sql` | 팀/프로젝트 관련 테이블 | ✅ 필수 |
| 3 | `step3_issue_tables.sql` | 이슈 관련 테이블 | ✅ 필수 |
| 4 | `step4_ai_and_notification_tables.sql` | AI/알림 테이블 | ✅ 필수 |
| 5 | `step5_functions_triggers.sql` | 함수 및 트리거 | ✅ 필수 |
| 6 | `step6_seed_data.sql` | 테스트 데이터 | ⚪ 선택사항 |

---

## 📦 마이그레이션 파일 설명

### Step 1: 기본 테이블 생성
**파일**: `step1_basic_tables.sql`

**생성되는 테이블**:
- ✅ `users` - 사용자 정보 (auth.users 확장)
- ✅ `teams` - 팀 정보
- ✅ `team_members` - 팀 멤버십
- ✅ `password_reset_tokens` - 비밀번호 재설정 토큰

**특징**:
- `update_updated_at_column()` 공통 함수 정의
- RLS (Row Level Security) 정책 적용
- 각 테이블마다 적절한 인덱스 생성

---

### Step 2: 팀/프로젝트 관련 테이블
**파일**: `step2_team_and_project_tables.sql`

**생성되는 테이블**:
- ⚠️ `team_invitations` - **기존 테이블 DROP 후 재생성** (team_id 외래키 추가)
- ✅ `team_activity_logs` - 팀 활동 로그
- ✅ `projects` - 프로젝트 정보
- ✅ `project_favorites` - 프로젝트 즐겨찾기
- ✅ `project_statuses` - 프로젝트 상태 (칸반 컬럼)
- ✅ `labels` - 이슈 라벨

**주의**: `team_invitations` 테이블은 DROP CASCADE로 삭제 후 재생성됩니다.

---

### Step 3: 이슈 관련 테이블
**파일**: `step3_issue_tables.sql`

**생성되는 테이블**:
- ✅ `issues` - 이슈 정보
- ✅ `issue_labels` - 이슈-라벨 매핑
- ✅ `subtasks` - 서브태스크
- ✅ `comments` - 이슈 댓글
- ✅ `issue_history` - 이슈 변경 이력

**특징**:
- 이슈 키 자동 생성 준비 (트리거는 Step 5에서)
- 계층 구조 지원 (parent_issue_id, parent_comment_id)

---

### Step 4: AI 및 알림 테이블
**파일**: `step4_ai_and_notification_tables.sql`

**생성되는 테이블**:
- ✅ `notifications` - 사용자 알림
- ✅ `ai_cache` - AI 응답 캐시 (24시간 만료)
- ✅ `ai_rate_limits` - AI 사용량 제한 (분당 10회, 일당 100회)

**특징**:
- AI 캐시는 SHA256 해시 기반 중복 방지
- Rate limit은 1분 단위 윈도우로 집계

---

### Step 5: 함수 및 트리거
**파일**: `step5_functions_triggers.sql`

**생성되는 함수 및 트리거** (총 22개):

**자동화 트리거**:
1. `generate_issue_key()` - 이슈 키 자동 생성 (LIG-1, LIG-2, ...)
2. `create_default_project_statuses()` - 프로젝트 생성 시 기본 상태 3개 자동 생성
3. `record_issue_history()` - 이슈 변경 시 히스토리 자동 기록
4. `set_default_issue_status()` - 이슈 생성 시 Backlog 상태로 설정
5. `add_owner_to_team()` - 팀 생성 시 owner를 자동으로 팀 멤버에 추가
6. `handle_new_user()` - Supabase Auth 유저 생성 시 users 테이블 자동 생성

**데이터 제한 함수**:
7. `check_project_limit()` - 팀당 최대 15개 프로젝트
8. `check_issue_limit()` - 프로젝트당 최대 200개 이슈
9. `check_subtask_limit()` - 이슈당 최대 10개 서브태스크
10. `check_label_limit()` - 프로젝트당 최대 20개 라벨
11. `check_issue_label_limit()` - 이슈당 최대 5개 라벨
12. `check_custom_status_limit()` - 프로젝트당 최대 5개 커스텀 상태

**AI 관련 함수**:
13. `check_ai_rate_limit()` - AI 사용량 체크
14. `increment_ai_rate_limit()` - AI 사용량 증가
15. `invalidate_ai_cache()` - description 변경 시 캐시 무효화
16. `invalidate_comment_summary_cache()` - 댓글 추가 시 캐시 무효화
17. `generate_content_hash()` - SHA256 해시 생성

**알림 함수**:
18. `notify_on_assignee_change()` - 담당자 변경 시 알림
19. `notify_on_comment()` - 댓글 작성 시 알림
20. `create_notification()` - 알림 생성 헬퍼

**기타 함수**:
21. `log_team_activity()` - 팀 활동 로그 기록 헬퍼
22. `move_issues_to_backlog_on_status_delete()` - 커스텀 상태 삭제 시 이슈 Backlog로 이동

---

### Step 6: 시드 데이터 (선택사항)
**파일**: `step6_seed_data.sql`

**생성되는 테스트 데이터**:
- 👥 4명의 테스트 사용자
- 👨‍👩‍👧‍👦 1개의 팀 (LightSoft 개발팀)
- 📁 5개의 프로젝트
- 🏷️ 7개의 라벨
- 📝 8개의 이슈
- 💬 5개의 댓글
- ✅ 5개의 서브태스크

**주의**:
- 테스트 환경에서만 사용하세요
- 실제 auth.users 없이 직접 users 테이블에 삽입합니다
- 프로덕션 환경에서는 실행하지 마세요

---

## 🚀 실행 방법

### 방법 1: Supabase Dashboard (추천)

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 로그인
   - `lightsoft-litmers` 프로젝트 선택
   - 왼쪽 메뉴 **SQL Editor** 클릭

2. **Step 1 실행**
   ```
   1. "New Query" 클릭
   2. step1_basic_tables.sql 파일 내용 복사 & 붙여넣기
   3. "Run" 버튼 클릭 (또는 Cmd/Ctrl + Enter)
   4. 하단에 "✅ STEP 1 완료" 메시지 확인
   ```

3. **Step 2 실행**
   ```
   1. 새 쿼리 탭 열기
   2. step2_team_and_project_tables.sql 내용 붙여넣기
   3. "Run" 버튼 클릭
   4. "✅ STEP 2 완료" 메시지 확인
   ```

4. **Step 3, 4, 5 순서대로 실행**
   - 동일한 방법으로 각 파일을 순서대로 실행

5. **Step 6 실행 (선택사항)**
   - 테스트 데이터가 필요한 경우에만 실행

### 방법 2: Supabase CLI (고급)

```bash
# 1. Supabase CLI 설치 (없는 경우)
npm install -g supabase

# 2. 프로젝트 연결
supabase link --project-ref <your-project-ref>

# 3. 각 스텝 실행
supabase db execute -f supabase/migrations/step1_basic_tables.sql
supabase db execute -f supabase/migrations/step2_team_and_project_tables.sql
supabase db execute -f supabase/migrations/step3_issue_tables.sql
supabase db execute -f supabase/migrations/step4_ai_and_notification_tables.sql
supabase db execute -f supabase/migrations/step5_functions_triggers.sql

# 4. 시드 데이터 (선택사항)
supabase db execute -f supabase/migrations/step6_seed_data.sql
```

---

## 🔍 문제 해결

### 에러: "relation already exists"

**원인**: 이미 테이블이 존재합니다.

**해결**:
```sql
-- 해당 테이블이 이미 존재하는지 확인
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 테이블 삭제 후 다시 실행 (주의: 데이터 손실)
DROP TABLE IF EXISTS public.테이블명 CASCADE;
```

### 에러: "relation does not exist"

**원인**: 이전 스텝을 실행하지 않았거나 실패했습니다.

**해결**:
- Step 1부터 순서대로 다시 실행하세요
- 각 스텝의 완료 메시지를 확인하세요

### 에러: "permission denied"

**원인**: RLS 정책 또는 권한 문제입니다.

**해결**:
```sql
-- Service Role로 실행하거나, SQL Editor에서 실행하세요
-- SQL Editor는 기본적으로 postgres 권한으로 실행됩니다
```

### team_invitations 테이블 DROP 경고

**정상 동작**: Step 2에서 의도적으로 DROP 후 재생성합니다.

**주의사항**:
- 기존 초대 데이터가 있다면 백업하세요
- 프로덕션 환경에서는 신중히 실행하세요

---

## ✅ 확인 쿼리

마이그레이션 완료 후 다음 쿼리로 확인하세요:

### 1. 모든 테이블 확인
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**예상 결과**: 18개 테이블
- ai_cache
- ai_rate_limits
- comments
- issue_history
- issue_labels
- issues
- labels
- notifications
- password_reset_tokens
- project_favorites
- project_statuses
- projects
- subtasks
- team_activity_logs
- team_invitations
- team_members
- teams
- users

### 2. 함수 및 트리거 확인
```sql
-- 함수 확인
SELECT proname, pronargs
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- 트리거 확인
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**예상 결과**: 22개의 함수, 다수의 트리거

### 3. RLS 정책 확인
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 4. 인덱스 확인
```sql
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 5. 시드 데이터 확인 (Step 6 실행한 경우)
```sql
-- 사용자 수
SELECT COUNT(*) FROM public.users;
-- 예상: 4명

-- 팀 수
SELECT COUNT(*) FROM public.teams;
-- 예상: 1개

-- 프로젝트 수
SELECT COUNT(*) FROM public.projects;
-- 예상: 5개

-- 이슈 수
SELECT COUNT(*) FROM public.issues WHERE deleted_at IS NULL;
-- 예상: 8개

-- 이슈 키 자동 생성 확인
SELECT issue_key, title, project_id
FROM public.issues
ORDER BY issue_key;
-- 예상: LIG-1, LIG-2, LIG-3, ...
```

### 6. 트리거 동작 확인

**프로젝트 생성 시 기본 상태 자동 생성 확인**:
```sql
-- 모든 프로젝트에 3개 기본 상태가 있는지 확인
SELECT p.name as project_name, COUNT(ps.*) as status_count
FROM public.projects p
LEFT JOIN public.project_statuses ps ON ps.project_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name
ORDER BY p.name;
-- 예상: 각 프로젝트마다 3개 이상 (기본 3개 + 커스텀)
```

---

## 📊 데이터 제한 확인

PRD에 명시된 제한사항이 제대로 적용되었는지 확인:

```sql
-- 프로젝트 생성 제한 테스트 (팀당 최대 15개)
-- 임시 팀 생성 후 16개 프로젝트 생성 시도 (15개는 성공, 16번째는 실패해야 함)

-- 이슈 생성 제한 테스트 (프로젝트당 최대 200개)
-- 프로젝트에 200개 이슈 생성 후 201번째 시도 (실패해야 함)
```

---

## 🎉 완료

모든 스텝을 성공적으로 실행했다면:

✅ 18개의 테이블 생성 완료
✅ 22개의 함수 및 트리거 생성 완료
✅ RLS 정책 적용 완료
✅ 인덱스 최적화 완료
✅ 데이터 제한 트리거 적용 완료
✅ (선택) 테스트 데이터 추가 완료

이제 Next.js 애플리케이션에서 Supabase Client를 통해 데이터베이스를 사용할 수 있습니다!

---

## 📞 지원

문제가 발생하면:
1. [EXECUTION_GUIDE.md 문제 해결 섹션](#문제-해결) 참고
2. 에러 메시지를 자세히 확인
3. Supabase Dashboard의 Logs 메뉴에서 에러 로그 확인

---

**작성일**: 2025-01-29
**버전**: 1.0.0
**프로젝트**: Jira Lite MVP
